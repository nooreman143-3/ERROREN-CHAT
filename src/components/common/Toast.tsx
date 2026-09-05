import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export const toast = {
  success: (message: string) => {
    window.dispatchEvent(new CustomEvent('erroren-toast', { detail: { message, type: 'success' } }));
  },
  error: (message: string) => {
    window.dispatchEvent(new CustomEvent('erroren-toast', { detail: { message, type: 'error' } }));
  },
  info: (message: string) => {
    window.dispatchEvent(new CustomEvent('erroren-toast', { detail: { message, type: 'info' } }));
  },
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: ToastType }>;
      if (!customEvent.detail || !customEvent.detail.message) return;

      const newToast: ToastItem = {
        id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        message: customEvent.detail.message,
        type: customEvent.detail.type || 'info',
      };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Keep at most 5 toasts

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 3800);
    };

    window.addEventListener('erroren-toast', handleToast);
    return () => window.removeEventListener('erroren-toast', handleToast);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div 
      id="erroren-toast-container"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 max-w-md w-[92%] sm:w-auto pointer-events-none"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          id={`toast-${item.id}`}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border text-sm font-medium transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${
            item.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : item.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
              : 'bg-slate-900/90 border-slate-700/60 text-slate-200'
          }`}
        >
          {item.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
          {item.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          {item.type === 'info' && <Info className="w-5 h-5 text-cyan-400 shrink-0" />}
          <span className="flex-1 leading-snug">{item.message}</span>
          <button
            id={`btn-close-toast-${item.id}`}
            onClick={() => removeToast(item.id)}
            className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition shrink-0"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
