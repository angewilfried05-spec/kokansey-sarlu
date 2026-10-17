import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Filter, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  X, 
  Calendar as CalendarIcon, 
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Eye,
  Download,
  Wallet,
  History,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp
} from "lucide-react";
import { subDays, startOfDay, endOfDay, isWithinInterval, parseISO, format } from "date-fns";
import { fr } from "date-fns/locale";
import { fetchWithAuth, downloadWithAuth } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useDataTable } from "../hooks/useDataTable";
import { cn } from "../lib/utils";

interface Operation {
  id: string;
  date: string;
  type: 'sale' | 'expense' | 'stock';
  product?: string;
  category?: string;
  amount?: number;
  totalPrice?: number;
  quantity?: number;
  unit?: string;
  client?: string;
  supplier?: string;
  observation?: string;
  speculation?: { name: string };
  stockType?: 'IN' | 'OUT';
  reason?: string;
}

import { useToast } from "../contexts/ToastContext";
import { useConfirm } from "../contexts/ConfirmContext";
export default function OperationsPage() {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user.role || 'GERANT';
  const isAdmin = role === 'ADMIN';
  const isGerant = role === 'GERANT' || isAdmin;
  const isCommercial = role === 'COMMERCIAL';
  const isStockManager = role === 'STOCK_MANAGER';

  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'expense' | 'stock'>('all');
  const [previewOp, setPreviewOp] = useState<Operation | null>(null);
  const [editingOp, setEditingOp] = useState<Operation | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentView, setCurrentView] = useState<'cashflow' | 'journal' | 'monthly'>('cashflow');
  
  const [editFormData, setEditFormData] = useState<any>({});

  const handleEdit = (op: Operation) => {
    setEditingOp(op);
    setEditFormData({
      ...op,
      date: op.date.split('T')[0],
      amount: op.amount || op.totalPrice // Unified amount field for simplicity in form
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOp) return;

    let endpoint = "";
    if (editingOp.type === 'sale') endpoint = `/api/sales/${editingOp.id}`;
    else if (editingOp.type === 'expense') endpoint = `/api/expenses/${editingOp.id}`;
    
    if (!endpoint) return;

    try {
      const res = await fetchWithAuth(endpoint, {
        method: 'PUT',
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        setShowEditModal(false);
        setEditingOp(null);
        fetchData();
      }
    } catch (err) {
      console.error("Update failed", err);
    }
  };
  
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const requests = [];
      if (isGerant || isCommercial) requests.push(fetchWithAuth("/api/sales"));
      if (isGerant) requests.push(fetchWithAuth("/api/expenses"));
      if (isStockManager || isGerant) requests.push(fetchWithAuth("/api/stocks/movements"));

      const responses = await Promise.all(requests);
      const data = await Promise.all(responses.map(r => r.json()));
      
      let combined: any[] = [];
      let index = 0;
      
      if (isGerant || isCommercial) {
        combined = [...combined, ...data[index++].map((s: any) => ({ ...s, type: 'sale' }))];
      }
      if (isGerant) {
        combined = [...combined, ...data[index++].map((e: any) => ({ ...e, type: 'expense' }))];
      }
      if (isStockManager || isGerant) {
        combined = [...combined, ...data[index++].map((m: any) => ({ 
          ...m, 
          type: 'stock', 
          product: m.stock?.name,
          amount: m.type === 'IN' ? m.quantity : -m.quantity, // Just for display
          totalPrice: 0 // Stock movements don't have price here
        }))];
      }
      
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setOperations(combined);
    } catch (err) {
      console.error("Failed to fetch operations", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (op: Operation) => {
    if (!(await confirmDialog("Êtes-vous sûr de vouloir supprimer cette opération ?"))) return;

    let endpoint = "";
    if (op.type === 'sale') endpoint = `/api/sales/${op.id}`;
    else if (op.type === 'expense') endpoint = `/api/expenses/${op.id}`;
    else if (op.type === 'stock') endpoint = `/api/stocks/movements/${op.id}`; // This endpoint might not exist, need to check

    if (!endpoint) return;

    try {
      const res = await fetchWithAuth(endpoint, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.message || "Erreur lors de la suppression");
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const dateFilteredOps = useMemo(() => {
    return operations.filter(op => {
      const opDate = parseISO(op.date);
      return isWithinInterval(opDate, {
        start: startOfDay(parseISO(dateRange.start)),
        end: endOfDay(parseISO(dateRange.end))
      });
    });
  }, [operations, dateRange]);

  const typeFilteredOps = useMemo(() => {
    if (filterType === 'all') return dateFilteredOps;
    return dateFilteredOps.filter(op => op.type === filterType);
  }, [dateFilteredOps, filterType]);

  const monthlyData = useMemo(() => {
    const months: Record<string, { name: string, sales: number, expenses: number }> = {};
    
    // Group by month for the last 12 months or all operations
    operations.forEach(op => {
      const date = parseISO(op.date);
      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMM yy', { locale: fr });
      
      if (!months[monthKey]) {
        months[monthKey] = { name: monthLabel, sales: 0, expenses: 0 };
      }
      
      if (op.type === 'sale') {
        months[monthKey].sales += (op.totalPrice || 0);
      } else if (op.type === 'expense') {
        months[monthKey].expenses += (op.amount || 0);
      }
    });
    
    return Object.values(months).sort((a, b) => {
      const dateA = new Date(a.name.split(' ').reverse().join(' '));
      const dateB = new Date(b.name.split(' ').reverse().join(' '));
      return dateA.getTime() - dateB.getTime();
    }).slice(-6); // Last 6 months
  }, [operations]);

  const table = useDataTable(typeFilteredOps);

  const handleExport = () => {
    const type = filterType === 'all' ? 'sales' : filterType + 's';
    downloadWithAuth(`/api/export/csv?type=${type}&startDate=${dateRange.start}&endDate=${dateRange.end}`, `${type}.csv`).catch(() => {
      toast.error('Erreur lors du téléchargement de l\'export');
    });
  };

  const totalIn = dateFilteredOps
    .filter(op => op.type === 'sale')
    .reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);

  const totalOut = dateFilteredOps
    .filter(op => op.type === 'expense')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const TableHeader = ({ label, sortKey }: { label: string, sortKey?: string }) => (
    <th 
      className={cn(
        "px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400",
        sortKey && "cursor-pointer hover:text-primary transition-colors"
      )}
      onClick={() => sortKey && table.requestSort(sortKey as any)}
    >
      <div className="flex items-center gap-2">
        {label}
        {sortKey && table.sortConfig?.key === sortKey && (
          table.sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        )}
      </div>
    </th>
  );

  const SubNav = () => (
    <div className="flex items-center bg-white p-1 rounded-2xl border border-gray-100 shadow-sm w-fit mb-8">
      {[
        { id: 'cashflow', label: 'Flux de Trésorerie', icon: Wallet },
        { id: 'journal', label: 'Journal Global', icon: History },
        { id: 'monthly', label: 'Analyse Mensuelle', icon: BarChart3 },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setCurrentView(tab.id as any)}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black tracking-tight transition-all ${
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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Opérations</h2>
          <p className="text-gray-500 font-medium">Gestion centralisée des flux financiers</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           <button 
              onClick={handleExport}
              className="bg-white text-gray-700 px-4 py-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2 hover:bg-gray-50 transition-all font-bold text-sm"
           >
              <Download className="w-4 h-4 text-primary" />
              Exporter (CSV)
           </button>
           <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
              <CalendarIcon className="w-4 h-4 text-primary ml-2" />
              <input 
                type="date" 
                className="text-sm font-bold text-gray-700 outline-none p-1"
                value={dateRange.start}
                onChange={e => setDateRange({...dateRange, start: e.target.value})}
              />
              <span className="text-gray-300 font-black px-1">→</span>
              <input 
                type="date" 
                className="text-sm font-bold text-gray-700 outline-none p-1"
                value={dateRange.end}
                onChange={e => setDateRange({...dateRange, end: e.target.value})}
              />
           </div>
        </div>
      </div>

      <SubNav />

      {currentView === 'cashflow' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2">Entrées de fonds</p>
                <h3 className="text-3xl font-black text-green-600">+{totalIn.toLocaleString()} <span className="text-sm font-bold">FCFA</span></h3>
              </div>
              <ArrowUpCircle className="absolute -right-4 -bottom-4 w-24 h-24 text-green-50 group-hover:scale-110 transition-transform duration-500" />
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2">Sorties de fonds</p>
                <h3 className="text-3xl font-black text-red-500">-{totalOut.toLocaleString()} <span className="text-sm font-bold">FCFA</span></h3>
              </div>
              <ArrowDownCircle className="absolute -right-4 -bottom-4 w-24 h-24 text-red-50 group-hover:scale-110 transition-transform duration-500" />
            </div>

            <div className={`p-8 rounded-3xl shadow-xl relative overflow-hidden group transition-colors duration-500 ${totalIn - totalOut >= 0 ? "bg-primary text-white" : "bg-red-600 text-white"}`}>
              <div className="relative z-10">
                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-2">Solde de Trésorerie</p>
                <h3 className="text-3xl font-black">{(totalIn - totalOut).toLocaleString()} <span className="text-sm font-bold opacity-60">FCFA</span></h3>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm min-h-[400px]">
            <h4 className="font-black text-gray-800 tracking-tight mb-8">Performance Journalière sur la période</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dateFilteredOps.slice(0, 15).reverse()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), 'dd/MM')} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 'bold'}} />
                  <Tooltip />
                  <Bar dataKey={op => op.type === 'sale' ? op.totalPrice : op.amount}>
                    {dateFilteredOps.slice(0, 15).reverse().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.type === 'sale' ? '#1a4d2e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {currentView === 'journal' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-6 border-b border-gray-50 flex flex-col lg:flex-row justify-between gap-4 bg-gray-50/30">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Rechercher une transaction..." 
                className="w-full pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-bold text-sm shadow-sm"
                value={table.search}
                onChange={e => table.setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 p-1 bg-white border border-gray-200 rounded-2xl shadow-sm">
              {[
                { id: 'all', label: 'Toutes', allowed: true },
                { id: 'sale', label: 'Ventes', allowed: isGerant || isCommercial },
                { id: 'expense', label: 'Dépenses', allowed: isGerant },
                { id: 'stock', label: 'Stocks', allowed: isGerant || isStockManager }
              ].filter(t => t.allowed).map(type => (
                <button
                  key={type.id}
                  onClick={() => setFilterType(type.id as any)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${
                    filterType === type.id 
                      ? "bg-gray-900 text-white shadow-lg" 
                      : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <TableHeader label="Date & Heure" sortKey="date" />
                  <TableHeader label="Flux" sortKey="type" />
                  <TableHeader label="Désignation" sortKey="product" />
                  <TableHeader label="Montant" sortKey="amount" />
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={5} className="px-8 py-10 text-center text-gray-400 italic">Chargement...</td></tr>
                ) : table.sortedData.length === 0 ? (
                  <tr><td colSpan={5} className="px-8 py-10 text-center text-gray-400 italic">Aucune opération trouvée</td></tr>
                ) : table.sortedData.map((op: any) => (
                  <tr 
                    key={op.id} 
                    onDoubleClick={() => setPreviewOp(op)}
                    className="hover:bg-gray-50/50 transition-all cursor-pointer group"
                  >
                    <td className="px-8 py-6">
                      <div className="text-sm font-black text-gray-700">{format(parseISO(op.date), 'dd MMM yyyy', { locale: fr })}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase">{format(parseISO(op.date), 'HH:mm')}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        op.type === 'sale' ? 'bg-green-100 text-green-700' : 
                        op.type === 'expense' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {op.type === 'sale' ? <ArrowUpRight className="w-3 h-3" /> : 
                         op.type === 'expense' ? <ArrowDownRight className="w-3 h-3" /> :
                         <History className="w-3 h-3" />}
                        {op.type === 'sale' ? 'Encaissement' : 
                         op.type === 'expense' ? 'Décaissement' :
                         'Mouvement Stock'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-black text-gray-800 tracking-tight">
                        {op.type === 'sale' ? op.product : 
                         op.type === 'expense' ? op.category :
                         op.product}
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
                        <span className="text-primary">{op.speculation?.name}</span>
                        {op.client && <span>• {op.client}</span>}
                        {op.supplier && <span>• {op.supplier}</span>}
                        {op.reason && <span>• {op.reason}</span>}
                      </div>
                    </td>
                    <td className={`px-8 py-6 text-right font-black text-lg ${
                      op.type === 'sale' ? 'text-green-600' : 
                      op.type === 'expense' ? 'text-red-500' :
                      (op.amount && op.amount > 0 ? 'text-green-500' : 'text-red-400')
                    }`}>
                      {op.type === 'stock' ? (op.amount && op.amount > 0 ? '+' : '') : (op.type === 'sale' ? '+' : '-')}
                      {op.type === 'stock' ? Math.abs(op.amount || 0).toLocaleString() : (op.type === 'sale' ? op.totalPrice : op.amount)?.toLocaleString()}
                      <span className="text-[10px] ml-1 opacity-50">{op.type === 'stock' ? op.unit : 'FCFA'}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setPreviewOp(op)} className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"><Eye className="w-4 h-4" /></button>
                        {isGerant && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleEdit(op); }} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors"><Edit className="w-4 h-4" /></button>
                            {isAdmin && <button onClick={(e) => { e.stopPropagation(); handleDelete(op); }} className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currentView === 'monthly' && (
        <div className="space-y-8 animate-in zoom-in-95 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h4 className="font-black text-gray-800 tracking-tight">Comparatif Mensuel</h4>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Ventes vs Dépenses</p>
                </div>
                <BarChart3 className="w-8 h-8 text-primary/20" />
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 'bold'}} />
                    <YAxis tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 'bold'}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey="sales" name="Ventes" fill="#1a4d2e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center text-center space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto">
                <TrendingUp className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Analyse de Rentabilité</h3>
                <p className="text-gray-400 font-medium max-w-sm mx-auto mt-2">
                  Vos revenus mensuels moyens sont de <span className="text-primary font-black">
                    {(monthlyData.reduce((acc, curr) => acc + curr.sales, 0) / (monthlyData.length || 1)).toLocaleString()} FCFA
                  </span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="bg-gray-50 p-6 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mois le plus profitable</p>
                  <p className="text-lg font-black text-gray-800">
                    {monthlyData.length > 0 ? monthlyData.reduce((prev, curr) => (curr.sales - curr.expenses > prev.sales - prev.expenses) ? curr : prev).name : 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ratio Dépenses/Ventes</p>
                  <p className="text-lg font-black text-gray-800">
                    {monthlyData.length > 0 
                      ? ((monthlyData.reduce((acc, curr) => acc + curr.expenses, 0) / monthlyData.reduce((acc, curr) => acc + (curr.sales || 1), 0)) * 100).toFixed(1) 
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewOp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className={`p-10 text-white relative overflow-hidden ${
              previewOp.type === 'sale' ? 'bg-green-600' : 
              previewOp.type === 'expense' ? 'bg-red-600' : 
              'bg-blue-600'
            }`}>
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Fiche d'opération</p>
                  <h3 className="text-4xl font-black tracking-tighter leading-none">
                    {previewOp.type === 'sale' ? 'Vente' : 
                     previewOp.type === 'expense' ? 'Dépense' : 
                     'Mouvement Stock'}
                  </h3>
                  <p className="text-white/80 mt-4 font-bold text-lg">
                    {format(parseISO(previewOp.date), 'EEEE dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
                <button 
                  onClick={() => setPreviewOp(null)} 
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors backdrop-blur-md border border-white/10"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-10">
                {previewOp.type === 'sale' ? <ArrowUpCircle className="w-64 h-64" /> : 
                 previewOp.type === 'expense' ? <ArrowDownCircle className="w-64 h-64" /> : 
                 <History className="w-64 h-64" />}
              </div>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 space-y-6">
                <div className="flex justify-between items-center group">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Spéculation</span>
                  <span className="font-black text-gray-800 tracking-tight">{previewOp.speculation?.name || 'N/A'}</span>
                </div>
                <div className="h-px bg-gray-200/50" />
                
                {previewOp.type === 'sale' ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Désignation</span>
                      <span className="font-black text-gray-800">{previewOp.product}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Volume</span>
                      <span className="font-black text-gray-800">{previewOp.quantity} {previewOp.unit}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Tiers</span>
                      <span className="font-black text-primary">{previewOp.client || 'Client Inconnu'}</span>
                    </div>
                  </>
                ) : previewOp.type === 'expense' ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Catégorie</span>
                      <span className="font-black text-gray-800">{previewOp.category}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Tiers</span>
                      <span className="font-black text-red-600">{previewOp.supplier || 'Fournisseur Inconnu'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Article</span>
                      <span className="font-black text-gray-800">{previewOp.product}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Raison</span>
                      <span className="font-black text-blue-600">{previewOp.reason || 'N/A'}</span>
                    </div>
                  </>
                )}
                
                <div className="h-px bg-gray-200/50" />
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    {previewOp.type === 'stock' ? 'Quantité' : 'Total Net'}
                  </span>
                  <span className={`text-3xl font-black ${
                    previewOp.type === 'sale' ? 'text-green-600' : 
                    previewOp.type === 'expense' ? 'text-red-600' :
                    (previewOp.amount && previewOp.amount > 0 ? 'text-green-500' : 'text-red-400')
                  }`}>
                    {previewOp.type === 'stock' ? (previewOp.amount && previewOp.amount > 0 ? '+' : '') : (previewOp.type === 'sale' ? '+' : '-')}
                    {previewOp.type === 'stock' ? Math.abs(previewOp.amount || 0).toLocaleString() : (previewOp.type === 'sale' ? previewOp.totalPrice : previewOp.amount)?.toLocaleString()}
                    <span className="text-xs ml-1 font-bold opacity-40">{previewOp.type === 'stock' ? previewOp.unit : 'FCFA'}</span>
                  </span>
                </div>
              </div>

              {previewOp.observation && (
                <div className="px-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Note interne</p>
                  <div className="bg-amber-50 text-amber-900 p-6 rounded-3xl text-sm font-bold italic border-l-8 border-amber-400 shadow-sm leading-relaxed">
                    "{previewOp.observation}"
                  </div>
                </div>
              )}

              <button 
                onClick={() => setPreviewOp(null)}
                className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95"
              >
                Fermer la fiche
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {showEditModal && editingOp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-black tracking-tight text-gray-800">Modifier l'Opération</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdate} className="p-8 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date</label>
                <input 
                  type="date" 
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                  value={editFormData.date}
                  onChange={e => setEditFormData({...editFormData, date: e.target.value})}
                  required
                />
              </div>

              {editingOp.type === 'sale' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Produit</label>
                    <input 
                      type="text" 
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                      value={editFormData.product}
                      onChange={e => setEditFormData({...editFormData, product: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantité</label>
                      <input 
                        type="number" 
                        className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        value={editFormData.quantity}
                        onChange={e => setEditFormData({...editFormData, quantity: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Prix Unitaire</label>
                      <input 
                        type="number" 
                        className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        value={editFormData.unitPrice}
                        onChange={e => setEditFormData({...editFormData, unitPrice: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Catégorie</label>
                    <input 
                      type="text" 
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                      value={editFormData.category}
                      onChange={e => setEditFormData({...editFormData, category: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Montant</label>
                    <input 
                      type="number" 
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                      value={editFormData.amount}
                      onChange={e => setEditFormData({...editFormData, amount: e.target.value})}
                      required
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Observation</label>
                <textarea 
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                  value={editFormData.observation || ''}
                  onChange={e => setEditFormData({...editFormData, observation: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black tracking-widest hover:bg-gray-200 transition-all"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-primary text-white rounded-2xl font-black tracking-widest hover:shadow-xl hover:shadow-primary/20 transition-all"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
