import React, { useState, useEffect, useCallback } from "react";
import { 
  Plus, 
  Package, 
  History, 
  AlertTriangle, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter,
  X,
  ChevronRight,
  TrendingUp,
  Edit,
  Trash2,
  LayoutGrid,
  List,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { fetchWithAuth } from "../lib/api";
import { useDataTable } from "../hooks/useDataTable";
import { cn } from "../lib/utils";
import { STOCK_CATEGORIES } from "../lib/constants";
import { useNotifications } from "../contexts/NotificationContext";

interface StockMovement {
  id: string;
  type: "IN" | "OUT";
  quantity: number;
  date: string;
  reason: string;
  stock: { name: string, unit: string };
}

interface Stock {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minThreshold: number;
  speculation?: { id: string, name: string };
  _count: { movements: number };
  movements: StockMovement[];
}

export default function StockPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user.role || 'GERANT';
  const isAdmin = role === 'ADMIN';
  const isStockManager = role === 'STOCK_MANAGER' || role === 'GERANT' || isAdmin;
  const { addNotification } = useNotifications();

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [allMovements, setAllMovements] = useState<StockMovement[]>([]);
  const [speculations, setSpeculations] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'inventory' | 'movements' | 'alerts'>('inventory');
  const [notifiedStockIds, setNotifiedStockIds] = useState<Set<string>>(new Set());
  
  // DataTable hooks
  const stockTable = useDataTable(stocks);
  const movementTable = useDataTable(allMovements);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [formData, setFormData] = useState({ name: "", category: "Engrais", quantity: "0", unit: "Kg", minThreshold: "5", speculationId: "" });

  const checkStockAlerts = useCallback((stockList: Stock[]) => {
    stockList.forEach(stock => {
      if (stock.quantity <= stock.minThreshold && !notifiedStockIds.has(stock.id)) {
        addNotification(
          "warning",
          `Stock bas: ${stock.name}`,
          `Seulement ${stock.quantity} ${stock.unit} restant(s) (seuil: ${stock.minThreshold})`
        );
        setNotifiedStockIds(prev => new Set(prev).add(stock.id));
      }
    });
  }, [notifiedStockIds, addNotification]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stockRes, specRes, movRes] = await Promise.all([
        fetchWithAuth("/api/stocks"),
        fetchWithAuth("/api/speculations"),
        fetchWithAuth("/api/stocks/movements")
      ]);
      const stockData = await stockRes.json();
      const specData = await specRes.json();
      const movData = await movRes.json();

      const validStocks = Array.isArray(stockData) ? stockData : [];
      setStocks(validStocks);
      setSpeculations(Array.isArray(specData) ? specData : []);
      setAllMovements(Array.isArray(movData) ? movData : []);

      // Check for low stock
      checkStockAlerts(validStocks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateOrUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingStock;
    const endpoint = isEdit ? `/api/stocks/${editingStock.id}` : "/api/stocks";
    try {
      const res = await fetchWithAuth(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify({
          ...formData,
          speculationId: formData.speculationId || null
        })
      });
      if (res.ok) {
        setShowModal(false);
        setEditingStock(null);
        setFormData({ name: "", category: "Engrais", quantity: "0", unit: "Kg", minThreshold: "5", speculationId: "" });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStock = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet article de stock ?")) return;
    try {
      const res = await fetchWithAuth(`/api/stocks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const TableHeader = ({ label, sortKey, table }: { label: string, sortKey?: string, table: any }) => (
    <th 
      className={cn(
        "px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest",
        sortKey && "cursor-pointer hover:text-primary transition-colors"
      )}
      onClick={() => sortKey && table.requestSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        {label}
        {sortKey && table.sortConfig?.key === sortKey && (
          table.sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        )}
      </div>
    </th>
  );

  const SearchBar = ({ table, placeholder }: { table: any, placeholder: string }) => (
    <div className="relative mb-6">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary/20 outline-none font-medium transition-all"
        value={table.search}
        onChange={(e) => table.setSearch(e.target.value)}
      />
    </div>
  );

  const SubNav = () => (
    <div className="flex items-center bg-white p-1 rounded-2xl border border-gray-100 shadow-sm w-fit mb-8">
      {[
        { id: 'inventory', label: 'Inventaire', icon: Package },
        { id: 'movements', label: 'Mouvements', icon: History },
        { id: 'alerts', label: 'Alertes', icon: AlertTriangle },
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight uppercase">Gestion des Stocks</h2>
          <p className="text-gray-500 font-medium italic">Suivi des intrants, matériels et produits finis</p>
        </div>
        {isStockManager && (
          <button 
            onClick={() => { setEditingStock(null); setShowModal(true); }}
            className="bg-primary text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-opacity-90 transition-all font-bold shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            Nouvel Article
          </button>
        )}
      </div>

      <SubNav />

      {currentView === 'inventory' && (
        <div className="animate-in fade-in duration-500">
          <SearchBar table={stockTable} placeholder="Rechercher un article..." />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-20 text-gray-400 italic">Chargement de l'inventaire...</div>
            ) : stockTable.sortedData.map((item: any) => (
              <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-black text-gray-800 uppercase tracking-tight">{item.name}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.category}</p>
                      {item.speculation && (
                        <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">
                          Lié à {item.speculation.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    "p-3 rounded-2xl",
                    item.quantity <= item.minThreshold ? 'bg-red-50 text-red-600' : 'bg-primary/5 text-primary'
                  )}>
                    <Package className="w-6 h-6" />
                  </div>
                </div>

                <div className="flex items-baseline gap-2 mb-6">
                  <span className={cn(
                    "text-4xl font-black",
                    item.quantity <= item.minThreshold ? 'text-red-600' : 'text-gray-900'
                  )}>
                    {item.quantity}
                  </span>
                  <span className="text-sm font-black text-gray-400 uppercase tracking-widest">{item.unit}</span>
                </div>

                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isStockManager && (
                      <button 
                        onClick={() => {
                          setEditingStock(item);
                          setFormData({
                            name: item.name,
                            category: item.category,
                            quantity: item.quantity.toString(),
                            unit: item.unit,
                            minThreshold: item.minThreshold.toString(),
                            speculationId: item.speculation?.id || ""
                          });
                          setShowModal(true);
                        }}
                        className="p-2 bg-gray-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    )}
                    {(isAdmin || isStockManager) && (
                      <button 
                        onClick={() => handleDeleteStock(item.id)}
                        className="p-2 bg-gray-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Seuil d'alerte</p>
                    <p className="text-xs font-black text-gray-600">{item.minThreshold} {item.unit}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentView === 'movements' && (
        <div className="animate-in slide-in-from-bottom-4 duration-300">
          <SearchBar table={movementTable} placeholder="Rechercher un mouvement..." />
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <TableHeader label="Date" sortKey="date" table={movementTable} />
                  <TableHeader label="Article" sortKey="stockId" table={movementTable} />
                  <TableHeader label="Type" sortKey="type" table={movementTable} />
                  <TableHeader label="Quantité" sortKey="quantity" table={movementTable} />
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Raison</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {movementTable.sortedData.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6 text-sm font-bold text-gray-500">{new Date(m.date).toLocaleDateString()}</td>
                    <td className="px-8 py-6 font-black text-gray-800 uppercase tracking-tight">{m.stock.name}</td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        m.type === 'IN' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      )}>
                        {m.type === 'IN' ? 'Entrée' : 'Sortie'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className={cn(
                        "text-lg font-black",
                        m.type === 'IN' ? 'text-green-600' : 'text-red-600'
                      )}>
                        {m.type === 'IN' ? '+' : '-'}{m.quantity} <span className="text-[10px] opacity-40 uppercase">{m.stock.unit}</span>
                      </span>
                    </td>
                    <td className="px-8 py-6 text-xs text-gray-400 italic">{m.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currentView === 'alerts' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
          {stocks.filter(s => s.quantity <= s.minThreshold).length === 0 ? (
            <div className="bg-green-50 p-10 rounded-[2.5rem] text-center">
              <Package className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-black text-green-800 uppercase">Tout est en ordre</h3>
              <p className="text-green-600 font-medium">Aucun article n'est en dessous du seuil d'alerte.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {stocks.filter(s => s.quantity <= s.minThreshold).map(item => (
                <div key={item.id} className="bg-white p-8 rounded-[2.5rem] border-2 border-red-100 shadow-xl shadow-red-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="p-5 bg-red-50 text-red-600 rounded-[2rem]">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">{item.name}</h3>
                      <p className="text-sm font-bold text-red-500 uppercase tracking-widest">STOCK CRITIQUE : {item.quantity} {item.unit}</p>
                      <p className="text-xs text-gray-400 mt-1 font-medium italic">Seuil d'alerte configuré à {item.minThreshold} {item.unit}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-300" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stock Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[80] backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">{editingStock ? "Modifier l'Article" : "Nouvel Article"}</h3>
              <button onClick={() => { setShowModal(false); setEditingStock(null); }} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateStock} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Désignation</label>
                  <input type="text" required placeholder="Ex: Engrais NPK, Noix de Cajou..." className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Catégorie</label>
                    <select className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none font-bold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {["Engrais", "Semences", "Produit Fini", "Matériel", "Autre"].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Unité</label>
                    <input type="text" required placeholder="Ex: Kg, Sac, Litre" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none font-bold" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Stock Initial</label>
                    <input type="number" required className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none font-bold" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Seuil d'alerte</label>
                    <input type="number" required className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none font-bold" value={formData.minThreshold} onChange={e => setFormData({...formData, minThreshold: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Lier à une Spéculation (Produit fini)</label>
                  <select className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none font-bold" value={formData.speculationId} onChange={e => setFormData({...formData, speculationId: e.target.value})}>
                    <option value="">Aucune liaison (Consommable)</option>
                    {speculations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-xl shadow-primary/20">
                {editingStock ? "Mettre à jour" : "Enregistrer l'Article"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
