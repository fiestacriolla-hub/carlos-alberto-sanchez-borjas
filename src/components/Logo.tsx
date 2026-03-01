import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  textClassName?: string;
  iconClassName?: string;
}

export default function Logo({ 
  className = "h-12", 
  showText = true, 
  textClassName = "text-2xl text-slate-900",
  iconClassName = "w-10 h-10 text-xl"
}: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <img 
        src="/logo.png" 
        alt="Edumar Contable" 
        className={`object-contain ${className}`}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
          if (fallback) {
            fallback.style.display = 'flex';
            fallback.classList.remove('hidden');
          }
        }}
      />
      {/* Fallback if logo.png is not found */}
      <div className="hidden items-center gap-3">
        <div className={`bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold shadow-md ${iconClassName}`}>
          EC
        </div>
        {showText && <span className={`font-bold tracking-tight ${textClassName}`}>EDUMAR CONTABLE</span>}
      </div>
    </div>
  );
}
