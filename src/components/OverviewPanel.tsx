import React, { useMemo, useState } from "react";
import { Invoice, User } from "../services/mockDb";
import { DollarSign, FileText, TrendingDown, TrendingUp, Calendar, AlertTriangle, Download, FileSpreadsheet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface OverviewPanelProps {
  invoices: Invoice[];
  client?: User;
}

export default function OverviewPanel({ invoices, client }: OverviewPanelProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );

  const stats = useMemo(() => {
    const monthInvoices = invoices.filter((inv) => inv.date.startsWith(selectedMonth));
    
    const compras = monthInvoices.filter((inv) => inv.type === "COMPRA");
    const ventas = monthInvoices.filter((inv) => inv.type === "VENTA");

    const totalCompras = compras.reduce((sum, inv) => sum + inv.total, 0);
    const totalVentas = ventas.reduce((sum, inv) => sum + inv.total, 0);

    const comprasBase = compras.reduce((sum, inv) => sum + inv.taxable_base_16 + inv.taxable_base_8, 0);
    const comprasIva = compras.reduce((sum, inv) => sum + inv.vat_16 + inv.vat_8, 0);
    const comprasExento = compras.reduce((sum, inv) => sum + inv.exempt_amount, 0);
    const comprasIgtf = compras.reduce((sum, inv) => sum + (inv.igtf_amount || 0), 0);

    const ventasBase = ventas.reduce((sum, inv) => sum + inv.taxable_base_16 + inv.taxable_base_8, 0);
    const ventasIva = ventas.reduce((sum, inv) => sum + inv.vat_16 + inv.vat_8, 0);
    const ventasExento = ventas.reduce((sum, inv) => sum + inv.exempt_amount, 0);
    const ventasIgtf = ventas.reduce((sum, inv) => sum + (inv.igtf_amount || 0), 0);

    const ivaPagar = Math.max(0, ventasIva - comprasIva);
    const ivaCompensar = Math.max(0, comprasIva - ventasIva);

    // Validations
    const duplicates = monthInvoices.filter(inv => inv.is_duplicate);
    const outOfPeriod = monthInvoices.filter(inv => inv.is_out_of_period);
    
    // Simple IVA validation (checking if IVA is roughly 16% or 8% of base)
    const invalidIva = monthInvoices.filter(inv => {
      const expectedIva16 = inv.taxable_base_16 * 0.16;
      const expectedIva8 = inv.taxable_base_8 * 0.08;
      const diff16 = Math.abs(expectedIva16 - inv.vat_16);
      const diff8 = Math.abs(expectedIva8 - inv.vat_8);
      return diff16 > 0.1 || diff8 > 0.1; // Allow small rounding differences
    });

    return {
      totalCompras,
      totalVentas,
      comprasBase,
      comprasIva,
      comprasExento,
      ventasBase,
      ventasIva,
      ventasExento,
      comprasIgtf,
      ventasIgtf,
      ivaPagar,
      ivaCompensar,
      count: monthInvoices.length,
      errors: {
        duplicates: duplicates.length,
        outOfPeriod: outOfPeriod.length,
        invalidIva: invalidIva.length,
        total: duplicates.length + outOfPeriod.length + invalidIva.length
      }
    };
  }, [invoices, selectedMonth]);

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    }).replace(/^\w/, (c) => c.toUpperCase());
  };

  const getReportData = () => {
    return [
      { Concepto: "Base Imponible Ventas", Valor: stats.ventasBase.toFixed(2) },
      { Concepto: "IVA Ventas (Débito Fiscal)", Valor: stats.ventasIva.toFixed(2) },
      { Concepto: "Ventas Exentas", Valor: stats.ventasExento.toFixed(2) },
      { Concepto: "Base Imponible Compras", Valor: stats.comprasBase.toFixed(2) },
      { Concepto: "IVA Compras (Crédito Fiscal)", Valor: stats.comprasIva.toFixed(2) },
      { Concepto: "Compras Exentas", Valor: stats.comprasExento.toFixed(2) },
      { Concepto: "IVA por Pagar", Valor: stats.ivaPagar.toFixed(2) },
      { Concepto: "IVA a Compensar", Valor: stats.ivaCompensar.toFixed(2) },
    ];
  };

  const exportToExcel = () => {
    if (stats.errors.total > 0) {
      if (!window.confirm("Hay errores en las facturas del período. ¿Desea generar el reporte de todos modos?")) return;
    }
    const data = getReportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Declaración IVA");
    XLSX.writeFile(wb, `Resumen_Declaracion_IVA_${selectedMonth}.xlsx`);
  };

  const exportToCSV = () => {
    if (stats.errors.total > 0) {
      if (!window.confirm("Hay errores en las facturas del período. ¿Desea generar el reporte de todos modos?")) return;
    }
    const data = getReportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Resumen_Declaracion_IVA_${selectedMonth}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (stats.errors.total > 0) {
      if (!window.confirm("Hay errores en las facturas del período. ¿Desea generar el reporte de todos modos?")) return;
    }
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text("Resumen Declaración IVA Mensual", 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Empresa: ${client?.name || "N/A"}`, 14, 30);
    doc.text(`RIF: ${client?.rif || "N/A"}`, 14, 36);
    doc.text(`Período: ${formatMonth(selectedMonth)}`, 14, 42);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString("es-ES")}`, 14, 48);

    const data = getReportData();

    (doc as any).autoTable({
      startY: 55,
      head: [["Concepto", "Monto (Bs.)"]],
      body: data.map((row) => [row.Concepto, row.Valor]),
      headStyles: { fillColor: [30, 58, 138] },
      theme: 'grid',
    });

    doc.save(`Resumen_Declaracion_IVA_${selectedMonth}.pdf`);
  };

  const barChartData = [
    { name: "Base Imponible", Compras: stats.comprasBase, Ventas: stats.ventasBase },
    { name: "Exento", Compras: stats.comprasExento, Ventas: stats.ventasExento },
    { name: "Total", Compras: stats.totalCompras, Ventas: stats.totalVentas },
  ];

  const pieChartData = [
    { name: "IVA Crédito (Compras)", value: stats.comprasIva, color: "#10b981" },
    { name: "IVA Débito (Ventas)", value: stats.ventasIva, color: "#3b82f6" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800">Declaración de IVA Estimada</h2>
        <div className="flex items-center gap-2">
          <Calendar className="text-slate-500" size={20} />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-2 text-sm font-medium text-slate-700"
          />
        </div>
      </div>

      {stats.errors.total > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="text-red-800 font-bold text-sm">Advertencia: Errores detectados en el período</h3>
            <ul className="text-red-700 text-sm mt-1 list-disc list-inside">
              {stats.errors.duplicates > 0 && <li>{stats.errors.duplicates} factura(s) duplicada(s).</li>}
              {stats.errors.outOfPeriod > 0 && <li>{stats.errors.outOfPeriod} factura(s) fuera de período.</li>}
              {stats.errors.invalidIva > 0 && <li>{stats.errors.invalidIva} factura(s) con cálculo de IVA incorrecto.</li>}
            </ul>
            <p className="text-red-600 text-xs mt-2">Se recomienda revisar los libros contables antes de generar la declaración.</p>
          </div>
        </div>
      )}

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Compras</h3>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <TrendingDown className="text-emerald-600" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">Bs. {stats.totalCompras.toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Ventas</h3>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <TrendingUp className="text-blue-600" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">Bs. {stats.totalVentas.toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">IVA Estimado del Mes</h3>
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <DollarSign className="text-amber-600" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">Bs. {stats.ivaPagar.toFixed(2)}</p>
          {stats.ivaCompensar > 0 && (
            <p className="text-xs text-emerald-600 font-medium mt-2">
              A compensar: Bs. {stats.ivaCompensar.toFixed(2)}
            </p>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Facturas</h3>
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <FileText className="text-purple-600" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.count}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charts */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Compras vs Ventas</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Compras" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">IVA Débito vs Crédito</h3>
          <div className="h-64 flex items-center justify-center">
            {stats.comprasIva === 0 && stats.ventasIva === 0 ? (
              <p className="text-slate-500">No hay datos de IVA para este período</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Resumen Mensual de IVA */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-lg font-bold text-slate-800">Resumen para Declaración</h3>
          <div className="flex gap-2">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors text-sm font-medium"
              title="Exportar a Excel"
            >
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors text-sm font-medium"
              title="Exportar a CSV"
            >
              <FileText size={16} /> CSV
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium"
              title="Exportar a PDF"
            >
              <Download size={16} /> PDF
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Concepto</th>
                  <th className="px-4 py-3 font-semibold text-right">Monto (Bs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">Base imponible ventas</td>
                  <td className="px-4 py-3 text-right">{stats.ventasBase.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">IVA ventas (Débito Fiscal)</td>
                  <td className="px-4 py-3 text-right text-blue-600 font-semibold">{stats.ventasIva.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">Ventas exentas</td>
                  <td className="px-4 py-3 text-right">{stats.ventasExento.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">Base imponible compras</td>
                  <td className="px-4 py-3 text-right">{stats.comprasBase.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">IVA compras (Crédito Fiscal)</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{stats.comprasIva.toFixed(2)}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">Compras exentas</td>
                  <td className="px-4 py-3 text-right">{stats.comprasExento.toFixed(2)}</td>
                </tr>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-4 py-4 font-bold text-slate-900">IVA a pagar</td>
                  <td className="px-4 py-4 text-right font-bold text-red-600 text-lg">{stats.ivaPagar.toFixed(2)}</td>
                </tr>
                {stats.ivaCompensar > 0 && (
                  <tr className="bg-emerald-50/50">
                    <td className="px-4 py-3 font-bold text-emerald-800">IVA a compensar en el próximo período</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{stats.ivaCompensar.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

