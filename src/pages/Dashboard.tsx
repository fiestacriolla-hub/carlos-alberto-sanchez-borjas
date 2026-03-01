import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Search, LogOut, Check, AlertCircle, ShoppingCart, Tag, Loader2, Eye } from 'lucide-react';
import { mockDb, Invoice } from '../services/mockDb';
import InvoicePreviewModal from '../components/InvoicePreviewModal';
import InvoiceBook from '../components/InvoiceBook';
import Logo from '../components/Logo';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'upload' | 'compras' | 'ventas' | 'search'>('upload');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState('');
  
  // Form state
  const [formData, setFormData] = useState<Partial<Invoice>>({
    date: new Date().toISOString().split('T')[0],
    invoice_number: '',
    control_number: '',
    exempt_amount: 0,
    taxable_base: 0,
    vat: 0,
    total: 0,
    type: 'COMPRA'
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Preview state
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = () => {
    if (user) {
      const userInvoices = mockDb.getInvoices(user.id);
      setInvoices(userInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [user]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      
      // Simulate OCR Processing
      setIsProcessing(true);
      setOcrSuccess('');
      setError('');
      setSuccess('');
      
      try {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Generate simulated OCR data
        const randomBase = Math.floor(Math.random() * 5000) + 100;
        const randomExempt = Math.random() > 0.5 ? Math.floor(Math.random() * 500) : 0;
        const vat = randomBase * 0.16;
        const total = randomBase + randomExempt + vat;
        
        const randomInvoiceNum = `001-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        const randomControlNum = `00-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        
        setFormData(prev => ({
          ...prev,
          date: new Date().toISOString().split('T')[0],
          invoice_number: randomInvoiceNum,
          control_number: randomControlNum,
          exempt_amount: randomExempt,
          taxable_base: randomBase,
          vat: parseFloat(vat.toFixed(2)),
          total: parseFloat(total.toFixed(2))
        }));
        
        setOcrSuccess('Datos detectados automáticamente mediante OCR. Por favor verifique.');
      } catch (err) {
        console.error("OCR Error", err);
        setError('Error al procesar el documento. Por favor ingrese los datos manualmente.');
      } finally {
        setIsProcessing(false);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/heic': ['.heic'],
      'image/gif': ['.gif'],
      'image/bmp': ['.bmp']
    },
    maxFiles: 1
  } as any);

  // Auto-calculate total and VAT based on taxable base
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    if (name === 'taxable_base' || name === 'exempt_amount') {
      const base = parseFloat(newFormData.taxable_base as any) || 0;
      const exempt = parseFloat(newFormData.exempt_amount as any) || 0;
      const vat = base * 0.16; // 16% IVA in Venezuela
      const total = base + exempt + vat;
      
      newFormData = {
        ...newFormData,
        vat: parseFloat(vat.toFixed(2)),
        total: parseFloat(total.toFixed(2))
      };
    }

    setFormData(newFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setOcrSuccess('');
    setLoading(true);

    try {
      if (!user) throw new Error('Not authenticated');

      const month = formData.date!.substring(0, 7);
      if (mockDb.isPeriodClosed(user.id, formData.type as 'COMPRA' | 'VENTA', month)) {
        throw new Error(`El mes de ${month} está cerrado para ${formData.type === 'COMPRA' ? 'compras' : 'ventas'}. No se pueden agregar facturas.`);
      }

      let fileData = '';
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
        exempt_amount: Number(formData.exempt_amount),
        taxable_base: Number(formData.taxable_base),
        vat: Number(formData.vat),
        total: Number(formData.total),
        file_data: fileData,
        file_name: file?.name,
        file_type: file?.type,
        type: formData.type as 'COMPRA' | 'VENTA'
      };

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      mockDb.addInvoice(payload);

      setSuccess('Factura guardada con éxito');
      setFormData({
        date: new Date().toISOString().split('T')[0],
        invoice_number: '',
        control_number: '',
        exempt_amount: 0,
        taxable_base: 0,
        vat: 0,
        total: 0,
        type: formData.type // Keep the selected type
      });
      setFile(null);
      fetchInvoices();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoice_number.includes(searchTerm) || 
    inv.control_number.includes(searchTerm) ||
    inv.date.includes(searchTerm)
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-900 text-white flex flex-col transition-all shadow-xl z-20">
        <div className="p-6 border-b border-blue-800">
          <Logo className="h-10 brightness-0 invert" textClassName="text-lg text-white" iconClassName="w-10 h-10 text-sm bg-blue-700" showText={true} />
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => setActiveTab('upload')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'upload' 
                ? 'bg-blue-700 text-white shadow-md' 
                : 'text-blue-200 hover:bg-blue-800 hover:text-white'
            }`}
          >
            <Upload size={20} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('ventas')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'ventas' 
                ? 'bg-blue-700 text-white shadow-md' 
                : 'text-blue-200 hover:bg-blue-800 hover:text-white'
            }`}
          >
            <Tag size={20} />
            Libro de Ventas
          </button>
          <button
            onClick={() => setActiveTab('compras')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'compras' 
                ? 'bg-blue-700 text-white shadow-md' 
                : 'text-blue-200 hover:bg-blue-800 hover:text-white'
            }`}
          >
            <ShoppingCart size={20} />
            Libro de Compras
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'search' 
                ? 'bg-blue-700 text-white shadow-md' 
                : 'text-blue-200 hover:bg-blue-800 hover:text-white'
            }`}
          >
            <FileText size={20} />
            Reportes
          </button>
        </nav>

        <div className="p-4 border-t border-blue-800">
          <div className="mb-4 px-4">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
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
            {activeTab === 'upload' && 'Dashboard / Carga de Facturas'}
            {activeTab === 'ventas' && 'Libro de Ventas'}
            {activeTab === 'compras' && 'Libro de Compras'}
            {activeTab === 'search' && 'Reportes y Búsqueda'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500 font-medium">
              Panel Administrativo
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            
            {/* UPLOAD TAB */}
            {activeTab === 'upload' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-8">
                  <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Upload size={24} className="text-blue-600"/> Carga de Facturas
                  </h2>

                  {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
                      <AlertCircle className="text-red-500 mt-0.5" size={20} />
                      <p className="text-sm text-red-700 font-medium">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-lg flex items-start gap-3">
                      <Check className="text-emerald-500 mt-0.5" size={20} />
                      <p className="text-sm text-emerald-700 font-medium">{success}</p>
                    </div>
                  )}

                  {ocrSuccess && (
                    <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg flex items-start gap-3">
                      <Check className="text-blue-500 mt-0.5" size={20} />
                      <p className="text-sm text-blue-700 font-medium">{ocrSuccess}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Drag & Drop Zone */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">Archivo de Factura (Opcional)</label>
                      <div 
                        {...getRootProps()} 
                        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all relative flex flex-col items-center justify-center min-h-[300px] ${
                          isDragActive ? 'border-blue-500 bg-blue-50 shadow-inner' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50 hover:shadow-sm'
                        }`}
                      >
                        <input {...getInputProps()} />
                        
                        {isProcessing ? (
                          <div className="flex flex-col items-center justify-center py-4">
                            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
                            <p className="text-blue-600 font-medium">Procesando factura...</p>
                            <p className="text-slate-500 text-sm mt-2">Extrayendo datos con OCR simulado</p>
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
                                <p className="text-slate-700 font-semibold text-lg">Arrastra y suelta tu factura aquí</p>
                                <p className="text-slate-500 text-sm mt-2">o haz clic para seleccionar (PDF, JPG, PNG, WEBP, etc.)</p>
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
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de Factura</label>
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
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha</label>
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
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">N° Factura</label>
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
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">N° Control</label>
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
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monto Exento</label>
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
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Base Gravable</label>
                          <input 
                            type="number" 
                            step="0.01"
                            name="taxable_base"
                            required
                            value={formData.taxable_base}
                            onChange={handleFormChange}
                            className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-50 border p-3 transition-shadow"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">IVA (16%)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            name="vat"
                            required
                            value={formData.vat}
                            onChange={handleFormChange}
                            className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-slate-100 border p-3 text-slate-500"
                            readOnly
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-bold text-slate-900 mb-1.5">Total</label>
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
                      </div>
                      
                      <div className="pt-4">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-md"
                        >
                          {loading ? 'Guardando...' : 'Guardar Factura'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* COMPRAS TAB */}
            {activeTab === 'compras' && user && (
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
            {activeTab === 'ventas' && user && (
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

            {/* SEARCH TAB */}
            {activeTab === 'search' && (
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
                        <th className="px-6 py-4 font-semibold text-right">Total</th>
                        <th className="px-6 py-4 font-semibold text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center">
                              <Search className="h-10 w-10 text-slate-300 mb-3" />
                              <p className="text-lg font-medium text-slate-600">No se encontraron resultados</p>
                              <p className="text-sm text-slate-400 mt-1">Intenta con otros términos de búsqueda.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-medium">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${inv.type === 'VENTA' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                {inv.type || 'COMPRA'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-900">{inv.date}</td>
                            <td className="px-6 py-4">{inv.invoice_number}</td>
                            <td className="px-6 py-4">{inv.control_number}</td>
                            <td className="px-6 py-4 text-right font-bold text-slate-900">{inv.total.toFixed(2)}</td>
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
    </div>
  );
}
