import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";
import { useEffect, useState } from "react";

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

const DURATION = 5000;

export default function Toast({ message, type, onClose, duration = DURATION }: ToastProps) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), duration - 200);
    const remove = setTimeout(onClose, duration);
    return () => {
      clearTimeout(timer);
      clearTimeout(remove);
    };
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const accents = {
    success: 'border-l-emerald-500',
    error: 'border-l-red-500',
    warning: 'border-l-amber-500',
    info: 'border-l-blue-500',
  };

  return (
    <div
      role="alert"
      className={`flex items-center gap-3 pl-4 pr-3 py-3.5 rounded-xl border border-l-4 border-gray-100 dark:border-slate-700 ${accents[type]} bg-white dark:bg-slate-800 shadow-pop max-w-sm ${
        leaving ? 'animate-out' : 'animate-in slide-in-from-right-8 duration-300'
      }`}
    >
      {icons[type]}
      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{message}</p>
      <button
        onClick={onClose}
        className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg ml-2 transition-colors"
        aria-label="Fermer la notification"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}
