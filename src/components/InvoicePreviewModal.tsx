import React from 'react';
import { X, Download } from 'lucide-react';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileData?: string;
  fileName?: string;
  fileType?: string;
}

export default function InvoicePreviewModal({ isOpen, onClose, fileData, fileName, fileType }: InvoicePreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            Vista Previa de Documento
            {fileName && <span className="text-sm font-normal text-slate-500">({fileName})</span>}
          </h3>
          <div className="flex items-center gap-2">
            {fileData && (
              <a 
                href={fileData} 
                download={fileName || 'factura'}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Descargar"
              >
                <Download size={20} />
              </a>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[400px]">
          {!fileData ? (
            <div className="text-slate-500 flex flex-col items-center gap-2">
              <p>No hay documento adjunto para esta factura.</p>
            </div>
          ) : fileType?.includes('pdf') ? (
            <iframe 
              src={fileData} 
              className="w-full h-full min-h-[600px] rounded border border-slate-200 bg-white"
              title="PDF Preview"
            />
          ) : fileType?.includes('image') ? (
            <img 
              src={fileData} 
              alt="Factura" 
              className="max-w-full max-h-[70vh] object-contain rounded border border-slate-200 bg-white shadow-sm"
            />
          ) : (
            <div className="text-slate-500">
              <p>Formato de archivo no soportado para vista previa.</p>
              <a href={fileData} download={fileName} className="text-blue-600 hover:underline mt-2 inline-block">
                Descargar archivo
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
