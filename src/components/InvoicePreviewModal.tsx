import React, { useState } from "react";
import { X, Download, ZoomIn, ZoomOut, Maximize } from "lucide-react";

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileData?: string;
  fileName?: string;
  fileType?: string;
}

export default function InvoicePreviewModal({
  isOpen,
  onClose,
  fileData,
  fileName,
  fileType,
}: InvoicePreviewModalProps) {
  const [zoom, setZoom] = useState(1);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.25));
  const handleResetZoom = () => setZoom(1);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            Vista Previa de Documento
            {fileName && (
              <span className="text-sm font-normal text-slate-500 truncate max-w-[200px]">
                ({fileName})
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {fileType?.includes("image") && (
              <div className="flex items-center gap-1 bg-slate-200/50 rounded-lg p-1 mr-2">
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                  title="Alejar (Ctrl + Rueda)"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-xs font-medium text-slate-600 w-10 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                  title="Acercar (Ctrl + Rueda)"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                  title="Restablecer"
                >
                  <Maximize size={16} />
                </button>
              </div>
            )}
            {fileData && (
              <a
                href={fileData}
                download={fileName || "factura"}
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
        <div 
          className="flex-1 overflow-auto p-4 bg-slate-100 flex items-start justify-center min-h-[400px]"
          onWheel={handleWheel}
        >
          {!fileData ? (
            <div className="text-slate-500 flex flex-col items-center justify-center w-full h-full gap-2">
              <p>No hay documento adjunto para esta factura.</p>
            </div>
          ) : fileType?.includes("pdf") ? (
            <iframe
              src={fileData}
              className="w-full h-full min-h-[700px] rounded border border-slate-200 bg-white"
              title="PDF Preview"
            />
          ) : fileType?.includes("image") ? (
            <div className="inline-block transition-all duration-200 ease-in-out">
              <img
                src={fileData}
                alt="Factura"
                style={{
                  width: `${zoom * 100}%`,
                  minWidth: "100%",
                  height: "auto",
                }}
                className="shadow-md bg-white rounded-sm"
              />
            </div>
          ) : (
            <div className="text-slate-500">
              <p>Formato de archivo no soportado para vista previa.</p>
              <a
                href={fileData}
                download={fileName}
                className="text-blue-600 hover:underline mt-2 inline-block"
              >
                Descargar archivo
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
