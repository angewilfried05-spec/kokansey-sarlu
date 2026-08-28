import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  Bell,
  AlertTriangle,
  AlertCircle,
  Clock,
  Search,
  ArrowRight,
  Activity,
  ArrowUpCircle,
  ArrowDownCircle,
  Package,
  History,
  ChevronRight,
  Shield,
  Wrench,
  Sprout,
  CreditCard,
  UserCheck,
  AlertOctagon,
  BoxSelect,
  CalendarClock,
} from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { cn } from "../lib/utils";
import { useApi } from "../hooks/useApi";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton, CardSkeleton } from "../components/LoadingSkeleton";
import type { Truck, Task, Stock } from "../types";

interface NotificationItem {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
  date: string;
}

interface ChartPoint {
  name: string;
  sales: number;
  expenses: number;
}

interface Summary {
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  employeesCount: number;
  totalCreances: number;
  topDebiteurs: { nom: string; solde: number }[];
  clientsSeuil: { nom: string; solde: number }[];
  notifications: NotificationItem[];
  chartData: ChartPoint[];
}

interface ActivityItem {
  id: string;
  type: 'SALE' | 'EXPENSE' | 'HARVEST' | 'STOCK';
  title: string;
  amount?: number;
  date: string;
  detail: string;
}

interface MaintenanceAlert {
  id: string;
  title: string;
  status: "En retard" | "Prochainement";
  registration: string;
  date: string;
}

