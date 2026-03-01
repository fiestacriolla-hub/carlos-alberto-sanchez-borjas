import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, LogOut, Building, Mail, FileText, ArrowRight } from 'lucide-react';
import { mockDb, User as Client } from '../services/mockDb';
import Logo from '../components/Logo';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const allUsers = mockDb.getUsers();
        const clientUsers = allUsers.filter(u => u.role === 'CLIENT');
        setClients(clientUsers);
      } catch (err) {
        console.error('Failed to fetch clients', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-900 text-white flex flex-col transition-all shadow-xl z-20">
        <div className="p-6 border-b border-blue-800">
          <Logo className="h-10 brightness-0 invert" textClassName="text-lg text-white" iconClassName="w-10 h-10 text-sm bg-blue-700" showText={true} />
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all bg-blue-700 text-white shadow-md"
          >
            <Users size={20} />
            Clientes
          </button>
        </nav>

        <div className="p-4 border-t border-blue-800">
          <div className="mb-4 px-4">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
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
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Gestión de Clientes
          </h1>
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold border border-blue-100">
              Total Clientes: {clients.length}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="text-center py-12 text-slate-500">Cargando clientes...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients.length === 0 ? (
                  <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 shadow-sm">
                    No hay clientes registrados en el sistema.
                  </div>
                ) : (
                  clients.map((client) => (
                    <div key={client.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all hover:-translate-y-1 group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Building size={24} />
                        </div>
                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full border border-slate-200">
                          ID: {client.id}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-slate-900 mb-1 truncate" title={client.name}>
                        {client.name}
                      </h3>
                      
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <FileText size={16} className="text-slate-400" />
                          <span className="font-medium">RIF:</span> {client.rif}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail size={16} className="text-slate-400" />
                          <span className="truncate" title={client.email}>{client.email}</span>
                        </div>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-slate-100">
                        <Link 
                          to={`/admin/client/${client.id}`}
                          className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-3 rounded-xl font-medium hover:bg-blue-600 hover:text-white transition-colors group-hover:bg-blue-600 group-hover:text-white"
                        >
                          Ver Libros
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
