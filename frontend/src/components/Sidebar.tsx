import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Sprout, 
  Users, 
  Truck, 
  TrendingUp, 
  LogOut,
  Calculator,
  History,
  Package,
  X,
  Settings,
  ShieldAlert,
  Bell,
  Wallet,
  FileText,
  ClipboardList,
  Calendar
} from "lucide-react";
import { cn } from "../lib/utils";

const menuItems = [
  { name: "Tableau de Bord", href: "/dashboard", icon: LayoutDashboard, category: "Général" },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell, category: "Général" },
  { name: "Opérations", href: "/dashboard/operations", icon: History, category: "Général" },
  { name: "Spéculations", href: "/dashboard/speculations", icon: Sprout, category: "Gestion" },
  { name: "Stocks", href: "/dashboard/stock", icon: Package, category: "Gestion" },
  { name: "Ressources Humaines", href: "/dashboard/employees", icon: Users, category: "RH & Logistique" },
  { name: "Gestion Logistique", href: "/dashboard/trucks", icon: Truck, category: "RH & Logistique" },
  { name: "Comptes d'Exploitation", href: "/dashboard/accounts", icon: Calculator, category: "Finance" },
  { name: "Comptes Clients", href: "/dashboard/client-accounts", icon: Wallet, category: "Finance" },
  { name: "Facturation", href: "/dashboard/invoices", icon: FileText, category: "Finance" },
  { name: "Rapport Mensuel", href: "/dashboard/monthly", icon: Calendar, category: "Finance" },
  { name: "Rapports", href: "/dashboard/reports", icon: TrendingUp, category: "Finance" },
  { name: "Tâches", href: "/dashboard/tasks", icon: ClipboardList, category: "RH & Logistique" },
];

export default function Sidebar({ mobile, onClose }: { mobile?: boolean, onClose?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.role || 'GERANT';
  
  // LOGIQUE DE SECOURS : Si l'utilisateur est celui par défaut (KOKANSEY GROUP), on le traite comme ADMIN
  const isAdmin = role === 'ADMIN' || user?.username === 'KOKANSEY GROUP';
  const isGerant = role === 'GERANT' || isAdmin;
  const isCommercial = role === 'COMMERCIAL';
  const isStockManager = role === 'STOCK_MANAGER';
  const isRH = role === 'RH';

  // Base menu items with roles
  const allPossibleItems = [
    ...menuItems,
    { name: "Utilisateurs", href: "/dashboard/users", icon: Settings, adminOnly: true, category: "Système" },
    { name: "Audit Log", href: "/dashboard/audit", icon: ShieldAlert, adminOnly: true, category: "Système" },
  ];

  const filteredMenuItems = allPossibleItems.filter(item => {
    if (isAdmin) return true;
    if ((item as any).adminOnly) return false;
    if (isGerant) return true;
    if (isCommercial) return ["Tableau de Bord", "Opérations", "Spéculations", "Stocks", "Comptes Clients", "Facturation", "Rapports"].includes(item.name);
    if (isStockManager) return ["Tableau de Bord", "Opérations", "Stocks"].includes(item.name);
    if (isRH) return ["Tableau de Bord", "Ressources Humaines", "Tâches"].includes(item.name);
    return false;
  });

  const categories = Array.from(new Set(filteredMenuItems.map(item => item.category)));

  return (
    <div className={cn(
      "flex flex-col h-screen bg-primary text-white shadow-2xl transition-all duration-300",
      mobile ? "w-full" : "w-72 hidden lg:flex"
    )}>
      <div className="px-6 pt-7 pb-5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center shadow-lg shadow-black/20 shrink-0">
            <Sprout className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight leading-none">KOKANSEY</h1>
            <p className="text-[9px] text-secondary font-bold uppercase tracking-[0.25em] mt-0.5">Management</p>
          </div>
        </div>
        {mobile && (
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors" aria-label="Fermer le menu">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-2 space-y-6 overflow-y-auto custom-scrollbar">
        {categories.map(category => (
          <div key={category} className="space-y-1">
            <h2 className="px-3 text-[10px] font-bold text-white/35 uppercase tracking-[0.18em] mb-2">{category}</h2>
            <div className="space-y-0.5">
              {filteredMenuItems.filter(item => item.category === category).map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                      isActive 
                        ? "bg-white/10 text-white" 
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {/* Indicateur actif */}
                    <span className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-full bg-secondary transition-all duration-200",
                      isActive ? "h-6 opacity-100" : "h-0 opacity-0 group-hover:h-4 group-hover:opacity-50"
                    )} />
                    <item.icon className={cn("w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0", isActive ? "text-secondary" : "text-white/40 group-hover:text-white/70")} />
                    <span className="font-semibold text-sm tracking-tight truncate" title={item.name}>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 m-3 bg-black/15 rounded-2xl border border-white/5 space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="w-10 h-10 rounded-xl bg-secondary/20 border border-secondary/30 flex items-center justify-center font-bold text-secondary text-sm shrink-0">
            {user?.username?.substring(0, 2).toUpperCase() || "KG"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate tracking-tight">{user?.username || "Invité"}</p>
            <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">{role}</p>
          </div>
        </div>
        
        <button
          onClick={async () => {
             await fetch("/api/auth/logout", { method: "POST" });
             localStorage.removeItem("user");
             localStorage.removeItem("token");
             navigate("/login");
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 w-full rounded-xl bg-white/5 hover:bg-red-500/80 text-white/70 hover:text-white transition-all duration-200 group font-semibold text-sm"
        >
          <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
}
