import React, { useState } from "react";
import { FileText, Download, FileSpreadsheet, File as FileIcon } from "lucide-react";
import { Invoice } from "../services/mockDb";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface ReportsPanelProps {
  invoices: Invoice[];
}

export default function ReportsPanel({ invoices }: ReportsPanelProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");

  const months = Array.from(
    new Set(invoices.map((inv) => inv.date.substring(0, 7))),
  ).sort((a, b) => b.localeCompare(a));

  const formatMonth = (monthStr: string) => {
    if (monthStr === "ALL") return "Todos los meses";
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    });
  };

  const filteredInvoices =
    selectedMonth === "ALL"
      ? invoices
      : invoices.filter((inv) => inv.date.startsWith(selectedMonth));

  const compras = filteredInvoices.filter((inv) => inv.type === "COMPRA");
  const ventas = filteredInvoices.filter((inv) => inv.type === "VENTA");

  const generateReportData = () => {
    const totalCompras = compras.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    const totalVentas = ventas.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    const ivaCompras = compras.reduce((sum, inv) => sum + Number(inv.vat_16 || 0) + Number(inv.vat_8 || 0), 0);
    const ivaVentas = ventas.reduce((sum, inv) => sum + Number(inv.vat_16 || 0) + Number(inv.vat_8 || 0), 0);
    const igtfCompras = compras.reduce((sum, inv) => sum + Number(inv.igtf_amount || 0), 0);
    const igtfVentas = ventas.reduce((sum, inv) => sum + Number(inv.igtf_amount || 0), 0);
    
    return [
      {
        "Métrica": "Total Compras",
        "Valor": totalCompras.toFixed(2),
      },
      {
        "Métrica": "Total Ventas",
        "Valor": totalVentas.toFixed(2),
      },
      {
        "Métrica": "IVA Crédito Fiscal (Compras)",
        "Valor": ivaCompras.toFixed(2),
      },
      {
        "Métrica": "IVA Débito Fiscal (Ventas)",
        "Valor": ivaVentas.toFixed(2),
      },
      {
        "Métrica": "IGTF Pagado (Compras)",
        "Valor": igtfCompras.toFixed(2),
      },
      {
        "Métrica": "IGTF Percibido (Ventas)",
        "Valor": igtfVentas.toFixed(2),
      },
      {
        "Métrica": "IVA por Pagar",
        "Valor": Math.max(0, ivaVentas - ivaCompras).toFixed(2),
      },
      {
        "Métrica": "IVA a Compensar",
        "Valor": Math.max(0, ivaCompras - ivaVentas).toFixed(2),
      },
      {
        "Métrica": "Facturas de Compra Registradas",
        "Valor": compras.length.toString(),
      },
      {
        "Métrica": "Facturas de Venta Registradas",
        "Valor": ventas.length.toString(),
      },
    ];
  };

  const exportToExcel = () => {
    const data = generateReportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte Contable");
    XLSX.writeFile(wb, `Reporte_Contable_${selectedMonth}.xlsx`);
  };

  const exportToCSV = () => {
    const data = generateReportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Contable_${selectedMonth}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte Contable - EDUMAR CONTABLE", 14, 15);
    doc.text(`Período: ${formatMonth(selectedMonth)}`, 14, 22);

    const data = generateReportData();

    (doc as any).autoTable({
      startY: 30,
      head: [["Métrica", "Valor"]],
      body: data.map((row) => [row["Métrica"], row["Valor"]]),
      headStyles: { fillColor: [30, 58, 138] },
    });

    doc.save(`Reporte_Contable_${selectedMonth}.pdf`);
  };

  const reportData = generateReportData();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="text-blue-600" /> Reporte Contable Automático
        </h2>
        <div className="flex items-center gap-4">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-slate-300 rounded-xl px-4 py-2 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todos los meses</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={exportToExcel}
              className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
              title="Exportar a Excel"
            >
              <FileSpreadsheet size={20} />
            </button>
            <button
              onClick={exportToCSV}
              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              title="Exportar a CSV"
            >
              <FileIcon size={20} />
            </button>
            <button
              onClick={exportToPDF}
              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              title="Exportar a PDF"
            >
              <Download size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm text-left text-slate-600">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold">Métrica</th>
              <th className="px-6 py-4 font-semibold text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reportData.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">
                  {row["Métrica"]}
                </td>
                <td className="px-6 py-4 text-right font-bold text-slate-900">
                  {row["Valor"]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
