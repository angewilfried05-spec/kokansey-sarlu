import React, { useState } from "react";
import { Plus, Sprout, Users, Truck, ShoppingCart, CreditCard, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDarkMode } from "../contexts/DarkModeContext";

export default function QuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();

  const actions = [
    {
      icon: <Sprout className="w-5 h-5" />,
      label: "Nouvelle Culture",
      onClick: () => {
        navigate("/dashboard/speculations");
        setIsOpen(false);
      },
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: "Ajouter Employé",
      onClick: () => {
        navigate("/dashboard/employees");
        setIsOpen(false);
      },
    },
    {
      icon: <Truck className="w-5 h-5" />,
      label: "Nouveau Camion",
      onClick: () => {
        navigate("/dashboard/trucks");
        setIsOpen(false);
      },
    },
    {
      icon: <ShoppingCart className="w-5 h-5" />,
      label: "Enregistrer Vente",
      onClick: () => {
        navigate("/dashboard/speculations?view=sales");
        setIsOpen(false);
      },
    },
    {
      icon: <CreditCard className="w-5 h-5" />,
      label: "Ajouter Dépense",
      onClick: () => {
        navigate("/dashboard/speculations?view=expenses");
        setIsOpen(false);
      },
    },
  ];

  return (
    <div className="fixed bottom-10 right-10 z-[100]">
      {/* Expanded Actions */}
      {isOpen && (
        <div className="mb-4 space-y-2 animate-in slide-in-from-bottom-4 duration-300">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border transition-all group w-full ${
                isDarkMode 
                  ? "bg-[#1e293b] border-slate-700 text-slate-200 hover:bg-primary" 
                  : "bg-white border-gray-100 hover:bg-primary"
              }`}
            >
              <span className={isDarkMode ? "text-primary group-hover:text-white" : "text-primary group-hover:text-white"}>{action.icon}</span>
              <span className={`text-sm font-bold ${isDarkMode ? "text-slate-200 group-hover:text-white" : "text-gray-700 group-hover:text-white"}`}>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-primary rounded-3xl shadow-2xl hover:shadow-primary/30 hover:scale-110 transition-all flex items-center justify-center"
      >
        {isOpen ? (
          <X className="w-8 h-8 text-white" />
        ) : (
          <Plus className="w-8 h-8 text-white" />
        )}
      </button>
    </div>
  );
}
