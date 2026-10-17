import React, { useState, useEffect } from "react";
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  PieChart as PieChartIcon, 
  BarChart3, 
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
  Download,
  LayoutDashboard,
  TableProperties,
  History
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { fetchWithAuth, downloadWithAuth } from "../lib/api";

interface Account {
  id: string;
  name: string;
  category: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  roi: number;
  expenseBreakdown: Record<string, number>;
  salesCount: number;
  expensesCount: number;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'synthesis' | 'units' | 'journal'>('synthesis');
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString();
    fetchWithAuth(`/api/accounts${query ? `?${query}` : ''}`)
      .then((res) => res.json())
      .then((data) => {
        setAccounts(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [startDate, endDate]);

  const handleExport = () => {
    downloadWithAuth('/api/export/csv?type=sales', 'ventes.csv').catch(() => {
      alert('Erreur lors du téléchargement de l\'export');
    });
  };

  const COLORS = ['#1a4d2e', '#e8c872', '#ef4444', '#3b82f6', '#8b5cf6', '#f59e0b'];

  const globalStats = accounts.reduce((acc, curr) => ({
    revenue: acc.revenue + curr.totalRevenue,
    expenses: acc.expenses + curr.totalExpenses,
    profit: acc.profit + curr.netProfit
  }), { revenue: 0, expenses: 0, profit: 0 });

  const SubNav = () => (
    <div className="flex items-center bg-white p-1 rounded-2xl border border-gray-100 shadow-sm w-fit mb-8">
      {[
        { id: 'synthesis', label: 'Synthèse Financière', icon: LayoutDashboard },
        { id: 'units', label: 'Unités de Production', icon: TableProperties },
        { id: 'journal', label: 'Journal Analytique', icon: History },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setCurrentView(tab.id as any)}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-tight transition-all ${
            currentView === tab.id 
              ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          }`}
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      {/* Header & Global Stats */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Comptes d'Exploitation</h2>
          <p className="text-gray-500 font-bold">Analyse chirurgicale de la performance par spéculation</p>
        </div>

        <div className="flex gap-4 w-full lg:w-auto">
          <button 
            onClick={handleExport}
            className="bg-white text-gray-700 px-6 py-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-2 hover:bg-gray-50 transition-all font-bold text-sm"
          >
            <Download className="w-4 h-4 text-primary" />
            Exporter Bilan
          </button>
          <div className="bg-primary text-white p-6 rounded-3xl shadow-xl shadow-primary/20 flex-1 lg:flex-none lg:min-w-[240px]">
            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Bénéfice Net Global</p>
            <h3 className="text-2xl font-black">{globalStats.profit.toLocaleString()} <span className="text-xs opacity-50">FCFA</span></h3>
          </div>
        </div>
      </div>

      <SubNav />

      {/* Filtre par période */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4 animate-in fade-in duration-500">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Période :</span>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Du</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-3 bg-gray-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Au</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-3 bg-gray-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(""); setEndDate(""); }}
            className="px-4 py-3 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
          >
            Réinitialiser
          </button>
        )}
        {(startDate || endDate) && (
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/5 px-4 py-2 rounded-full">
            Données filtrées
          </span>
        )}
      </div>

      {currentView === 'synthesis' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3">
              <BarChart3 className="text-primary w-6 h-6" />
              Comparaison Revenus / Charges
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accounts}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{fill: '#f9fafb'}}
                    contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="totalRevenue" name="Revenus" fill="#1a4d2e" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="totalExpenses" name="Charges" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3">
              <PieChartIcon className="text-secondary w-6 h-6" />
              Répartition de la Marge (ROI)
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={accounts.filter(a => a.netProfit > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="netProfit"
                  >
                    {accounts.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {currentView === 'units' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Performance par Unité</h3>
            <span className="bg-white px-4 py-2 rounded-full border border-gray-200 text-xs font-black text-gray-400">
              {accounts.length} UNITÉS ACTIVES
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Spéculation</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Performance</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Rentabilité (ROI)</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Statut</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-bold italic animate-pulse">Calcul des comptes...</td></tr>
                ) : accounts.length === 0 ? (
                  <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-bold italic">Aucune donnée disponible</td></tr>
                ) : accounts.map((acc) => (
                  <React.Fragment key={acc.id}>
                    <tr 
                      onClick={() => setExpandedId(expandedId === acc.id ? null : acc.id)}
                      className={`hover:bg-gray-50/80 transition-all cursor-pointer group ${expandedId === acc.id ? 'bg-gray-50' : ''}`}
                    >
                      <td className="px-8 py-6">
                        <div className="font-black text-gray-800 uppercase text-lg">{acc.name}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{acc.category}</div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="text-sm font-black text-green-600">+{acc.totalRevenue.toLocaleString()} FCFA</div>
                        <div className="text-xs font-bold text-red-400">-{acc.totalExpenses.toLocaleString()} FCFA</div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className={`text-2xl font-black ${acc.netProfit >= 0 ? "text-primary" : "text-red-600"}`}>
                          {(acc.roi * 100).toFixed(1)}%
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Marge nette</div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          acc.roi > 0.2 ? 'bg-green-100 text-green-700' : acc.roi > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {acc.roi > 0.2 ? 'Excellente' : acc.roi > 0 ? 'Rentable' : 'Déficitaire'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {expandedId === acc.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </td>
                    </tr>
                    
                    {/* Expanded Breakdown */}
                    {expandedId === acc.id && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={5} className="px-12 py-8 animate-in slide-in-from-top-4 duration-300">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Info className="w-3 h-3" /> Répartition des charges
                              </h4>
                              <div className="space-y-3">
                                {Object.entries(acc.expenseBreakdown).length > 0 ? (
                                  Object.entries(acc.expenseBreakdown).map(([cat, amt]) => (
                                    <div key={cat} className="flex justify-between items-end border-b border-gray-200/50 pb-1">
                                      <span className="text-xs font-bold text-gray-600">{cat}</span>
                                      <span className="text-sm font-black text-gray-800">{amt.toLocaleString()} <span className="text-[10px] opacity-40">FCFA</span></span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs font-bold text-gray-400 italic">Aucune dépense enregistrée</p>
                                )}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Flux d'activité</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                  <p className="text-[10px] font-black text-gray-400 uppercase">Ventes</p>
                                  <p className="text-lg font-black text-gray-800">{acc.salesCount}</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                  <p className="text-[10px] font-black text-gray-400 uppercase">Dépenses</p>
                                  <p className="text-lg font-black text-gray-800">{acc.expensesCount}</p>
                                </div>
                              </div>
                            </div>

                            <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex flex-col justify-between">
                              <div>
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Analyse Résumée</h4>
                                <p className="text-xs font-bold text-gray-600 leading-relaxed">
                                  {acc.roi > 0 
                                    ? `L'unité ${acc.name} génère un profit net de ${acc.netProfit.toLocaleString()} FCFA. Pour chaque FCFA investi, vous récupérez ${(1 + acc.roi).toFixed(2)} FCFA.`
                                    : `L'unité ${acc.name} est actuellement en perte de ${Math.abs(acc.netProfit).toLocaleString()} FCFA. Une analyse des charges est recommandée.`
                                  }
                                </p>
                              </div>
                              <button className="mt-4 text-[10px] font-black text-primary uppercase flex items-center gap-2 hover:gap-3 transition-all">
                                Voir le journal détaillé <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currentView === 'journal' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500 p-8 text-center text-gray-400 italic font-bold">
          <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
          Journal analytique détaillé en cours de génération...
          <p className="text-xs font-medium mt-2">Utilisez la section "Opérations" pour consulter tous les flux financiers en temps réel.</p>
        </div>
      )}
    </div>
  );
}
