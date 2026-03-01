import React, { useState, useMemo } from 'react';
import { FileText, FileSpreadsheet, Download, Eye, Edit2, Check, X, AlertCircle, Lock } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { mockDb, Invoice, User } from '../services/mockDb';
import InvoicePreviewModal from './InvoicePreviewModal';

interface InvoiceBookProps {
  type: 'COMPRA' | 'VENTA';
  invoices: Invoice[];
  client: User;
  isAdmin: boolean;
  onUpdate: () => void;
}

export default function InvoiceBook({ type, invoices, client, isAdmin, onUpdate }: InvoiceBookProps) {
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState<Partial<Invoice>>({});
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  const filteredInvoices = useMemo(() => {
    let filtered = invoices.filter(inv => inv.type === type || (!inv.type && type === 'COMPRA'));
    
    if (selectedMonth !== 'ALL') {
      filtered = filtered.filter(inv => inv.date.startsWith(selectedMonth));
    }
    
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, type, selectedMonth]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    invoices.filter(inv => inv.type === type || (!inv.type && type === 'COMPRA')).forEach(inv => {
      months.add(inv.date.substring(0, 7)); // YYYY-MM
    });
    return Array.from(months).sort().reverse();
  }, [invoices, type]);

  const formatMonth = (yyyyMM: string) => {
    const [year, month] = yyyyMM.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  };

  const isMonthClosed = (yyyyMM: string) => {
    return mockDb.isPeriodClosed(client.id, type, yyyyMM);
  };

  const handleCloseMonth = () => {
    if (selectedMonth === 'ALL') return;
    if (window.confirm(`¿Está seguro de cerrar el mes de ${formatMonth(selectedMonth)}? Esta acción no se puede deshacer y las facturas serán de solo lectura.`)) {
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
      alert('No se puede editar una factura de un mes cerrado.');
      return;
    }
    setEditingInvoice(invoice);
    setFormData({
      date: invoice.date,
      invoice_number: invoice.invoice_number,
      control_number: invoice.control_number,
      exempt_amount: invoice.exempt_amount,
      taxable_base: invoice.taxable_base,
      vat: invoice.vat,
      total: invoice.total,
    });
    setEditError('');
    setEditSuccess('');
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    if (name === 'taxable_base' || name === 'exempt_amount') {
      const base = parseFloat(newFormData.taxable_base as any) || 0;
      const exempt = parseFloat(newFormData.exempt_amount as any) || 0;
      const vat = base * 0.16;
      const total = base + exempt + vat;
      
      newFormData = {
        ...newFormData,
        vat: parseFloat(vat.toFixed(2)),
        total: parseFloat(total.toFixed(2))
      };
    }

    setFormData(newFormData);
  };

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');

    try {
      if (!editingInvoice) return;

      const payload = {
        ...editingInvoice,
        date: formData.date!,
        invoice_number: formData.invoice_number!,
        control_number: formData.control_number!,
        exempt_amount: Number(formData.exempt_amount),
        taxable_base: Number(formData.taxable_base),
        vat: Number(formData.vat),
        total: Number(formData.total),
      };

      mockDb.updateInvoice(editingInvoice.id!, client.id!, payload);
      setEditSuccess('Factura actualizada con éxito');
      
      onUpdate();
      
      setTimeout(() => {
        setEditingInvoice(null);
      }, 1500);
    } catch (err: any) {
      setEditError(err.message || 'Error al actualizar la factura');
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredInvoices.map(inv => ({
      'Fecha': inv.date,
      'N° Factura': inv.invoice_number,
      'N° Control': inv.control_number,
      'Monto Exento': inv.exempt_amount,
      'Base Gravable': inv.taxable_base,
      'IVA': inv.vat,
      'Total': inv.total
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Libro de ${type === 'COMPRA' ? 'Compras' : 'Ventas'}`);
    XLSX.writeFile(wb, `Libro_${type}_${client.rif}.xlsx`);
  };

  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(filteredInvoices.map(inv => ({
      'Fecha': inv.date,
      'N° Factura': inv.invoice_number,
      'N° Control': inv.control_number,
      'Monto Exento': inv.exempt_amount,
      'Base Gravable': inv.taxable_base,
      'IVA': inv.vat,
      'Total': inv.total
    })));
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Libro_${type}_${client.rif}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Libro de ${type === 'COMPRA' ? 'Compras' : 'Ventas'} - EDUMAR CONTABLE`, 14, 15);
    doc.text(`Cliente: ${client.name} | RIF: ${client.rif}`, 14, 22);
    if (selectedMonth !== 'ALL') {
      doc.text(`Período: ${formatMonth(selectedMonth)}`, 14, 29);
    }
    
    (doc as any).autoTable({
      startY: selectedMonth !== 'ALL' ? 35 : 30,
      head: [['Fecha', 'N° Factura', 'N° Control', 'Exento', 'Base', 'IVA', 'Total']],
      body: filteredInvoices.map(inv => [
        inv.date, 
        inv.invoice_number, 
        inv.control_number, 
        inv.exempt_amount.toFixed(2), 
        inv.taxable_base.toFixed(2), 
        inv.vat.toFixed(2), 
        inv.total.toFixed(2)
      ]),
      foot: [['TOTALES', '', '', 
        filteredInvoices.reduce((sum, inv) => sum + inv.exempt_amount, 0).toFixed(2),
        filteredInvoices.reduce((sum, inv) => sum + inv.taxable_base, 0).toFixed(2),
        filteredInvoices.reduce((sum, inv) => sum + inv.vat, 0).toFixed(2),
        filteredInvoices.reduce((sum, inv) => sum + inv.total, 0).toFixed(2)
      ]]
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
              <Edit2 size={20} /> Editando Factura de {type === 'COMPRA' ? 'Compra' : 'Venta'}: {editingInvoice.invoice_number}
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
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Documento Original</h3>
              <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center min-h-[400px]">
                {!editingInvoice.file_data ? (
                  <div className="text-slate-500 text-center p-8">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No hay documento adjunto para esta factura.</p>
                  </div>
                ) : editingInvoice.file_type?.includes('pdf') ? (
                  <iframe 
                    src={editingInvoice.file_data} 
                    className="w-full h-full min-h-[500px]"
                    title="PDF Preview"
                  />
                ) : editingInvoice.file_type?.includes('image') ? (
                  <img 
                    src={editingInvoice.file_data} 
                    alt="Factura" 
                    className="max-w-full max-h-[600px] object-contain p-2"
                  />
                ) : (
                  <div className="text-slate-500 text-center p-8">
                    <p>Formato de archivo no soportado para vista previa.</p>
                    <a href={editingInvoice.file_data} download={editingInvoice.file_name} className="text-blue-600 hover:underline mt-2 inline-block">
                      Descargar archivo
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Edit Form */}
            <div className="p-6">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Datos de la Factura</h3>
              
              {editError && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-2">
                  <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={16} />
                  <p className="text-sm text-red-700">{editError}</p>
                </div>
              )}

              {editSuccess && (
                <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded flex items-start gap-2">
                  <Check className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                  <p className="text-sm text-emerald-700">{editSuccess}</p>
                </div>
              )}

              <form onSubmit={handleUpdateInvoice} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                    <input 
                      type="date" 
                      name="date"
                      required
                      value={formData.date || ''}
                      onChange={handleFormChange}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white border p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">N° Factura</label>
                    <input 
                      type="text" 
                      name="invoice_number"
                      required
                      value={formData.invoice_number || ''}
                      onChange={handleFormChange}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white border p-2.5"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">N° Control</label>
                    <input 
                      type="text" 
                      name="control_number"
                      required
                      value={formData.control_number || ''}
                      onChange={handleFormChange}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white border p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Monto Exento</label>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Base Gravable</label>
                    <input 
                      type="number" 
                      step="0.01"
                      name="taxable_base"
                      required
                      value={formData.taxable_base || 0}
                      onChange={handleFormChange}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white border p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">IVA (16%)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      name="vat"
                      required
                      value={formData.vat || 0}
                      onChange={handleFormChange}
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-100 border p-2.5 text-slate-500"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1">Total</label>
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
            <FileText className="text-blue-600" /> Libro de {type === 'COMPRA' ? 'Compras' : 'Ventas'}
          </h2>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Mes:</label>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-2 pl-3 pr-8"
              >
                <option value="ALL">Todos los meses</option>
                {availableMonths.map(month => (
                  <option key={month} value={month}>{formatMonth(month)}</option>
                ))}
              </select>
            </div>

            {selectedMonth !== 'ALL' && isMonthClosed(selectedMonth) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <Lock size={14} /> Mes Cerrado
              </span>
            )}

            {isAdmin && selectedMonth !== 'ALL' && !isMonthClosed(selectedMonth) && (
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
                <th className="px-4 py-3">N° Factura</th>
                <th className="px-4 py-3">N° Control</th>
                <th className="px-4 py-3 text-right">Exento</th>
                <th className="px-4 py-3 text-right">Base Gravable</th>
                <th className="px-4 py-3 text-right">IVA</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 rounded-tr-lg text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No hay facturas registradas para este período.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const month = inv.date.substring(0, 7);
                  const closed = isMonthClosed(month);
                  return (
                    <tr key={inv.id} className={`border-b border-slate-100 hover:bg-slate-50 ${editingInvoice?.id === inv.id ? 'bg-blue-50/50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-slate-900">{inv.date}</td>
                      <td className="px-4 py-3">{inv.invoice_number}</td>
                      <td className="px-4 py-3">{inv.control_number}</td>
                      <td className="px-4 py-3 text-right">{inv.exempt_amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{inv.taxable_base.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{inv.vat.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{inv.total.toFixed(2)}</td>
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
                            <button 
                              onClick={() => handleEditClick(inv)}
                              className="flex items-center gap-1.5 text-amber-600 hover:text-amber-900 px-2.5 py-1.5 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors text-xs font-medium"
                              title="Editar Factura"
                            >
                              <Edit2 size={14} /> Editar
                            </button>
                          )}
                          {isAdmin && closed && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-400 text-xs font-medium" title="Mes Cerrado">
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
                  <td colSpan={3} className="px-4 py-3 text-right">TOTALES:</td>
                  <td className="px-4 py-3 text-right">{filteredInvoices.reduce((sum, inv) => sum + inv.exempt_amount, 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{filteredInvoices.reduce((sum, inv) => sum + inv.taxable_base, 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{filteredInvoices.reduce((sum, inv) => sum + inv.vat, 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-blue-700">{filteredInvoices.reduce((sum, inv) => sum + inv.total, 0).toFixed(2)}</td>
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
