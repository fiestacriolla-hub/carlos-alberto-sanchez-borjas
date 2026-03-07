import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Upload,
  FileText,
  Search,
  LogOut,
  Check,
  AlertCircle,
  ShoppingCart,
  Tag,
  Loader2,
  Eye,
} from "lucide-react";
import { mockDb, Invoice } from "../services/mockDb";
import InvoicePreviewModal from "../components/InvoicePreviewModal";
import InvoiceBook from "../components/InvoiceBook";
import Logo from "../components/Logo";
import OverviewPanel from "../components/OverviewPanel";
import AIAssistant from "../components/AIAssistant";
import ReportsPanel from "../components/ReportsPanel";
import { processInvoiceOCR } from "../services/ocrService";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "overview" | "upload" | "compras" | "ventas" | "search" | "reports"
  >("overview");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState("");
  const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState<Partial<Invoice>>({
    date: new Date().toISOString().split("T")[0],
    invoice_number: "",
    control_number: "",
    rif: "",
    name: "",
    address: "",
    exempt_amount: 0,
    taxable_base_16: 0,
    vat_16: 0,
    taxable_base_8: 0,
    vat_8: 0,
    total: 0,
    type: "COMPRA",
    aplica_igtf: user?.aplica_igtf || false,
    igtf_percentage: user?.aplica_igtf ? (user.igtf_percentage || 3) : 0,
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // Preview state
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = () => {
    if (user) {
      const userInvoices = mockDb.getInvoices(user.id);
      setInvoices(
        userInvoices.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      );
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [user]);

  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setOcrSuccess("");
    setOcrWarnings([]);
    setError("");
    setSuccess("");

    try {
      const ocrData = await processInvoiceOCR(selectedFile);

      let detectedType: "COMPRA" | "VENTA" | "" = "";
      let finalRif = ocrData.rif || "";

      if (user) {
        const userRif = user.rif.replace(/\s|-/g, "").toUpperCase();
        const issuerRif = (ocrData.issuer_rif || "").replace(/\s|-/g, "").toUpperCase();
        const receiverRif = (ocrData.receiver_rif || "").replace(/\s|-/g, "").toUpperCase();

        if (issuerRif && issuerRif === userRif) {
          detectedType = "VENTA";
          finalRif = ocrData.receiver_rif || ocrData.rif || "";
        } else if (issuerRif && issuerRif !== userRif) {
          detectedType = "COMPRA";
          finalRif = ocrData.issuer_rif || ocrData.rif || "";
        } else if (receiverRif && receiverRif === userRif) {
          detectedType = "COMPRA";
          finalRif = ocrData.issuer_rif || ocrData.rif || "";
        } else if (receiverRif && receiverRif !== userRif) {
          detectedType = "VENTA";
          finalRif = ocrData.receiver_rif || ocrData.rif || "";
        }
      }

      setFormData((prev) => ({
        ...prev,
        date: ocrData.date || new Date().toISOString().split("T")[0],
        invoice_number: ocrData.invoice_number || "",
        control_number: ocrData.control_number || "",
        rif: finalRif,
        name: ocrData.name || "",
        address: ocrData.address || "",
        exempt_amount: ocrData.exempt_amount || 0,
        taxable_base_16: ocrData.taxable_base_16 || 0,
        vat_16: ocrData.vat_16 || 0,
        taxable_base_8: ocrData.taxable_base_8 || 0,
        vat_8: ocrData.vat_8 || 0,
        total: ocrData.total || 0,
        type: detectedType as "COMPRA" | "VENTA",
        aplica_igtf: user?.aplica_igtf || false,
        igtf_percentage: user?.aplica_igtf ? (user.igtf_percentage || 3) : 0,
      }));

      setOcrSuccess("Datos extraídos automáticamente. Por favor verifique.");
      if (ocrData.warnings && ocrData.warnings.length > 0) {
        setOcrWarnings(ocrData.warnings);
      }
    } catch (err: any) {
      console.error("OCR Error", err);
      setError(
        "Error al procesar el documento con IA. Por favor ingrese los datos manualmente.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-calculate total and VAT based on taxable base
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    if (
      name === "taxable_base_16" ||
      name === "taxable_base_8" ||
      name === "exempt_amount" ||
      name === "igtf_percentage" ||
      name === "aplica_igtf"
    ) {
      const base16 = parseFloat(newFormData.taxable_base_16 as any) || 0;
      const base8 = parseFloat(newFormData.taxable_base_8 as any) || 0;
      const exempt = parseFloat(newFormData.exempt_amount as any) || 0;
      
      const aplicaIgtf = name === "aplica_igtf" ? value === "true" : newFormData.aplica_igtf;
      newFormData.aplica_igtf = aplicaIgtf;
      
      const igtfPerc = parseFloat(newFormData.igtf_percentage as any) || 0;

      const vat16 = base16 * 0.16;
      const vat8 = base8 * 0.08;
      const subtotal = base16 + base8 + exempt + vat16 + vat8;
      const igtfAmount = aplicaIgtf ? subtotal * (igtfPerc / 100) : 0;
      const total = subtotal + igtfAmount;

      newFormData = {
        ...newFormData,
        vat_16: parseFloat(vat16.toFixed(2)),
        vat_8: parseFloat(vat8.toFixed(2)),
        igtf_amount: parseFloat(igtfAmount.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
      };
    }

    // Auto-calculate totals with retention/perceived
    if (newFormData.type === "COMPRA") {
      const total = parseFloat(newFormData.total as any) || 0;
      const retention = parseFloat(newFormData.retention_iva as any) || 0;
      newFormData.total_with_retention = parseFloat((total - retention).toFixed(2));
    } else {
      const total = parseFloat(newFormData.total as any) || 0;
      const perceived = parseFloat(newFormData.iva_perceived as any) || 0;
      newFormData.total_collected = parseFloat((total + perceived).toFixed(2));
    }

    setFormData(newFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setOcrSuccess("");
    setLoading(true);

    try {
      if (!user) throw new Error("Not authenticated");

      // Validate RIF format
      const rifRegex = /^[JVGEP]-?\d{8}-?\d?$/i;
      if (!rifRegex.test(formData.rif || "")) {
        throw new Error("El formato del RIF no es válido. Ejemplos válidos: J-12345678-9, V-12345678, G-12345678");
      }

      if (!formData.type) {
        throw new Error("Debe seleccionar si es una COMPRA o una VENTA.");
      }

      const month = formData.date!.substring(0, 7);
      if (
        mockDb.isPeriodClosed(
          user.id,
          formData.type as "COMPRA" | "VENTA",
          month,
        )
      ) {
        throw new Error(
          `El mes de ${month} está cerrado para ${formData.type === "COMPRA" ? "compras" : "ventas"}. No se pueden agregar facturas.`,
        );
      }

      let fileData = "";
      if (file) {
        const reader = new FileReader();
        fileData = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      const payload = {
        user_id: user.id,
        date: formData.date!,
        invoice_number: formData.invoice_number!,
        control_number: formData.control_number!,
        rif: formData.rif!,
        name: formData.name!,
        exempt_amount: Number(formData.exempt_amount),
        taxable_base_16: Number(formData.taxable_base_16),
        vat_16: Number(formData.vat_16),
        taxable_base_8: Number(formData.taxable_base_8),
        vat_8: Number(formData.vat_8),
        total: Number(formData.total),
        retention_iva: Number(formData.retention_iva || 0),
        total_with_retention: Number(formData.total_with_retention || formData.total || 0),
        iva_perceived: Number(formData.iva_perceived || 0),
        total_collected: Number(formData.total_collected || formData.total || 0),
        igtf_percentage: Number(formData.igtf_percentage || 0),
        igtf_amount: Number(formData.igtf_amount || 0),
        file_data: fileData,
        file_name: file?.name,
        file_type: file?.type,
        type: formData.type as "COMPRA" | "VENTA",
      };

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      mockDb.addInvoice(payload);

      setSuccess("Factura guardada con éxito");
      setFormData({
        date: new Date().toISOString().split("T")[0],
        invoice_number: "",
        control_number: "",
        rif: "",
        name: "",
        exempt_amount: 0,
        taxable_base_16: 0,
        vat_16: 0,
        taxable_base_8: 0,
        vat_8: 0,
        total: 0,
        retention_iva: 0,
        total_with_retention: 0,
        iva_perceived: 0,
        total_collected: 0,
        igtf_percentage: user?.aplica_igtf ? (user.igtf_percentage || 3) : 0,
        igtf_amount: 0,
        type: formData.type, // Keep the selected type
      });
      setFile(null);
      fetchInvoices();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_number.includes(searchTerm) ||
      inv.control_number.includes(searchTerm) ||
      inv.date.includes(searchTerm),
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-900 text-white flex flex-col transition-all shadow-xl z-20">
        <div className="p-6 border-b border-blue-800">
          <Logo
            className="h-10 brightness-0 invert"
            textClassName="text-lg text-white"
            iconClassName="w-10 h-10 text-sm bg-blue-700"
            showText={true}
          />
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === "overview"
                ? "bg-blue-700 text-white shadow-md"
                : "text-blue-200 hover:bg-blue-800 hover:text-white"
            }`}
          >
            <FileText size={20} />
            Declaración de IVA Estimada
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === "upload"
                ? "bg-blue-700 text-white shadow-md"
                : "text-blue-200 hover:bg-blue-800 hover:text-white"
            }`}
          >
            <Upload size={20} />
            Carga de Facturas
          </button>
          <button
            onClick={() => setActiveTab("ventas")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === "ventas"
                ? "bg-blue-700 text-white shadow-md"
                : "text-blue-200 hover:bg-blue-800 hover:text-white"
            }`}
          >
            <Tag size={20} />
            Libro de Ventas
          </button>
          <button
            onClick={() => setActiveTab("compras")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === "compras"
                ? "bg-blue-700 text-white shadow-md"
                : "text-blue-200 hover:bg-blue-800 hover:text-white"
            }`}
          >
            <ShoppingCart size={20} />
            Libro de Compras
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === "reports"
                ? "bg-blue-700 text-white shadow-md"
                : "text-blue-200 hover:bg-blue-800 hover:text-white"
            }`}
          >
            <FileText size={20} />
            Reportes
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === "search"
                ? "bg-blue-700 text-white shadow-md"
                : "text-blue-200 hover:bg-blue-800 hover:text-white"
            }`}
          >
            <FileText size={20} />
            Reportes
          </button>
        </nav>

        <div className="p-4 border-t border-blue-800">
          <div className="mb-4 px-4">
            <p className="text-sm font-medium text-white truncate">
              {user?.name}
            </p>
            <p className="text-xs text-blue-200 truncate">{user?.rif}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-blue-200 hover:text-white hover:bg-blue-800 rounded-xl transition-colors"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 shadow-sm px-8 py-5 flex items-center justify-between z-10">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            {activeTab === "overview" && "Dashboard / Resumen Fiscal"}
            {activeTab === "upload" && "Carga de Facturas"}
            {activeTab === "ventas" && "Libro de Ventas"}
            {activeTab === "compras" && "Libro de Compras"}
            {activeTab === "search" && "Reportes y Búsqueda"}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500 font-medium">
              Panel Administrativo
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && user && (
              <OverviewPanel invoices={invoices} client={user} />
            )}

            {/* UPLOAD TAB */}
            {activeTab === "upload" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-8">
                  <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Upload size={24} className="text-blue-600" /> Carga de
                    Facturas
                  </h2>

                  {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
                      <AlertCircle className="text-red-500 mt-0.5" size={20} />
                      <p className="text-sm text-red-700 font-medium">
                        {error}
                      </p>
                    </div>
                  )}

                  {success && (
                    <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-lg flex items-start gap-3">
                      <Check className="text-emerald-500 mt-0.5" size={20} />
                      <p className="text-sm text-emerald-700 font-medium">
                        {success}
                      </p>
                    </div>
                  )}

                  {ocrSuccess && (
                    <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg flex items-start gap-3">
                      <Check className="text-blue-500 mt-0.5" size={20} />
                      <p className="text-sm text-blue-700 font-medium">
                        {ocrSuccess}
                      </p>
                    </div>
                  )}

                  {ocrWarnings.length > 0 && (
                    <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg flex items-start gap-3">
                      <AlertCircle className="text-amber-500 mt-0.5 shrink-0" size={20} />
                      <div className="text-sm text-amber-700 font-medium">
                        <p className="font-bold mb-1">Advertencias en la factura:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {ocrWarnings.map((warning, idx) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Drag & Drop Zone */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Archivo de Factura (Opcional)
                      </label>
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all relative flex flex-col items-center justify-center min-h-[300px] ${
                          isDragActive
                            ? "border-blue-500 bg-blue-50 shadow-inner"
                            : "border-slate-300 hover:border-blue-400 hover:bg-slate-50 hover:shadow-sm"
                        }`}
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileInput} 
                          className="hidden" 
                          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.gif,.bmp"
                        />

                        {isProcessing ? (
                          <div className="flex flex-col items-center justify-center py-4">
                            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
                            <p className="text-blue-600 font-medium">
                              Procesando factura...
                            </p>
                            <p className="text-slate-500 text-sm mt-2">
                              Extrayendo datos con OCR simulado
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                              <Upload className="h-8 w-8 text-blue-500" />
                            </div>
                            {file ? (
                              <div className="text-blue-600 font-medium flex items-center justify-center gap-2 bg-blue-50 px-4 py-2 rounded-full">
                                <Check size={18} /> {file.name}
                              </div>
                            ) : (
                              <>
                                <p className="text-slate-700 font-semibold text-lg">
                                  Arrastra y suelta tu factura aquí
                                </p>
                                <p className="text-slate-500 text-sm mt-2">
                                  o haz clic para seleccionar (PDF, JPG, PNG,
                                  WEBP, etc.)
                                </p>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Tipo de Factura
                          </label>
                          <select
                            name="type"
                            value={formData.type}
                            onChange={handleFormChange}
                            className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white border p-3 transition-shadow"
                          >
                            <option value="COMPRA">Factura de Compra</option>
                            <option value="VENTA">Factura de Venta</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Fecha
                          </label>
                          <input
                            type="date"
                            name="date"
                            required
                            value={formData.date}
                            onChange={handleFormChange}
                            className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-50 border p-3 transition-shadow"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            N° Factura
                          </label>
                          <input
                            type="text"
                            name="invoice_number"
                            required
                            value={formData.invoice_number}
                            onChange={handleFormChange}
                            className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-50 border p-3 transition-shadow"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            N° Control
                          </label>
                          <input
                            type="text"
                            name="control_number"
                            required
                            value={formData.control_number}
                            onChange={handleFormChange}
                            className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-50 border p-3 transition-shadow"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            RIF
                          </label>
                          <input
                            type="text"
                            name="rif"
                            required
                            value={formData.rif}
                            onChange={handleFormChange}
                            className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-50 border p-3 transition-shadow"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Nombre / Razón Social
                          </label>
                          <input
                            type="text"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleFormChange}
                            className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-50 border p-3 transition-shadow"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Dirección
                          </label>
                          <input
                            type="text"
                            name="address"
                            value={formData.address || ""}
                            onChange={handleFormChange}
                            className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-50 border p-3 transition-shadow"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Monto Exento
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            name="exempt_amount"
                            required
                            value={formData.exempt_amount}
                            onChange={handleFormChange}
                            className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-50 border p-3 transition-shadow"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Base Imponible (16%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            name="taxable_base_16"
                            required
                            value={formData.taxable_base_16}
                            onChange={handleFormChange}
                            className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-50 border p-3 transition-shadow"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            IVA (16%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            name="vat_16"
                            required
                            value={formData.vat_16}
                            onChange={handleFormChange}
                            className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-100 border p-3 text-slate-500"
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Base Imponible (8%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            name="taxable_base_8"
                            required
                            value={formData.taxable_base_8}
                            onChange={handleFormChange}
                            className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-50 border p-3 transition-shadow"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            IVA (8%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            name="vat_8"
                            required
                            value={formData.vat_8}
                            onChange={handleFormChange}
                            className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-100 border p-3 text-slate-500"
                            readOnly
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            IGTF
                          </label>
                          <select
                            name="aplica_igtf"
                            value={formData.aplica_igtf ? "true" : "false"}
                            onChange={handleFormChange}
                            disabled={!user?.aplica_igtf}
                            className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-50 border p-3 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="true">Aplica</option>
                            <option value="false">No aplica</option>
                          </select>
                        </div>

                        {formData.aplica_igtf && (
                          <>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                IGTF %
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                name="igtf_percentage"
                                value={formData.igtf_percentage || 0}
                                onChange={handleFormChange}
                                className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-50 border p-3 transition-shadow"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Monto IGTF
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                name="igtf_amount"
                                value={formData.igtf_amount || 0}
                                className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-100 border p-3 text-slate-500"
                                readOnly
                              />
                            </div>
                          </>
                        )}

                        <div className="md:col-span-2">
                          <label className="block text-sm font-bold text-slate-900 mb-1.5">
                            Total
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            name="total"
                            required
                            value={formData.total}
                            onChange={handleFormChange}
                            className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-blue-50 border p-3 font-bold text-xl text-blue-900"
                            readOnly
                          />
                        </div>
                        
                        {formData.type === "COMPRA" ? (
                          <>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Retención IVA
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                name="retention_iva"
                                value={formData.retention_iva || 0}
                                onChange={handleFormChange}
                                className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-50 border p-3 transition-shadow"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Total con Retención
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                name="total_with_retention"
                                value={formData.total_with_retention || formData.total || 0}
                                onChange={handleFormChange}
                                className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-emerald-50 border p-3 text-emerald-900 font-bold text-lg"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                IVA Percibido
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                name="iva_perceived"
                                value={formData.iva_perceived || 0}
                                onChange={handleFormChange}
                                className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-50 border p-3 transition-shadow"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Total Cobrado
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                name="total_collected"
                                value={formData.total_collected || formData.total || 0}
                                onChange={handleFormChange}
                                className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-emerald-50 border p-3 text-emerald-900 font-bold text-lg"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mt-6 mb-6">
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Resumen de Factura</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between text-slate-600">
                            <span>Subtotal (Base + Exento):</span>
                            <span className="font-medium">Bs. {((Number(formData.taxable_base_16) || 0) + (Number(formData.taxable_base_8) || 0) + (Number(formData.exempt_amount) || 0)).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>IVA (16% + 8%):</span>
                            <span className="font-medium">Bs. {((Number(formData.vat_16) || 0) + (Number(formData.vat_8) || 0)).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>IGTF:</span>
                            <span className="font-medium">Bs. {(Number(formData.igtf_amount) || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-slate-900 font-bold text-base pt-2 border-t border-slate-200 mt-2">
                            <span>Total Factura:</span>
                            <span>Bs. {(Number(formData.total) || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4">
                        <button
                          type="submit"
                          disabled={loading || isProcessing}
                          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-md"
                        >
                          {loading ? "Guardando..." : "Guardar Factura"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* COMPRAS TAB */}
            {activeTab === "compras" && user && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-8">
                <InvoiceBook
                  type="COMPRA"
                  invoices={invoices}
                  client={user}
                  isAdmin={false}
                  onUpdate={fetchInvoices}
                />
              </div>
            )}

            {/* VENTAS TAB */}
            {activeTab === "ventas" && user && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-8">
                <InvoiceBook
                  type="VENTA"
                  invoices={invoices}
                  client={user}
                  isAdmin={false}
                  onUpdate={fetchInvoices}
                />
              </div>
            )}

            {/* REPORTS TAB */}
            {activeTab === "reports" && user && (
              <ReportsPanel invoices={invoices} />
            )}

            {/* SEARCH TAB */}
            {activeTab === "search" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-8">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Search className="text-blue-600" /> Buscador de Facturas
                </h2>

                <div className="mb-8 max-w-2xl">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-11 pr-4 py-4 border border-slate-300 rounded-xl leading-5 bg-slate-50 placeholder-slate-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-all"
                      placeholder="Buscar por fecha, N° factura o N° control..."
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Tipo</th>
                        <th className="px-6 py-4 font-semibold">Fecha</th>
                        <th className="px-6 py-4 font-semibold">N° Factura</th>
                        <th className="px-6 py-4 font-semibold">N° Control</th>
                        <th className="px-6 py-4 font-semibold text-right">
                          Total
                        </th>
                        <th className="px-6 py-4 font-semibold text-center">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredInvoices.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-12 text-center text-slate-500"
                          >
                            <div className="flex flex-col items-center justify-center">
                              <Search className="h-10 w-10 text-slate-300 mb-3" />
                              <p className="text-lg font-medium text-slate-600">
                                No se encontraron resultados
                              </p>
                              <p className="text-sm text-slate-400 mt-1">
                                Intenta con otros términos de búsqueda.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredInvoices.map((inv) => (
                          <tr
                            key={inv.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-6 py-4 font-medium">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${inv.type === "VENTA" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"}`}
                              >
                                {inv.type || "COMPRA"}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-900">
                              {inv.date}
                            </td>
                            <td className="px-6 py-4">{inv.invoice_number}</td>
                            <td className="px-6 py-4">{inv.control_number}</td>
                            <td className="px-6 py-4 text-right font-bold text-slate-900">
                              {Number(inv.total || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => setPreviewInvoice(inv)}
                                className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 p-2 rounded-lg flex items-center justify-center gap-1 mx-auto transition-colors"
                                title="Ver Factura"
                              >
                                <Eye size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <InvoicePreviewModal
        isOpen={!!previewInvoice}
        onClose={() => setPreviewInvoice(null)}
        fileData={previewInvoice?.file_data}
        fileName={previewInvoice?.file_name}
        fileType={previewInvoice?.file_type}
      />
      
      <AIAssistant />
    </div>
  );
}
