import React from "react";
import { X, AlertTriangle, Trash2 } from "lucide-react";
import { useDarkMode } from "../contexts/DarkModeContext";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  variant = "default"
}: ConfirmationModalProps) {
  const { isDarkMode } = useDarkMode();

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const colors = {
    danger: {
      bg: isDarkMode ? "bg-red-900/20" : "bg-red-50",
      border: isDarkMode ? "border-red-700" : "border-red-200",
      text: isDarkMode ? "text-red-300" : "text-red-800",
      button: "bg-red-600 hover:bg-red-700"
    },
    warning: {
      bg: isDarkMode ? "bg-yellow-900/20" : "bg-yellow-50",
      border: isDarkMode ? "border-yellow-700" : "border-yellow-200",
      text: isDarkMode ? "text-yellow-300" : "text-yellow-800",
      button: "bg-yellow-600 hover:bg-yellow-700"
    },
    default: {
      bg: isDarkMode ? "bg-gray-800/50" : "bg-gray-50",
      border: isDarkMode ? "border-gray-600" : "border-gray-200",
      text: isDarkMode ? "text-gray-300" : "text-gray-800",
      button: "bg-primary hover:bg-primary/90"
    }
  }[variant];

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[250] backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 ${isDarkMode ? "bg-[#1e293b]" : "bg-white"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 border-b ${isDarkMode ? "border-slate-700" : "border-gray-100"} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${colors.bg} ${colors.border} border`}>
              {variant === "danger" ? (
                <Trash2 className={`w-6 h-6 ${colors.text}`} />
              ) : (
                <AlertTriangle className={`w-6 h-6 ${colors.text}`} />
              )}
            </div>
            <h3 className={`text-xl font-black ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full ${isDarkMode ? "hover:bg-slate-700" : "hover:bg-gray-100"} transition-colors`}
          >
            <X className={`w-5 h-5 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-gray-600"} font-medium`}>{message}</p>
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${isDarkMode ? "border-slate-700" : "border-gray-100"} flex gap-3 justify-end`}>
          <button
            onClick={onClose}
            className={`px-6 py-3 rounded-2xl font-bold text-sm border transition-all ${
              isDarkMode 
                ? "border-slate-700 text-slate-300 hover:bg-slate-700" 
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-6 py-3 rounded-2xl font-bold text-sm text-white transition-all shadow-lg ${colors.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
