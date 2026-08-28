import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";
import { useEffect } from "react";

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-green-50 border-green-100',
    error: 'bg-red-50 border-red-100',
    warning: 'bg-amber-50 border-amber-100',
    info: 'bg-blue-50 border-blue-100',
  };

  return (
    <div className={`fixed bottom-8 right-8 flex items-center gap-3 p-4 rounded-2xl border shadow-xl animate-in slide-in-from-right-8 duration-300 z-[9999] ${bgColors[type]}`}>
      {icons[type]}
      <p className="text-sm font-bold text-gray-800">{message}</p>
      <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full ml-4 transition-colors">
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}