const DEFAULT_SUMMARY: Summary = {
  totalSales: 0,
  totalExpenses: 0,
  netProfit: 0,
  employeesCount: 0,
  totalCreances: 0,
  topDebiteurs: [],
  clientsSeuil: [],
  notifications: [],
  chartData: []
};

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: rawSummary, loading: summaryLoading } = useApi<Summary>({ url: "/api/reports/summary", initialData: DEFAULT_SUMMARY });
  const { data: rawTrucks } = useApi<Truck[]>({ url: "/api/trucks", initialData: [] });
  const { data: rawActivities, loading: activitiesLoading } = useApi<ActivityItem[]>({ url: "/api/reports/activity", initialData: [] });
  const { data: rawStocks } = useApi<Stock[]>({ url: "/api/stocks", initialData: [] });
  const { data: rawTasks } = useApi<Task[]>({ url: "/api/tasks", initialData: [] });

  const summary = rawSummary ?? DEFAULT_SUMMARY;
  const trucks = rawTrucks ?? [];
  const activities = rawActivities ?? [];
  const stocks = rawStocks ?? [];
  const tasks = rawTasks ?? [];

  const maintenanceAlerts = useMemo<MaintenanceAlert[]>(() => {
    if (!trucks) return [];
    const today = new Date();
    return trucks
      .filter((t) => t.nextMaintenance && differenceInDays(parseISO(t.nextMaintenance), today) <= 15)
      .map((t) => ({
        id: t.id,
        title: `${t.brand} ${t.model}`,
        status: parseISO(t.nextMaintenance!) < today ? "En retard" : "Prochainement",
        registration: t.registration,
        date: new Date(t.nextMaintenance!).toLocaleDateString('fr-FR'),
      }));
  }, [trucks]);

  const stockAlerts = useMemo(() => {
    if (!stocks) return [];
    return stocks.filter((s) => s.quantity <= s.minThreshold);
  }, [stocks]);

  const upcomingTasks = useMemo(() => {
    if (!tasks) return [];
    const today = new Date();
    return tasks
      .filter((t) => t.dueDate && t.status !== "COMPLETED" && differenceInDays(parseISO(t.dueDate), today) <= 7)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5);
  }, [tasks]);

  const loading = summaryLoading || activitiesLoading;

  return (
    <div className="space-y-10 pb-10 animate-in fade-in duration-500">
      {/* Global Search & Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Tableau de Bord</h2>
          <p className="text-gray-500 dark:text-slate-400 font-medium">Pilotage stratégique de KOKANSEY SARLU</p>
        </div>
        
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative flex-1 lg:min-w-[320px] xl:min-w-[400px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Rechercher une opération, un employé, un camion..." 
              className="w-full pl-12 pr-4 py-3 md:py-4 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none font-bold text-sm text-gray-900 dark:text-white transition-all"
            />
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white dark:bg-slate-800 px-6 py-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-black text-gray-700 dark:text-slate-200">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
          </div>
        </div>
      </div>

      {/* Top Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: "Ventes du Mois", value: summary.totalSales, icon: TrendingUp, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
          { label: "Dépenses Totales", value: summary.totalExpenses, icon: TrendingDown, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
          { label: "Solde Net", value: summary.netProfit, icon: Wallet, color: "text-primary", bg: "bg-primary/5 dark:bg-primary/20" },
          { label: "Créances Clients", value: summary.totalCreances, icon: CreditCard, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
          { label: "Effectif Personnel", value: summary.employeesCount, icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 p-5 md:p-6 lg:p-8 rounded-2xl md:rounded-[2rem] lg:rounded-[2.5rem] border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-4 rounded-2xl transition-colors duration-300 ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">
                {typeof stat.value === 'number' && stat.label !== "Effectif Personnel"
                  ? `${stat.value.toLocaleString()} FCFA`
                  : stat.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Financial Evolution Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Créances Widget */}
          <div className="bg-white dark:bg-slate-800 p-5 md:p-8 lg:p-10 rounded-2xl md:rounded-[2rem] lg:rounded-[3rem] border border-gray-100 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-amber-600" />
                  Créances Clients
                </h3>
                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-1">Suivi des comptes clients</p>
              </div>
              <button
                onClick={() => navigate('/dashboard/client-accounts')}
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                Voir tout <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top 5 Débiteurs */}
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-6">
                <h4 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  Top 5 Débiteurs
                </h4>
                {summary.topDebiteurs.length === 0 ? (
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 italic">Aucun débiteur</p>
                ) : (
                  <div className="space-y-3">
                    {summary.topDebiteurs.map((debiteur, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-700 dark:text-slate-200">{debiteur.nom}</span>
                        <span className="text-xs font-black text-amber-600">{debiteur.solde.toLocaleString()} FCFA</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Clients en dépassement */}
              <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-6">
                <h4 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-red-600" />
                  Seuil Dépassé (&gt;500k)
                </h4>
                {summary.clientsSeuil.length === 0 ? (
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 italic">Aucun client en dépassement</p>
                ) : (
                  <div className="space-y-3">
                    {summary.clientsSeuil.map((client, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-700 dark:text-slate-200">{client.nom}</span>
                        <span className="text-xs font-black text-red-600">{client.solde.toLocaleString()} FCFA</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

           {/* Quick Action Widget */}
           {/* Quick Action Widget */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                onClick={() => navigate('/dashboard/speculations?view=sales')}
                className="bg-[#1a4d2e] p-6 md:p-8 lg:p-10 rounded-2xl md:rounded-[2rem] lg:rounded-[2.5rem] text-white relative overflow-hidden group cursor-pointer hover:shadow-2xl hover:shadow-primary/20 transition-all"
              >
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <ArrowUpCircle className="w-6 h-6 text-secondary" />
                  </div>
                  <h4 className="text-2xl font-black uppercase tracking-tight mb-2">Nouvelle Vente</h4>
                  <p className="text-white/60 text-sm font-bold leading-relaxed mb-8 max-w-[200px]">Enregistrez rapidement une transaction commerciale.</p>
                  <div className="flex items-center gap-2 text-secondary font-black text-xs uppercase tracking-widest">
                    Accès rapide <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
                <TrendingUp className="absolute -right-12 -bottom-12 w-64 h-64 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
              </div>

              <div 
                onClick={() => navigate('/dashboard/speculations?view=expenses')}
                className="bg-gray-900 p-6 md:p-8 lg:p-10 rounded-2xl md:rounded-[2rem] lg:rounded-[2.5rem] text-white relative overflow-hidden group cursor-pointer hover:shadow-2xl hover:shadow-black/20 transition-all"
              >
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <ArrowDownCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <h4 className="text-2xl font-black uppercase tracking-tight mb-2">Nouvelle Dépense</h4>
                  <p className="text-white/60 text-sm font-bold leading-relaxed mb-8 max-w-[200px]">Saisissez vos charges et factures diverses.</p>
                  <div className="flex items-center gap-2 text-red-400 font-black text-xs uppercase tracking-widest">
                    Accès rapide <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
                <TrendingDown className="absolute -right-12 -bottom-12 w-64 h-64 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
              </div>
           </div>

           <div className="bg-white dark:bg-slate-800 p-5 md:p-8 lg:p-10 rounded-2xl md:rounded-[2rem] lg:rounded-[3rem] border border-gray-100 dark:border-slate-700 shadow-sm min-h-[300px] md:min-h-[400px] lg:min-h-[500px] flex flex-col">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h3 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <Activity className="w-6 h-6 text-primary" />
                    Flux de Trésorerie
                  </h3>
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-1">Évolution des 6 derniers mois</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 dark:bg-primary/20 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-[10px] font-black text-primary uppercase">Ventes</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[10px] font-black text-red-500 uppercase">Dépenses</span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summary.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1a4d2e" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#1a4d2e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-700" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 10, fontWeight: '900'}} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 10, fontWeight: '900'}}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                      contentStyle={{borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px'}}
                      itemStyle={{ fontWeight: '900', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="sales" name="Ventes" stroke="#1a4d2e" strokeWidth={5} fillOpacity={1} fill="url(#colorSales)" />
                    <Area type="monotone" dataKey="expenses" name="Dépenses" stroke="#ef4444" strokeWidth={5} fillOpacity={1} fill="url(#colorExp)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>
        </div>

        {/* Right Sidebar Dashboard Column */}
        <div className="space-y-8">
          {/* Notifications Card */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-gray-100 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h4 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Alertes Maintenance
              </h4>
              {maintenanceAlerts.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                  {maintenanceAlerts.length} ALERTE{maintenanceAlerts.length > 1 ? 'S' : ''}
                </span>
              )}
            </div>
            
            <div className="space-y-4">
              {maintenanceAlerts.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Aucune maintenance prévue</p>
                </div>
              ) : (
                maintenanceAlerts.map((alert, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/50 dark:bg-slate-700/30 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", 
                      alert.status === "En retard" ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400")}>
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h5 className="text-xs font-black text-gray-800 dark:text-white tracking-tight">{alert.title}</h5>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                        {alert.registration} • {alert.date}
                      </p>
                    </div>
                    <div className={cn("text-[8px] font-black px-1.5 py-0.5 rounded uppercase",
                      alert.status === "En retard" ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400")}>
                      {alert.status}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <button 
              onClick={() => navigate('/dashboard/trucks')}
              className="w-full mt-8 py-4 bg-gray-50 dark:bg-slate-700/50 text-gray-400 dark:text-slate-400 hover:bg-primary/5 dark:hover:bg-primary/20 hover:text-primary rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Gérer le parc automobile
            </button>
          </div>

          {/* Stock Alerts */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-gray-100 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h4 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <BoxSelect className="w-4 h-4 text-red-600" />
                Alertes Stock
              </h4>
              {stockAlerts.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                  {stockAlerts.length} ALERTE{stockAlerts.length > 1 ? 'S' : ''}
                </span>
              )}
            </div>
            <div className="space-y-4">
              {stockAlerts.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Aucun stock en alerte</p>
                </div>
              ) : (
                stockAlerts.slice(0, 5).map((stock) => (
                  <div key={stock.id} className="flex items-center gap-4 p-4 rounded-2xl bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group cursor-pointer" onClick={() => navigate('/dashboard/stocks')}>
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h5 className="text-xs font-black text-gray-800 dark:text-white tracking-tight">{stock.name}</h5>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                        {stock.quantity} / {stock.minThreshold} {stock.unit}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => navigate('/dashboard/stocks')}
              className="w-full mt-8 py-4 bg-gray-50 dark:bg-slate-700/50 text-gray-400 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Gérer les stocks
            </button>
          </div>

          {/* Upcoming Tasks */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-gray-100 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h4 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-primary" />
                Tâches à venir
              </h4>
              {upcomingTasks.length > 0 && (
                <span className="bg-primary text-white text-[10px] font-black px-2 py-1 rounded-lg">
                  {upcomingTasks.length}
                </span>
              )}
            </div>
            <div className="space-y-4">
              {upcomingTasks.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Aucune tâche imminente</p>
                </div>
              ) : (
                upcomingTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/50 dark:bg-slate-700/30 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer" onClick={() => navigate('/dashboard/tasks')}>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-black text-gray-800 dark:text-white tracking-tight truncate">{task.title}</h5>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : 'Non planifiée'} • {task.priority}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => navigate('/dashboard/tasks')}
              className="w-full mt-8 py-4 bg-gray-50 dark:bg-slate-700/50 text-gray-400 dark:text-slate-400 hover:bg-primary/5 dark:hover:bg-primary/20 hover:text-primary rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Voir les tâches
            </button>
          </div>

          {/* Recent Operations - Live Activity Timeline */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-gray-100 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h4 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Flux d'Activité
              </h4>
            </div>

            <div className="space-y-6">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-12 w-12 bg-gray-100 dark:bg-slate-700 rounded-2xl mb-4" />
                    <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded-lg w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded-lg w-1/2" />
                  </div>
                ))
              ) : activities.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-400 dark:text-slate-500 font-bold text-sm">Aucune activité récente</p>
                </div>
              ) : (
                activities.slice(0, 5).map((activity, i) => {
                  // Determine icon and colors based on activity type
                  let Icon, bgColor, textColor, prefix;
                  switch (activity.type) {
                    case "SALE":
                      Icon = Package;
                      bgColor = "bg-green-50 dark:bg-green-900/20";
                      textColor = "text-green-600 dark:text-green-400";
                      prefix = "+";
                      break;
                    case "EXPENSE":
                      Icon = Wallet;
                      bgColor = "bg-red-50 dark:bg-red-900/20";
                      textColor = "text-red-600 dark:text-red-400";
                      prefix = "-";
                      break;
                    case "HARVEST":
                      Icon = Sprout;
                      bgColor = "bg-primary/10 dark:bg-primary/30";
                      textColor = "text-primary";
                      prefix = "🌱";
                      break;
                    case "STOCK":
                      Icon = Package;
                      bgColor = "bg-blue-50 dark:bg-blue-900/20";
                      textColor = "text-blue-600 dark:text-blue-400";
                      prefix = activity.title.toLowerCase().includes('+') ? "+" : "-";
                      break;
                    default:
                      Icon = Activity;
                      bgColor = "bg-gray-50 dark:bg-slate-700/50";
                      textColor = "text-gray-600 dark:text-slate-300";
                      prefix = "";
                  }

                  return (
                    <div key={activity.id} className="relative pl-8 group cursor-pointer hover:translate-x-1 transition-all">
                      {/* Timeline dot */}
                      <div className={`absolute left-0 top-4 w-3 h-3 rounded-full ${
                        activity.type === "SALE" ? "bg-green-600" :
                        activity.type === "EXPENSE" ? "bg-red-600" :
                        activity.type === "HARVEST" ? "bg-primary" : "bg-blue-600"
                      }`} />
                      {/* Timeline line */}
                      {i < activities.slice(0, 5).length - 1 && (
                        <div className="absolute left-[5px] top-7 w-0.5 h-12 bg-gray-100 dark:bg-slate-700" />
                      )}

                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${bgColor}`}>
                          <Icon className={`w-5 h-5 ${textColor}`} />
                        </div>
                        <div className="flex-1">
                          <h5 className="text-xs font-black text-gray-800 dark:text-white tracking-tight">{activity.title}</h5>
                          <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                            {new Date(activity.date).toLocaleString('fr-FR')}
                          </p>
                        </div>
                        {activity.amount && (
                          <div className="text-right">
                            <p className={`text-sm font-black tracking-tight ${textColor}`}>
                              {prefix} {activity.amount.toLocaleString()}
                            </p>
                            <p className="text-[8px] font-black text-gray-300 dark:text-slate-600 uppercase tracking-widest">
                              {activity.type === "HARVEST" ? "Kg" : "FCFA"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
