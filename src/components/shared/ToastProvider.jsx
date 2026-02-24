import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm animate-[slideUp_0.2s_ease-out] ${
              toast.type === 'success'
                ? 'bg-white border-status-green/30 text-dark-text'
                : 'bg-white border-status-red/30 text-dark-text'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle size={16} className="text-status-green shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-status-red shrink-0" />
            )}
            <span className="max-w-xs">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
