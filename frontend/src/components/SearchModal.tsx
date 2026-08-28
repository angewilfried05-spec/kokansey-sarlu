import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Sprout, Users, Truck, UserCircle, Package, ClipboardList, Search, ArrowRight } from "lucide-react";
import { useApi } from "../hooks/useApi";

interface SearchResultItem {
  id: string;
  name?: string;
  title?: string;
  nom?: string;
  internalCode?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  cniNumber?: string | null;
  category?: string;
  status?: string;
  brand?: string;
  model?: string;
  registration?: string;
  quantity?: number;
  unit?: string;
  telephone?: string | null;
  email?: string | null;
  priority?: string;
  dueDate?: string | null;
}

interface SearchResults {
  speculations: SearchResultItem[];
  employees: SearchResultItem[];
  trucks: SearchResultItem[];
  clients: SearchResultItem[];
  stocks: SearchResultItem[];
  tasks: SearchResultItem[];
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const categories = [
  { key: "speculations", label: "Cultures", icon: Sprout, route: "/dashboard/speculations" },
  { key: "employees", label: "Employés", icon: Users, route: "/dashboard/employees" },
  { key: "trucks", label: "Camions", icon: Truck, route: "/dashboard/trucks" },
  { key: "clients", label: "Clients", icon: UserCircle, route: "/dashboard/client-accounts" },
  { key: "stocks", label: "Stocks", icon: Package, route: "/dashboard/stock" },
  { key: "tasks", label: "Tâches", icon: ClipboardList, route: "/dashboard/tasks" },
] as const;

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setDebouncedQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  const url = debouncedQuery ? `/api/search?q=${encodeURIComponent(debouncedQuery)}` : null;
  const { data, loading } = useApi<SearchResults>({ url, initialData: { speculations: [], employees: [], trucks: [], clients: [], stocks: [], tasks: [] } });

  if (!isOpen) return null;

  const handleNavigate = (route: string) => {
    onClose();
    navigate(route);
  };

  const totalResults = Object.values(data || {}).reduce((acc, list) => acc + (Array.isArray(list) ? list.length : 0), 0);

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24 bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <Search className="w-5 h-5 text-gray-400 dark:text-slate-500" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une culture, un employé, un camion, un client..."
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 font-bold"
          />
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full">
            <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-4">
          {loading && (
            <div className="py-12 text-center text-gray-400 dark:text-slate-400 animate-pulse">
              Recherche en cours...
            </div>
          )}

          {!loading && query && debouncedQuery && totalResults === 0 && (
            <div className="py-12 text-center text-gray-400 dark:text-slate-400">
              Aucun résultat pour "{debouncedQuery}"
            </div>
          )}

          {categories.map(({ key, label, icon: Icon, route }) => {
            const items = (data?.[key] as SearchResultItem[] | undefined) ?? [];
            if (items.length === 0) return null;
            return (
              <div key={key} className="mb-6">
                <div className="flex items-center gap-2 px-2 mb-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-400">{label}</span>
                </div>
                <div className="space-y-1">
                  {items.map((item) => {
                    let title = "";
                    let subtitle = "";
                    if (key === "speculations") { title = item.name || ""; subtitle = `${item.category || ""} • ${item.status || ""}`; }
                    else if (key === "employees") { title = `${item.firstName || ""} ${item.lastName || ""}`.trim(); subtitle = `${item.position || ""} • ${item.cniNumber || "-"}`; }
                    else if (key === "trucks") { title = item.internalCode || ""; subtitle = `${item.brand || ""} ${item.model || ""} • ${item.registration || ""}`; }
                    else if (key === "clients") { title = item.nom || ""; subtitle = `${item.telephone || ""} ${item.email || ""}`.trim(); }
                    else if (key === "stocks") { title = item.name || ""; subtitle = `${item.quantity ?? ""} ${item.unit || ""} • ${item.category || ""}`; }
                    else if (key === "tasks") { title = item.title || ""; subtitle = `${item.status || ""} • ${item.priority || ""}`; }

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(route)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group text-left"
                      >
                        <div>
                          <p className="font-bold text-gray-800 dark:text-white">{title}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">{subtitle}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-primary transition-colors" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-3 bg-gray-50 dark:bg-slate-700/30 border-t border-gray-100 dark:border-slate-700 text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest flex justify-between">
          <span>Global Search</span>
          <span>Échap pour fermer</span>
        </div>
      </div>
    </div>
  );
}
