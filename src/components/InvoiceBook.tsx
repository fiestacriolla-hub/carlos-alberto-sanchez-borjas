import React, { useState, useMemo } from "react";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Eye,
  Edit2,
  Check,
  X,
  AlertCircle,
  Lock,
  ZoomIn,
  ZoomOut,
  Maximize,
  Search,
  ArrowUpDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { mockDb, Invoice, User } from "../services/mockDb";
import InvoicePreviewModal from "./InvoicePreviewModal";

interface InvoiceBookProps {
  type: "COMPRA" | "VENTA";
  invoices: Invoice[];
  client: User;
  isAdmin: boolean;
  onUpdate: () => void;
}

export default function InvoiceBook({
  type,
  invoices,
  client,
  isAdmin,
  onUpdate,
}: InvoiceBookProps) {
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState<Partial<Invoice>>({});
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [editZoom, setEditZoom] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleEditWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        setEditZoom((prev) => Math.min(prev + 0.25, 4));
      } else {
        setEditZoom((prev) => Math.max(prev - 0.25, 0.25));
      }
    }
  };

  const handleDeleteInvoice = async (id: number) => {
    if (window.confirm("¿Está seguro de eliminar esta factura? Esta acción no se puede deshacer.")) {
      try {
        mockDb.deleteInvoice(id, client.id);
        onUpdate();
        if (editingInvoice?.id === id) {
          setEditingInvoice(null);
        }
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const filteredInvoices = useMemo(() => {
    let filtered = invoices.filter(
      (inv) => inv.type === type || (!inv.type && type === "COMPRA"),
    );

    if (selectedMonth !== "ALL") {
      filtered = filtered.filter((inv) => inv.date.startsWith(selectedMonth));
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.name.toLowerCase().includes(lowerSearch) ||
          inv.rif.toLowerCase().includes(lowerSearch) ||
          inv.invoice_number.toLowerCase().includes(lowerSearch)
      );
    }

    return filtered.sort((a, b) => {
      // Sort by date first, then by invoice number if requested
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      
      const numA = parseInt(a.invoice_number.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.invoice_number.replace(/\D/g, "")) || 0;
      return sortOrder === "asc" ? numA - numB : numB - numA;
    });
  }, [invoices, type, selectedMonth, searchTerm, sortOrder]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    invoices
      .filter((inv) => inv.type === type || (!inv.type && type === "COMPRA"))
      .forEach((inv) => {
        months.add(inv.date.substring(0, 7)); // YYYY-MM
      });
    return Array.from(months).sort().reverse();
  }, [invoices, type]);

  const formatMonth = (yyyyMM: string) => {
    const [year, month] = yyyyMM.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date
      .toLocaleDateString("es-VE", { month: "long", year: "numeric" })
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  const isMonthClosed = (yyyyMM: string) => {
    return mockDb.isPeriodClosed(client.id, type, yyyyMM);
  };

  const handleCloseMonth = () => {
    if (selectedMonth === "ALL") return;
    if (
      window.confirm(
        `¿Está seguro de cerrar el mes de ${formatMonth(selectedMonth)}? Esta acción no se puede deshacer y las facturas serán de solo lectura.`,
      )
    ) {
      try {
        mockDb.closePeriod(client.id, type, selectedMonth);
        onUpdate();
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const handleEditClick = (invoice: Invoice) => {
    const month = invoice.date.substring(0, 7);
    if (isMonthClosed(month)) {
      alert("No se puede editar una factura de un mes cerrado.");
      return;
    }
    setEditingInvoice(invoice);
    setFormData({
      date: invoice.date,
      invoice_number: invoice.invoice_number,
      control_number: invoice.control_number,
      rif: invoice.rif,
      name: invoice.name,
      exempt_amount: invoice.exempt_amount,
      taxable_base_16: invoice.taxable_base_16,
      vat_16: invoice.vat_16,
      taxable_base_8: invoice.taxable_base_8,
      vat_8: invoice.vat_8,
      total: invoice.total,
      retention_iva: invoice.retention_iva,
      total_with_retention: invoice.total_with_retention,
      iva_perceived: invoice.iva_perceived,
      total_collected: invoice.total_collected,
      igtf_percentage: invoice.igtf_percentage,
      igtf_amount: invoice.igtf_amount,
      address: invoice.address || "",
    });
    setEditError("");
    setEditSuccess("");
    setEditZoom(1);
  };

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
    if (type === "COMPRA") {
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

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess("");

    try {
      if (!editingInvoice) return;

      const payload = {
        ...editingInvoice,
        date: formData.date!,
        invoice_number: formData.invoice_number!,
        control_number: formData.control_number!,
        rif: formData.rif!,
        name: formData.name!,
        address: formData.address!,
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
        aplica_igtf: formData.aplica_igtf || false,
        igtf_percentage: Number(formData.igtf_percentage || 0),
        igtf_amount: Number(formData.igtf_amount || 0),
      };

      mockDb.updateInvoice(editingInvoice.id!, client.id!, payload);
      setEditSuccess("Factura actualizada con éxito");

      onUpdate();

      setTimeout(() => {
        setEditingInvoice(null);
      }, 1500);
    } catch (err: any) {
      setEditError(err.message || "Error al actualizar la factura");
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filteredInvoices.map((inv) => ({
        Fecha: inv.date,
        "Tipo documento": "Factura",
        "N° Factura": inv.invoice_number,
        "N° Control": inv.control_number,
        [type === "COMPRA" ? "RIF Proveedor" : "RIF Cliente"]: inv.rif,
        [type === "COMPRA" ? "Proveedor" : "Cliente"]: inv.name,
        "Base Imponible 16%": inv.taxable_base_16,
        "IVA 16%": inv.vat_16,
        "Base Imponible 8%": inv.taxable_base_8,
        "IVA 8%": inv.vat_8,
        Exento: inv.exempt_amount,
        "IGTF %": inv.igtf_percentage || 0,
        "Monto IGTF": inv.igtf_amount || 0,
        Total: inv.total,
        [type === "COMPRA" ? "Retención IVA" : "IVA Percibido"]:
          type === "COMPRA" ? inv.retention_iva || 0 : inv.iva_perceived || 0,
        [type === "COMPRA" ? "Total con retención" : "Total Cobrado"]:
          type === "COMPRA" ? inv.total_with_retention || inv.total : inv.total_collected || inv.total,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      `Libro de ${type === "COMPRA" ? "Compras" : "Ventas"}`,
    );
    XLSX.writeFile(wb, `Libro_${type}_${client.rif}.xlsx`);
  };

  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(
      filteredInvoices.map((inv) => ({
        Fecha: inv.date,
        "Tipo documento": "Factura",
        "N° Factura": inv.invoice_number,
        "N° Control": inv.control_number,
        [type === "COMPRA" ? "RIF Proveedor" : "RIF Cliente"]: inv.rif,
        [type === "COMPRA" ? "Proveedor" : "Cliente"]: inv.name,
        "Base Imponible 16%": inv.taxable_base_16,
        "IVA 16%": inv.vat_16,
        "Base Imponible 8%": inv.taxable_base_8,
        "IVA 8%": inv.vat_8,
        Exento: inv.exempt_amount,
        "IGTF %": inv.igtf_percentage || 0,
        "Monto IGTF": inv.igtf_amount || 0,
        Total: inv.total,
        [type === "COMPRA" ? "Retención IVA" : "IVA Percibido"]:
          type === "COMPRA" ? inv.retention_iva || 0 : inv.iva_perceived || 0,
        [type === "COMPRA" ? "Total con retención" : "Total Cobrado"]:
          type === "COMPRA" ? inv.total_with_retention || inv.total : inv.total_collected || inv.total,
      })),
    );
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Libro_${type}_${client.rif}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF("landscape");
    doc.text(
      `Libro de ${type === "COMPRA" ? "Compras" : "Ventas"} - EDUMAR CONTABLE`,
      14,
      15,
    );
    doc.text(`Cliente: ${client.name} | RIF: ${client.rif}`, 14, 22);
    if (selectedMonth !== "ALL") {
      doc.text(`Período: ${formatMonth(selectedMonth)}`, 14, 29);
    }

    (doc as any).autoTable({
      startY: selectedMonth !== "ALL" ? 35 : 30,
      head: [
        [
          "Fecha",
          "Tipo",
          "N° Factura",
          "N° Control",
          type === "COMPRA" ? "RIF Prov." : "RIF Cli.",
          "Nombre",
          "Base 16%",
          "IVA 16%",
          "Base 8%",
          "IVA 8%",
          "Exento",
          "IGTF",
          "Total",
          type === "COMPRA" ? "Ret. IVA" : "IVA Perc.",
          type === "COMPRA" ? "Tot. Ret." : "Tot. Cob.",
        ],
      ],
      body: filteredInvoices.map((inv) => [
        inv.date,
        "Factura",
        inv.invoice_number,
        inv.control_number,
        inv.rif,
        inv.name,
        Number(inv.taxable_base_16 || 0).toFixed(2),
        Number(inv.vat_16 || 0).toFixed(2),
        Number(inv.taxable_base_8 || 0).toFixed(2),
        Number(inv.vat_8 || 0).toFixed(2),
        Number(inv.exempt_amount || 0).toFixed(2),
        Number(inv.igtf_amount || 0).toFixed(2),
        Number(inv.total || 0).toFixed(2),
        Number(type === "COMPRA" ? inv.retention_iva || 0 : inv.iva_perceived || 0).toFixed(2),
        Number(type === "COMPRA" ? inv.total_with_retention || inv.total : inv.total_collected || inv.total).toFixed(2),
      ]),
      foot: [
        [
          "TOTALES",
          "",
          "",
          "",
          "",
          "",
          filteredInvoices
            .reduce((sum, inv) => sum + Number(inv.taxable_base_16 || 0), 0)
            .toFixed(2),
          filteredInvoices
            .reduce((sum, inv) => sum + Number(inv.vat_16 || 0), 0)
            .toFixed(2),
          filteredInvoices
            .reduce((sum, inv) => sum + Number(inv.taxable_base_8 || 0), 0)
            .toFixed(2),
          filteredInvoices
            .reduce((sum, inv) => sum + Number(inv.vat_8 || 0), 0)
            .toFixed(2),
          filteredInvoices
            .reduce((sum, inv) => sum + Number(inv.exempt_amount || 0), 0)
            .toFixed(2),
          filteredInvoices
            .reduce((sum, inv) => sum + Number(inv.igtf_amount || 0), 0)
            .toFixed(2),
          filteredInvoices
            .reduce((sum, inv) => sum + Number(inv.total || 0), 0)
            .toFixed(2),
          filteredInvoices
            .reduce((sum, inv) => sum + Number(type === "COMPRA" ? inv.retention_iva || 0 : inv.iva_perceived || 0), 0)
            .toFixed(2),
          filteredInvoices
            .reduce((sum, inv) => sum + Number(type === "COMPRA" ? inv.total_with_retention || inv.total : inv.total_collected || inv.total), 0)
            .toFixed(2),
        ],
      ],
      styles: { fontSize: 7 },
      headStyles: { fillColor: [30, 58, 138] },
    });

    doc.save(`Libro_${type}_${client.rif}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Edit Invoice View */}
      {editingInvoice && isAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-blue-200 overflow-hidden">
          <div className="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
              <Edit2 size={20} /> Editando Factura de{" "}
              {type === "COMPRA" ? "Compra" : "Venta"}:{" "}
              {editingInvoice.invoice_number}
            </h2>
            <button
              onClick={() => setEditingInvoice(null)}
              className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* Left: Document Preview */}
            <div className="p-6 bg-slate-50 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  Documento Original
                </h3>
                {editingInvoice.file_type?.includes("image") && (
                  <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-slate-200">
                    <button
                      onClick={() =>
                        setEditZoom((prev) => Math.max(prev - 0.25, 0.25))
                      }
                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-colors"
                      title="Alejar (Ctrl + Rueda)"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <span className="text-xs font-medium text-slate-600 w-10 text-center">
                      {Math.round(editZoom * 100)}%
                    </span>
                    <button
                      onClick={() =>
                        setEditZoom((prev) => Math.min(prev + 0.25, 4))
                      }
                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-colors"
                      title="Acercar (Ctrl + Rueda)"
                    >
                      <ZoomIn size={16} />
                    </button>
                    <button
                      onClick={() => setEditZoom(1)}
                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-colors"
                      title="Restablecer"
                    >
                      <Maximize size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div 
                className="flex-1 bg-white border border-slate-200 rounded-xl overflow-auto flex items-start justify-center min-h-[400px] relative"
                onWheel={handleEditWheel}
              >
                {!editingInvoice.file_data ? (
                  <div className="text-slate-500 text-center p-8 w-full h-full flex flex-col items-center justify-center">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No hay documento adjunto para esta factura.</p>
                  </div>
                ) : editingInvoice.file_type?.includes("pdf") ? (
                  <iframe
                    src={editingInvoice.file_data}
                    className="w-full h-full min-h-[500px] absolute inset-0"
                    title="PDF Preview"
                  />
                ) : editingInvoice.file_type?.includes("image") ? (
                  <div className="inline-block transition-all duration-200 ease-in-out p-4">
                    <img
                      src={editingInvoice.file_data}
                      alt="Factura"
                      style={{
                        width: `${editZoom * 100}%`,
                        minWidth: "100%",
                        height: "auto",
                      }}
                      className="shadow-md bg-white rounded-sm"
                    />
                  </div>
                ) : (
                  <div className="text-slate-500 text-center p-8">
                    <p>Formato de archivo no soportado para vista previa.</p>
                    <a
                      href={editingInvoice.file_data}
                      download={editingInvoice.file_name}
                      className="text-blue-600 hover:underline mt-2 inline-block"
                    >
                      Descargar archivo
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Edit Form */}
            <div className="p-6">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
                Datos de la Factura
              </h3>

              {editError && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-2">
                  <AlertCircle
                    className="text-red-500 mt-0.5 shrink-0"
                    size={16}
                  />
                  <p className="text-sm text-red-700">{editError}</p>
                </div>
              )}

              {editSuccess && (
                <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded flex items-start gap-2">
                  <Check
                    className="text-emerald-500 mt-0.5 shrink-0"
                    size={16}
                  />
                  <p className="text-sm text-emerald-700">{editSuccess}</p>
                </div>
              )}

              <form onSubmit={handleUpdateInvoice} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Fecha
                    </label>
                    <input
                      type="date"
                      name="date"
                      required
                      value={formData.date || ""}
                      onChange={handleFormChange}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white border p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      N° Factura
                    </label>
                    <input
                      type="text"
                      name="invoice_number"
                      required
                      value={formData.invoice_number || ""}
                      onChange={handleFormChange}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white border p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      N° Control
                    </label>
                    <input
                      type="text"
                      name="control_number"
                      required
                      value={formData.control_number || ""}
                      onChange={handleFormChange}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white border p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      RIF
                    </label>
                    <input
                      type="text"
                      name="rif"
                      required
                      value={formData.rif || ""}
                      onChange={handleFormChange}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white border p-2.5"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nombre / Razón Social
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name || ""}
                      onChange={handleFormChange}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white border p-2.5"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address || ""}
                      onChange={handleFormChange}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white border p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Monto Exento
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="exempt_amount"
                      required
                      value={formData.exempt_amount || 0}
                      onChange={handleFormChange}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white border p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Base Imponible (16%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="taxable_base_16"
                      required
                      value={formData.taxable_base_16 || 0}
                      onChange={handleFormChange}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white border p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      IVA (16%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="vat_16"
                      required
                      value={formData.vat_16 || 0}
                      onChange={handleFormChange}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-100 border p-2.5 text-slate-500"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Base Imponible (8%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="taxable_base_8"
                      required
                      value={formData.taxable_base_8 || 0}
                      onChange={handleFormChange}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white border p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      IVA (8%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="vat_8"
                      required
                      value={formData.vat_8 || 0}
                      onChange={handleFormChange}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-100 border p-2.5 text-slate-500"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      IGTF
                    </label>
                    <select
                      name="aplica_igtf"
                      value={formData.aplica_igtf ? "true" : "false"}
                      onChange={handleFormChange}
                      disabled={!client?.aplica_igtf}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white border p-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="true">Aplica</option>
                      <option value="false">No aplica</option>
                    </select>
                  </div>

                  {formData.aplica_igtf && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          IGTF %
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          name="igtf_percentage"
                          value={formData.igtf_percentage || 0}
                          onChange={handleFormChange}
                          className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white border p-2.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Monto IGTF
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          name="igtf_amount"
                          value={formData.igtf_amount || 0}
                          className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-100 border p-2.5 text-slate-500"
                          readOnly
                        />
                      </div>
                    </>
                  )}

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-bold text-slate-900 mb-1">
                      Total
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="total"
                      required
                      value={formData.total || 0}
                      onChange={handleFormChange}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-blue-50 border p-2.5 font-bold text-blue-900"
                      readOnly
                    />
                  </div>
                  {type === "COMPRA" ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Retención IVA
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          name="retention_iva"
                          value={formData.retention_iva || 0}
                          onChange={handleFormChange}
                          className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white border p-2.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Total con Retención
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          name="total_with_retention"
                          value={formData.total_with_retention || formData.total || 0}
                          onChange={handleFormChange}
                          className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-emerald-50 border p-2.5 text-emerald-900 font-bold"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          IVA Percibido
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          name="iva_perceived"
                          value={formData.iva_perceived || 0}
                          onChange={handleFormChange}
                          className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white border p-2.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Total Cobrado
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          name="total_collected"
                          value={formData.total_collected || formData.total || 0}
                          onChange={handleFormChange}
                          className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-emerald-50 border p-2.5 text-emerald-900 font-bold"
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

                <div className="pt-4 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    <Check size={18} /> Guardar Cambios
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingInvoice(null)}
                    className="px-6 bg-slate-200 text-slate-700 py-2.5 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" /> Libro de{" "}
            {type === "COMPRA" ? "Compras" : "Ventas"}
          </h2>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar cliente, RIF o factura..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
            
            <button
              onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
              className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              title="Ordenar por número de factura"
            >
              <ArrowUpDown size={16} />
              {sortOrder === "asc" ? "Ascendente" : "Descendente"}
            </button>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Mes:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-2 pl-3 pr-8"
              >
                <option value="ALL">Todos los meses</option>
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {formatMonth(month)}
                  </option>
                ))}
              </select>
            </div>

            {selectedMonth !== "ALL" && isMonthClosed(selectedMonth) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <Lock size={14} /> Mes Cerrado
              </span>
            )}

            {isAdmin &&
              selectedMonth !== "ALL" &&
              !isMonthClosed(selectedMonth) && (
                <button
                  onClick={handleCloseMonth}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                >
                  <Lock size={14} /> Cerrar Mes
                </button>
              )}

            <div className="flex gap-2 border-l border-slate-200 pl-4 ml-2">
              <button
                onClick={exportToExcel}
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Exportar a Excel"
              >
                <FileSpreadsheet size={20} />
              </button>
              <button
                onClick={exportToCSV}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Exportar a CSV"
              >
                <FileText size={20} />
              </button>
              <button
                onClick={exportToPDF}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Exportar a PDF"
              >
                <Download size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto p-6 md:p-8 pt-0">
          <table className="w-full text-sm text-left text-slate-600 mt-6">
            <thead className="text-xs text-slate-700 uppercase bg-slate-100">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Fecha</th>
                <th className="px-4 py-3">Tipo Doc.</th>
                <th className="px-4 py-3">N° Factura</th>
                <th className="px-4 py-3">N° Control</th>
                <th className="px-4 py-3">
                  {type === "COMPRA" ? "RIF Prov." : "RIF Cli."}
                </th>
                <th className="px-4 py-3">
                  {type === "COMPRA" ? "Proveedor" : "Cliente"}
                </th>
                <th className="px-4 py-3 text-right">Base 16%</th>
                <th className="px-4 py-3 text-right">IVA 16%</th>
                <th className="px-4 py-3 text-right">Base 8%</th>
                <th className="px-4 py-3 text-right">IVA 8%</th>
                <th className="px-4 py-3 text-right">Exento</th>
                <th className="px-4 py-3 text-right">IGTF</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">
                  {type === "COMPRA" ? "Retención IVA" : "IVA Percibido"}
                </th>
                <th className="px-4 py-3 text-right">
                  {type === "COMPRA" ? "Total con Retención" : "Total Cobrado"}
                </th>
                <th className="px-4 py-3 rounded-tr-lg text-center">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={16}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No hay facturas registradas para este período.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const month = inv.date.substring(0, 7);
                  const closed = isMonthClosed(month);
                  return (
                    <tr
                      key={inv.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 ${editingInvoice?.id === inv.id ? "bg-blue-50/50" : ""} ${inv.is_duplicate || inv.is_out_of_period ? "bg-red-50" : ""}`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                        {inv.date}
                        {inv.is_duplicate && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800" title="Factura duplicada">
                            Duplicada
                          </span>
                        )}
                        {inv.is_out_of_period && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800" title="Fuera de período">
                            Fuera de período
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            inv.type === "COMPRA"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {inv.type || "FACTURA"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {inv.invoice_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {inv.control_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{inv.rif}</td>
                      <td
                        className="px-4 py-3 max-w-[150px] truncate"
                        title={inv.name}
                      >
                        {inv.name}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {Number(inv.taxable_base_16 || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {Number(inv.vat_16 || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {Number(inv.taxable_base_8 || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {Number(inv.vat_8 || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {Number(inv.exempt_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {Number(inv.igtf_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        {Number(inv.total || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {Number(type === "COMPRA" ? inv.retention_iva || 0 : inv.iva_perceived || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        {Number(type === "COMPRA" ? inv.total_with_retention || inv.total : inv.total_collected || inv.total).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setPreviewInvoice(inv)}
                            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-900 px-2.5 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium"
                            title="Ver Factura"
                          >
                            <Eye size={14} /> Ver
                          </button>
                          {isAdmin && !closed && (
                            <>
                              <button
                                onClick={() => handleEditClick(inv)}
                                className="flex items-center gap-1.5 text-amber-600 hover:text-amber-900 px-2.5 py-1.5 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors text-xs font-medium"
                                title="Editar Factura"
                              >
                                <Edit2 size={14} /> Editar
                              </button>
                              <button
                                onClick={() => handleDeleteInvoice(inv.id)}
                                className="flex items-center gap-1.5 text-red-600 hover:text-red-900 px-2.5 py-1.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium"
                                title="Eliminar Factura"
                              >
                                <X size={14} /> Eliminar
                              </button>
                            </>
                          )}
                          {isAdmin && closed && (
                            <div
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-400 text-xs font-medium"
                              title="Mes Cerrado"
                            >
                              <Lock size={14} /> Cerrado
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredInvoices.length > 0 && (
              <tfoot className="bg-slate-50 font-bold text-slate-900">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right">
                    TOTALES:
                  </td>
                  <td className="px-4 py-3 text-right">
                    {filteredInvoices
                      .reduce(
                        (sum, inv) => sum + Number(inv.taxable_base_16 || 0),
                        0,
                      )
                      .toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {filteredInvoices
                      .reduce((sum, inv) => sum + Number(inv.vat_16 || 0), 0)
                      .toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {filteredInvoices
                      .reduce(
                        (sum, inv) => sum + Number(inv.taxable_base_8 || 0),
                        0,
                      )
                      .toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {filteredInvoices
                      .reduce((sum, inv) => sum + Number(inv.vat_8 || 0), 0)
                      .toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {filteredInvoices
                      .reduce(
                        (sum, inv) => sum + Number(inv.exempt_amount || 0),
                        0,
                      )
                      .toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {filteredInvoices
                      .reduce(
                        (sum, inv) => sum + Number(inv.igtf_amount || 0),
                        0,
                      )
                      .toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-700">
                    {filteredInvoices
                      .reduce((sum, inv) => sum + Number(inv.total || 0), 0)
                      .toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {filteredInvoices
                      .reduce((sum, inv) => sum + Number(type === "COMPRA" ? inv.retention_iva || 0 : inv.iva_perceived || 0), 0)
                      .toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-700">
                    {filteredInvoices
                      .reduce((sum, inv) => sum + Number(type === "COMPRA" ? inv.total_with_retention || inv.total : inv.total_collected || inv.total), 0)
                      .toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <InvoicePreviewModal
        isOpen={!!previewInvoice}
        onClose={() => setPreviewInvoice(null)}
        fileData={previewInvoice?.file_data}
        fileName={previewInvoice?.file_name}
        fileType={previewInvoice?.file_type}
      />
    </div>
  );
}
