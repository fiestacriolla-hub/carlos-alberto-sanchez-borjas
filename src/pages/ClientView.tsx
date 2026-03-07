import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  Building,
  Mail,
  LogOut,
  ShoppingCart,
  Tag,
  FileText,
  Settings,
} from "lucide-react";
import { mockDb, User as Client, Invoice } from "../services/mockDb";
import InvoiceBook from "../components/InvoiceBook";
import Logo from "../components/Logo";
import ReportsPanel from "../components/ReportsPanel";

export default function ClientView() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"compras" | "ventas" | "reports" | "config">("compras");

  const fetchClientData = async () => {
    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const clientId = Number(id);
      const clientData = mockDb.getUserById(clientId);

      if (clientData) {
        setClient(clientData);
        const clientInvoices = mockDb.getInvoices(clientId);
        setInvoices(
          clientInvoices.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          ),
        );
      }
    } catch (err) {
      console.error("Failed to fetch client data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const handleUpdateConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    
    const form = e.target as HTMLFormElement;
    const aplica_igtf = (form.elements.namedItem("aplica_igtf") as HTMLSelectElement).value === "true";
    const igtf_percentage = parseFloat((form.elements.namedItem("igtf_percentage") as HTMLInputElement).value) || 3;

    try {
      mockDb.updateUser(client.id, { aplica_igtf, igtf_percentage });
      alert("Configuración fiscal actualizada con éxito.");
      fetchClientData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        Cargando datos del cliente...
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        Cliente no encontrado.
      </div>
    );
  }

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
          <Link
            to="/admin"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-blue-200 hover:bg-blue-800 hover:text-white mb-4"
          >
            <ArrowLeft size={20} />
            Volver
          </Link>

          <div className="px-4 py-2 mb-2 text-xs font-bold text-blue-300 uppercase tracking-wider">
            Libros del Cliente
          </div>

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
            onClick={() => setActiveTab("config")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === "config"
                ? "bg-blue-700 text-white shadow-md"
                : "text-blue-200 hover:bg-blue-800 hover:text-white"
            }`}
          >
            <Settings size={20} />
            Configuración Fiscal
          </button>
        </nav>

        <div className="p-4 border-t border-blue-800">
          <div className="mb-4 px-4">
            <p className="text-sm font-medium text-white truncate">
              {user?.name}
            </p>
            <p className="text-xs text-blue-200 truncate">Administrador</p>
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
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            {client.name}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500 font-medium">
              Panel Administrativo
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                    <Building size={32} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">
                      Información del Cliente
                    </h2>
                    <div className="flex flex-wrap gap-6 text-sm text-slate-600">
                      <span className="flex items-center gap-2 font-medium">
                        <Tag size={16} className="text-slate-400" /> RIF:{" "}
                        {client.rif}
                      </span>
                      <span className="flex items-center gap-2 font-medium">
                        <Mail size={16} className="text-slate-400" />{" "}
                        {client.email}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-8">
              {activeTab === "compras" && (
                <InvoiceBook
                  type="COMPRA"
                  invoices={invoices}
                  client={client}
                  isAdmin={true}
                  onUpdate={fetchClientData}
                />
              )}

              {activeTab === "ventas" && (
                <InvoiceBook
                  type="VENTA"
                  invoices={invoices}
                  client={client}
                  isAdmin={true}
                  onUpdate={fetchClientData}
                />
              )}

              {activeTab === "reports" && (
                <ReportsPanel invoices={invoices} />
              )}

              {activeTab === "config" && (
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Settings className="text-blue-600" /> Configuración Fiscal del Cliente
                  </h2>
                  <form onSubmit={handleUpdateConfig} className="max-w-md space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        IGTF (Impuesto a las Grandes Transacciones Financieras)
                      </label>
                      <select
                        name="aplica_igtf"
                        defaultValue={client.aplica_igtf ? "true" : "false"}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="true">Aplica IGTF</option>
                        <option value="false">No aplica IGTF</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Porcentaje IGTF (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="igtf_percentage"
                        defaultValue={client.igtf_percentage || 3}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      Guardar Configuración
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
