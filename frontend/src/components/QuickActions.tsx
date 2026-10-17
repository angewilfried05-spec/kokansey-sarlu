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
  ];

  return (
    <>
      {/* Backdrop quand le menu est ouvert */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end">
        {/* Expanded Actions */}
        {isOpen && (
          <div className="mb-4 space-y-2 animate-in slide-in-from-bottom-4 duration-200">
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                className={`flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-xl shadow-pop border transition-all group w-full ${
                  isDarkMode 
                    ? "bg-[#1e293b] border-slate-700 text-slate-200" 
                    : "bg-white border-gray-100"
                }`}
              >
                <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary dark:text-secondary shrink-0">
                  {action.icon}
                </span>
                <span className={`text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-700"}`}>
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Main Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Fermer les actions rapides" : "Ouvrir les actions rapides"}
          className="w-14 h-14 bg-primary rounded-2xl shadow-pop hover:bg-primary-light hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
        >
          <span className={`transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}>
            <Plus className="w-7 h-7 text-white" />
          </span>
        </button>
      </div>
    </>
  );
}
