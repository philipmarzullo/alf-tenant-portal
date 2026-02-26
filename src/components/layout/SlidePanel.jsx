import { X } from 'lucide-react';

export default function SlidePanel({ open, onClose, title, children }) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-screen w-full md:w-[480px] bg-white shadow-xl z-50 transform transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 h-14 border-b border-gray-200">
          <h2 className="font-semibold text-dark-text">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto h-[calc(100vh-56px)]">
          {children}
        </div>
      </div>
    </>
  );
}
