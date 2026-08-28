import React from "react";
import { X, Keyboard } from "lucide-react";
import { useDarkMode } from "../contexts/DarkModeContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: Props) {
  const { isDarkMode } = useDarkMode();
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ["Ctrl", "K"], description: "Rechercher dans l'application" },
    { keys: ["Ctrl", "D"], description: "Basculer le mode sombre" },
    { keys: ["Esc"], description: "Fermer les modales" },
    { keys: ["G", "S"], description: "Aller aux Stocks" },
    { keys: ["G", "E"], description: "Aller aux Employés" },
    { keys: ["G", "C"], description: "Aller aux Cultures" },
    { keys: ["G", "R"], description: "Aller aux Rapports" },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[200] backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div className={`rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 ${isDarkMode ? "bg-[#1e293b]" : "bg-white"}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}>
          <div className="flex items-center gap-3">
            <Keyboard className="w-6 h-6 text-primary" />
            <h2 className={`text-xl font-black ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>Raccourcis Clavier</h2>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? "hover:bg-slate-700" : "hover:bg-gray-100"}`}>
            <X className={`w-5 h-5 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            {shortcuts.map((shortcut, idx) => (
              <div key={idx} className={`flex items-center justify-between p-4 rounded-xl ${isDarkMode ? "bg-slate-800/50" : "bg-gray-50"}`}>
                <span className={`text-sm font-bold ${isDarkMode ? "text-slate-200" : "text-gray-700"}`}>{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, keyIdx) => (
                    <React.Fragment key={keyIdx}>
                      <span className={`px-3 py-1 border rounded-lg text-xs font-black shadow-sm ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-gray-200 text-gray-700"
                      }`}>
                        {key}
                      </span>
                      {keyIdx < shortcut.keys.length - 1 && (
                        <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}>+</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-6 pt-4 border-t ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}>
            <p className={`text-xs italic text-center ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}>
              Appuyez sur <span className="font-bold text-primary">?</span> pour ouvrir ce menu à tout moment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
