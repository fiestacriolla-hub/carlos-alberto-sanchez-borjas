import { GoogleGenAI, Type } from "@google/genai";

export interface OCRResult {
  date: string;
  invoice_number: string;
  control_number: string;
  rif: string;
  issuer_rif?: string;
  receiver_rif?: string;
  name: string;
  address?: string;
  taxable_base_16: number;
  vat_16: number;
  taxable_base_8: number;
  vat_8: number;
  exempt_amount: number;
  total: number;
  type: "COMPRA" | "VENTA";
  warnings?: string[];
}

export async function processInvoiceOCR(file: File): Promise<OCRResult> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "API Key de Gemini no encontrada. Por favor configure la variable de entorno.",
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Convert file to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const mimeType = file.type;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: `Extrae la siguiente información de esta factura venezolana:
- Fecha (formato YYYY-MM-DD)
- Número de factura
- Número de control
- RIF del emisor (formato J-12345678-9, V-12345678, G-12345678, etc.)
- RIF del receptor (formato J-12345678-9, V-12345678, G-12345678, etc.)
- Nombre de la empresa emisora o receptora (dependiendo de quién es la contraparte)
- Dirección de la empresa (si está disponible)
- Base imponible al 16%
- IVA al 16%
- Base imponible al 8%
- IVA al 8%
- Monto exento
- Total de la factura

Devuelve los datos estrictamente en formato JSON.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: {
              type: Type.STRING,
              description: "Fecha en formato YYYY-MM-DD",
            },
            invoice_number: { type: Type.STRING },
            control_number: { type: Type.STRING },
            rif: { type: Type.STRING, description: "RIF de la contraparte (proveedor o cliente)" },
            issuer_rif: { type: Type.STRING, description: "RIF del emisor de la factura" },
            receiver_rif: { type: Type.STRING, description: "RIF del receptor de la factura" },
            name: { type: Type.STRING },
            address: { type: Type.STRING, description: "Dirección de la empresa" },
            taxable_base_16: { type: Type.NUMBER },
            vat_16: { type: Type.NUMBER },
            taxable_base_8: { type: Type.NUMBER },
            vat_8: { type: Type.NUMBER },
            exempt_amount: { type: Type.NUMBER },
            total: { type: Type.NUMBER },
          },
          required: [
            "date",
            "invoice_number",
            "control_number",
            "issuer_rif",
            "receiver_rif",
            "name",
            "taxable_base_16",
            "vat_16",
            "taxable_base_8",
            "vat_8",
            "exempt_amount",
            "total",
          ],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No se pudo extraer texto de la imagen.");

    const data = JSON.parse(text);
    const warnings: string[] = [];

    // Validate RIF
    const rifRegex = /^[JGVEP]-?\d{8}-?\d$/i;
    if (data.rif && !rifRegex.test(data.rif.replace(/\s/g, ""))) {
      warnings.push("El RIF detectado no parece tener un formato válido venezolano (Ej: J-12345678-9).");
    }

    // Validate IVA 16%
    if (data.taxable_base_16 > 0) {
      const expectedVat16 = data.taxable_base_16 * 0.16;
      if (Math.abs(expectedVat16 - data.vat_16) > 0.5) {
        warnings.push(`El IVA al 16% (${data.vat_16}) no coincide con la base imponible (${data.taxable_base_16}). Se esperaba ~${expectedVat16.toFixed(2)}.`);
      }
    }

    // Validate IVA 8%
    if (data.taxable_base_8 > 0) {
      const expectedVat8 = data.taxable_base_8 * 0.08;
      if (Math.abs(expectedVat8 - data.vat_8) > 0.5) {
        warnings.push(`El IVA al 8% (${data.vat_8}) no coincide con la base imponible (${data.taxable_base_8}). Se esperaba ~${expectedVat8.toFixed(2)}.`);
      }
    }

    // Validate Total
    const expectedTotal = (data.taxable_base_16 || 0) + (data.vat_16 || 0) + (data.taxable_base_8 || 0) + (data.vat_8 || 0) + (data.exempt_amount || 0);
    if (Math.abs(expectedTotal - data.total) > 0.5) {
      warnings.push(`El total detectado (${data.total}) no suma correctamente la base, IVA y exento. Se esperaba ~${expectedTotal.toFixed(2)}.`);
    }

    return { ...data, warnings };
  } catch (error) {
    console.error("Error en OCR:", error);
    throw error;
  }
}
