import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Menu, Search, UserCircle, LayoutDashboard, Sun, Moon, HelpCircle } from "lucide-react";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useDarkMode } from "../contexts/DarkModeContext";
import { NotificationBell } from "../contexts/NotificationContext";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import SearchModal from "./SearchModal";
import OfflineBanner from "./OfflineBanner";

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDateTime = currentDateTime.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) + ' • ' + currentDateTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Listen for ? and Ctrl/Cmd+K keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "?" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useKeyboardShortcuts();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Tableau de Bord";
    if (path === "/dashboard/operations") return "Historique des Opérations";
    if (path === "/dashboard/speculations") return "Gestion des Cultures";
    if (path === "/dashboard/stock") return "État des Stocks";
    if (path === "/dashboard/employees") return "Ressources Humaines";
    if (path === "/dashboard/trucks") return "Gestion Logistique";
    if (path === "/dashboard/accounts") return "Analyse Financière";
    if (path === "/dashboard/reports") return "Rapports & Statistiques";
    if (path === "/dashboard/users") return "Gestion des Utilisateurs";
    if (path === "/dashboard/audit") return "Journaux d'Audit";
    if (path === "/dashboard/invoices") return "Facturation";
    if (path === "/dashboard/monthly") return "Rapport Mensuel";
    return "KOKANSEY";
  };

  return (
    <>
      <OfflineBanner />
      <div className="flex h-screen bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden relative font-sans pt-0">
        {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-[100] lg:hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        >
          <div className="w-4/5 h-full animate-in slide-in-from-left duration-300" onClick={(e) => e.stopPropagation()}>
            <Sidebar mobile onClose={() => setIsSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-20 bg-white dark:bg-[#1e293b] border-b border-gray-100 dark:border-slate-800 items-center justify-between px-8 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">{getPageTitle()}</h2>
            <p className="text-xs font-medium text-gray-400 dark:text-slate-400 mt-0.5 capitalize">{formattedDateTime}</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden xl:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-400" />
              <input 
                type="text" 
                placeholder="Rechercher... (Ctrl+K)"
                onFocus={() => setIsSearchOpen(true)}
                readOnly
                className="pl-12 pr-6 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold w-64 focus:ring-2 focus:ring-primary/10 dark:text-white dark:placeholder-slate-500 transition-all cursor-pointer"
              />
            </div>
            
            <button 
              onClick={() => setIsShortcutsModalOpen(true)}
              className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-300 hover:text-primary hover:bg-primary/5 dark:hover:bg-slate-700 rounded-2xl transition-all"
              title="Raccourcis clavier"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            <button 
              onClick={toggleDarkMode}
              className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-300 hover:text-primary hover:bg-primary/5 dark:hover:bg-slate-700 rounded-2xl transition-all"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <NotificationBell />

            <div className="h-10 w-px bg-gray-100 dark:bg-slate-700" />

            <div className="flex items-center gap-3 pl-2">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-800 dark:text-white leading-none">{user.username}</p>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">{user.role}</p>
              </div>
              <div className="w-11 h-11 bg-primary/10 dark:bg-slate-800 rounded-xl flex items-center justify-center text-primary dark:text-secondary font-bold text-sm border border-primary/10 dark:border-slate-700">
                {user.username?.substring(0, 2).toUpperCase() || <UserCircle className="w-6 h-6" />}
              </div>
            </div>
          </div>
        </header>

        {/* Top bar for mobile */}
        <header className="lg:hidden bg-[#1a4d2e] text-white p-5 flex justify-between items-center shadow-lg z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-lg font-black tracking-tighter uppercase leading-none">{getPageTitle()}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleDarkMode}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"
            >
              {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-10 bg-[#f8fafc] dark:bg-[#0f172a] custom-scrollbar">
          <div 
            key={location.pathname} 
            className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <Outlet />
          </div>
        </main>
        <KeyboardShortcutsModal isOpen={isShortcutsModalOpen} onClose={() => setIsShortcutsModalOpen(false)} />
        <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </div>
    </div>
    </>
  );
}

