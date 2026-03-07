import React from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Calculator,
  BookOpen,
  Scale,
  Building2,
  RefreshCw,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Book,
  Mail,
  Phone,
  MapPin,
  Send,
} from "lucide-react";
import { motion } from "framer-motion";
import Chatbot from "../components/Chatbot";
import Logo from "../components/Logo";

const services = [
  {
    icon: FileText,
    title: "Declaraciones de IVA",
    desc: "Gestión mensual y quincenal",
  },
  {
    icon: Calculator,
    title: "ISLR",
    desc: "Declaración definitiva y estimada",
  },
  {
    icon: BookOpen,
    title: "Libros Contables",
    desc: "Diario, Mayor e Inventario",
  },
  {
    icon: Scale,
    title: "Asesoría Fiscal",
    desc: "Planificación y cumplimiento",
  },
  {
    icon: Building2,
    title: "Constitución de Empresas",
    desc: "Asesoría legal y registro",
  },
  {
    icon: RefreshCw,
    title: "Actualización RIF",
    desc: "Trámites ante el SENIAT",
  },
  {
    icon: BarChart3,
    title: "Estados Financieros",
    desc: "Preparación y análisis",
  },
  { icon: ShieldCheck, title: "Auditoría", desc: "Revisión independiente" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Logo className="h-12" textClassName="text-2xl text-slate-900" />
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#servicios"
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              Servicios
            </a>
            <Link
              to="/login"
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Registrarse
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/workspace/1920/1080?blur=2')] bg-cover bg-center opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
              EDUMAR CONTABLE
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-3xl mx-auto font-light">
              Servicios profesionales de Contaduría Pública en Venezuela.
              <br className="hidden md:block" /> Tu tranquilidad fiscal es
              nuestra prioridad.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-medium text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                ACCEDER AL SISTEMA CONTABLE
                <ArrowRight size={20} />
              </Link>

              <Link
                to="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-blue-700 border-2 border-blue-100 px-8 py-4 rounded-xl font-medium text-lg hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm"
              >
                <Book size={20} />
                LIBRO DE COMPRAS DIGITAL
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicios" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Nuestros Servicios
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Soluciones integrales adaptadas a las necesidades de su unidad de
              negocio en el marco legal venezolano.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:border-blue-100 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <service.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {service.title}
                </h3>
                <p className="text-slate-600">{service.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Logo
              className="h-8 grayscale brightness-200 opacity-80"
              textClassName="text-xl text-white"
              iconClassName="w-8 h-8 text-sm"
            />
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} Edumar Contable. Todos los derechos
            reservados.
          </p>
        </div>
      </footer>

      {/* Chatbot */}
      <Chatbot />
    </div>
  );
}
