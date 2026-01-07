
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const contextValue = React.useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-6 right-6 z-[1000] flex flex-col gap-3 pointer-events-none w-full max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-center justify-between p-4 rounded-2xl border backdrop-blur-xl shadow-2xl 
              animate-in slide-in-from-right-full fade-in duration-500
              ${toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-100/50 text-emerald-900 shadow-emerald-500/10' : ''}
              ${toast.type === 'error' ? 'bg-rose-50/90 border-rose-100/50 text-rose-900 shadow-rose-500/10' : ''}
              ${toast.type === 'info' ? 'bg-indigo-50/90 border-indigo-100/50 text-indigo-900 shadow-indigo-500/10' : ''}
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`
                p-2 rounded-xl 
                ${toast.type === 'success' ? 'bg-emerald-500 text-white' : ''}
                ${toast.type === 'error' ? 'bg-rose-500 text-white' : ''}
                ${toast.type === 'info' ? 'bg-indigo-500 text-white' : ''}
              `}>
                {toast.type === 'success' && <CheckCircle size={18} />}
                {toast.type === 'error' && <AlertCircle size={18} />}
                {toast.type === 'info' && <Info size={18} />}
              </div>
              <p className="text-sm font-bold tracking-tight">{toast.message}</p>
            </div>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors text-black/20 hover:text-black/60"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
