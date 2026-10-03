import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Plus, History, ShoppingCart, CreditCard, ChevronRight, X, Search, Filter, ArrowUpRight, ArrowDownRight, TrendingUp, Edit, Trash2, Sprout, BarChart3, PieChart as PieChartIcon, FileText, ChevronUp, ChevronDown, Download } from "lucide-react";
import { fetchWithAuth } from "../lib/api";
import { exportToExcel, exportToPDF, type ExportColumn } from "../lib/export";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { SPECULATION_CATEGORIES, SPECULATIONS_BY_CATEGORY } from "../lib/constants";
import { useDataTable } from "../hooks/useDataTable";
import { useApi } from "../hooks/useApi";
import { cn } from "../lib/utils";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import Toast, { ToastType } from "../components/Toast";
import { TableSkeleton, CardSkeleton } from "../components/LoadingSkeleton";
import type { Campagne, Client, DataTable, Expense, Harvest, Sale, Speculation, View } from "../types";

export default function SpeculationsPage() {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user.role || 'GERANT';
  const isAdmin = role === 'ADMIN';
  const isGerant = role === 'GERANT' || isAdmin;

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [currentView, setCurrentView] = useState<View>('cultures');
  const [selectedCampagne, setSelectedCampagne] = useState<string>('');

  const speculationsApi = useApi<Speculation[]>({ url: "/api/speculations", initialData: [] });
  const harvestsApi = useApi<Harvest[]>({ url: "/api/harvests", initialData: [] });
  const salesApi = useApi<Sale[]>({ url: "/api/sales", initialData: [] });
  const expensesApi = useApi<Expense[]>({ url: "/api/expenses", initialData: [] });
  const clientsApi = useApi<Client[]>({ url: "/api/clients?actif=true", initialData: [] });
  const campagnesApi = useApi<Campagne[]>({ url: "/api/campagnes", initialData: [] });

  const loading = useMemo(
    () => [speculationsApi, harvestsApi, salesApi, expensesApi, clientsApi, campagnesApi].some((api) => api.loading),
    [speculationsApi.loading, harvestsApi.loading, salesApi.loading, expensesApi.loading, clientsApi.loading, campagnesApi.loading]
  );

  const refetchAll = useCallback(async () => {
    await Promise.all([
      speculationsApi.refetch(),
      harvestsApi.refetch(),
      salesApi.refetch(),
      expensesApi.refetch(),
      clientsApi.refetch(),
      campagnesApi.refetch(),
    ]);
  }, [speculationsApi.refetch, harvestsApi.refetch, salesApi.refetch, expensesApi.refetch, clientsApi.refetch, campagnesApi.refetch]);

  const speculations = speculationsApi.data ?? [];
  const allHarvests = harvestsApi.data ?? [];
  const allSales = salesApi.data ?? [];
  const allExpenses = expensesApi.data ?? [];
  const clientsActifs = clientsApi.data ?? [];
  const campagnes = campagnesApi.data ?? [];

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };
  
  // DataTable hooks
  const specTable = useDataTable(speculations);
  const harvestTable = useDataTable(allHarvests);
  const salesTable = useDataTable(allSales);
  const expensesTable = useDataTable(allExpenses);

  const specColumns: ExportColumn<Speculation>[] = [
    { label: "Spéculation", value: (s) => s.name },
    { label: "Catégorie", value: (s) => s.category },
    { label: "Taille (Ha)", value: (s) => (s.areaSize === null ? "-" : s.areaSize) },
    { label: "Status", value: (s) => s.status },
  ];

  const harvestColumns: ExportColumn<Harvest>[] = [
    { label: "Date", value: (h) => new Date(h.date).toLocaleDateString() },
    { label: "Culture", value: (h) => h.speculation.name },
    { label: "Quantité", value: (h) => `${h.quantity} ${h.unit}` },
    { label: "Qualité", value: (h) => h.quality || "N/A" },
    { label: "Observation", value: (h) => h.observation || "-" },
  ];

  const saleColumns: ExportColumn<Sale>[] = [
    { label: "Date", value: (s) => new Date(s.date).toLocaleDateString() },
    { label: "Produit", value: (s) => s.speculation.name },
    { label: "Quantité", value: (s) => `${s.quantity} ${s.unit}` },
    { label: "Client", value: (s) => s.client || s.clientCompte?.nom || "-" },
    { label: "Total (FCFA)", value: (s) => s.totalPrice.toLocaleString() },
  ];

  const expenseColumns: ExportColumn<Expense>[] = [
    { label: "Date", value: (e) => new Date(e.date).toLocaleDateString() },
    { label: "Culture", value: (e) => e.speculation?.name || "Générale" },
    { label: "Nature", value: (e) => e.category },
    { label: "Montant (FCFA)", value: (e) => e.amount.toLocaleString() },
    { label: "Note", value: (e) => e.observation || "-" },
  ];

  function ExportButtons<T>({
    data,
    columns,
    filename,
    title,
  }: {
    data: T[];
    columns: ExportColumn<T>[];
    filename: string;
    title: string;
  }) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => exportToExcel(data, columns, filename)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-600 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-all"
        >
          <Download className="w-4 h-4" /> Excel
        </button>
        <button
          onClick={() => exportToPDF(data, columns, filename, title)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all"
        >
          <FileText className="w-4 h-4" /> PDF
        </button>
      </div>
    );
  }

  // Modal states
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Speculation | null>(null);
  const [specFormData, setSpecFormData] = useState({ name: "", category: "Cultures Industrielles", areaSize: "" });
  const [showCustomSpecInput, setShowCustomSpecInput] = useState(false);

  // Sale Modal states
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [typeClientVente, setTypeClientVente] = useState<'regulier' | 'occasionnel'>('occasionnel');
  const initialSaleForm = {
    speculationId: "",
    product: "",
    quantity: "",
    unit: "KG",
    unitPrice: "",
    date: new Date().toISOString().split('T')[0],
    client: "",
    clientId: "",
    observation: "",
    campagneId: ""
  };
  const [saleFormData, setSaleFormData] = useState(initialSaleForm);

  // Rafraîchir la liste des clients à chaque ouverture du modal de vente
  useEffect(() => {
    if (showSaleModal) {
      clientsApi.refetch();
    }
  }, [showSaleModal]);

  // Encaissement Modal states
  const [showEncaissementModal, setShowEncaissementModal] = useState(false);
  const [encaissementData, setEncaissementData] = useState({
    saleId: "",
    clientId: "",
    montant: "",
    modePaiement: "espece",
    reference: "",
    date: new Date().toISOString().split('T')[0]
  });

  // Expense Modal states
  const [showExpModal, setShowExpModal] = useState(false);
  const [expFormData, setExpFormData] = useState({
    speculationId: "",
    type: "Achat",
    category: "Intrants",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    supplier: "",
    observation: ""
  });

  // Harvest Modal states
  const [showHarvModal, setShowHarvModal] = useState(false);
  const [harvFormData, setHarvFormData] = useState({
    speculationId: "",
    quantity: "",
    unit: "KG",
    date: new Date().toISOString().split('T')[0],
    quality: "Standard",
    observation: "",
    campagneId: ""
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    if (view === 'sales') {
      setCurrentView('sales');
      setShowSaleModal(true);
    } else if (view === 'expenses') {
      setCurrentView('expenses');
      setShowExpModal(true);
    }
  }, [location]);

  const handleCreateOrUpdateSpec = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingSpec;
    const endpoint = isEdit ? `/api/speculations/${editingSpec.id}` : "/api/speculations";
    try {
      const res = await fetchWithAuth(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(specFormData)
      });
      if (res.ok) {
        setShowSpecModal(false);
        setEditingSpec(null);
        setSpecFormData({ name: "", category: "Cultures Industrielles", areaSize: "" });
        setShowCustomSpecInput(false);
        await refetchAll();
        showToast(isEdit ? "Culture modifiée avec succès !" : "Culture créée avec succès !", 'success');
      } else {
        const errorData = await res.json();
        showToast("Erreur: " + (errorData.error || "Échec de l'enregistrement"), 'error');
        console.error("Erreur culture:", errorData);
      }
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'enregistrement", 'error');
    }
  };

  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeClientVente === 'regulier' && !saleFormData.clientId) {
      showToast("Veuillez sélectionner un client régulier.", 'warning');
      return;
    }
    try {
      const payload = {
        ...saleFormData,
        clientId: typeClientVente === 'regulier' ? saleFormData.clientId : undefined,
        client: typeClientVente === 'occasionnel' ? saleFormData.client : undefined,
      };
      const res = await fetchWithAuth("/api/sales", {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowSaleModal(false);
        setTypeClientVente('occasionnel');
        setSaleFormData(initialSaleForm);
        await refetchAll();
        showToast(typeClientVente === 'regulier'
          ? "Vente enregistrée et ajoutée au compte client !"
          : "Vente enregistrée avec succès !", 'success');
      } else {
        const errorData = await res.json();
        showToast("Erreur: " + (errorData.error || "Échec de l'enregistrement"), 'error');
        console.error("Erreur vente:", errorData);
      }
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'enregistrement", 'error');
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth("/api/expenses", {
        method: 'POST',
        body: JSON.stringify(expFormData)
      });
      if (res.ok) {
        setShowExpModal(false);
        setExpFormData({
          speculationId: "", type: "Achat", category: "Intrants",
          amount: "", date: new Date().toISOString().split('T')[0],
          supplier: "", observation: ""
        });
        await refetchAll();
        showToast("Dépense enregistrée avec succès !", 'success');
      } else {
        const errorData = await res.json();
        showToast("Erreur: " + (errorData.error || "Échec de l'enregistrement"), 'error');
        console.error("Erreur dépense:", errorData);
      }
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'enregistrement", 'error');
    }
  };

  const handleRecordHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth("/api/harvests", {
        method: 'POST',
        body: JSON.stringify(harvFormData)
      });
      if (res.ok) {
        setShowHarvModal(false);
        setHarvFormData({ 
          speculationId: "", 
          quantity: "", 
          unit: "KG", 
          date: new Date().toISOString().split('T')[0], 
          quality: "Standard", 
          observation: "",
          campagneId: "" 
        });
        await refetchAll();
        showToast("Récolte enregistrée avec succès !", 'success');
      } else {
        const errorData = await res.json();
        showToast("Erreur: " + (errorData.error || "Échec de l'enregistrement"), 'error');
        console.error("Erreur récolte:", errorData);
      }
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'enregistrement", 'error');
    }
  };

  const handleDeleteSpeculation = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette spéculation ? Tous les historiques liés seront supprimés.")) return;
    try {
      const res = await fetchWithAuth(`/api/speculations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await refetchAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteHarvest = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette récolte ?")) return;
    try {
      const res = await fetchWithAuth(`/api/harvests/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await refetchAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEncaisser = (sale: Sale) => {
    setEncaissementData({
      saleId: sale.id,
      clientId: sale.clientId || "",
      montant: sale.totalPrice.toString(),
      modePaiement: "espece",
      reference: "",
      date: new Date().toISOString().split('T')[0]
    });
    setShowEncaissementModal(true);
  };

  const handleEncaissementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth(`/api/clients/${encaissementData.clientId}/operations`, {
        method: 'POST',
        body: JSON.stringify({
          typeOperation: 'paiement',
          montant: parseFloat(encaissementData.montant),
          modePaiement: encaissementData.modePaiement,
          reference: encaissementData.reference,
          description: `Encaissement vente #${encaissementData.saleId}`,
          dateOperation: encaissementData.date
        })
      });
      if (res.ok) {
        setShowEncaissementModal(false);
        setEncaissementData({
          saleId: "",
          clientId: "",
          montant: "",
          modePaiement: "espece",
          reference: "",
          date: new Date().toISOString().split('T')[0]
        });
        await refetchAll();
        showToast("Paiement enregistré avec succès !", 'success');
      } else {
        const errorData = await res.json();
        showToast("Erreur: " + (errorData.error || "Échec de l'enregistrement"), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'enregistrement", 'error');
    }
  };

  const TableHeader = ({ label, sortKey, table }: { label: string, sortKey?: string, table: DataTable<unknown> }) => (
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

  const SubNav = () => (
    <div className="flex items-center bg-white p-1 rounded-2xl border border-gray-100 shadow-sm w-fit mb-8 overflow-x-auto max-w-full">
      {[
        { id: 'cultures', label: 'Mes Cultures', icon: Sprout },
        { id: 'harvests', label: 'Récoltes', icon: History },
        { id: 'sales', label: 'Ventes', icon: ShoppingCart },
        { id: 'expenses', label: 'Dépenses', icon: CreditCard },
        { id: 'analytics', label: 'Analyse', icon: BarChart3 },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setCurrentView(tab.id as View)}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-tight transition-all whitespace-nowrap ${
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

  const SearchBar = ({ table, placeholder }: { table: DataTable<unknown>, placeholder: string }) => (
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight uppercase">Spéculations</h2>
          <p className="text-gray-500 font-medium italic">Gérez vos cultures et élevages</p>
        </div>
        {isGerant && (
          <div className="flex gap-2">
            <button 
              onClick={() => { setSaleFormData({...saleFormData, date: new Date().toISOString().split('T')[0]}); setShowSaleModal(true); }}
              className="bg-green-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-green-700 transition-all font-bold shadow-lg shadow-green-200"
            >
              <ShoppingCart className="w-5 h-5" />
              Nouvelle Vente
            </button>
            <button 
              onClick={() => { setExpFormData({...expFormData, date: new Date().toISOString().split('T')[0]}); setShowExpModal(true); }}
              className="bg-gray-900 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-black transition-all font-bold shadow-lg shadow-gray-200"
            >
              <CreditCard className="w-5 h-5" />
              Nouvelle Dépense
            </button>
            <button 
              onClick={() => { setHarvFormData({...harvFormData, date: new Date().toISOString().split('T')[0]}); setShowHarvModal(true); }}
              className="bg-white text-primary border-2 border-primary/20 px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-primary hover:text-white transition-all font-bold shadow-sm"
            >
              <History className="w-5 h-5" />
              Enregistrer Récolte
            </button>
            <button 
              onClick={() => { setEditingSpec(null); setSpecFormData({ name: "", category: "Cultures Industrielles", areaSize: "" }); setShowCustomSpecInput(false); setShowSpecModal(true); }}
              className="bg-primary text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-opacity-90 transition-all font-bold shadow-lg shadow-primary/20"
            >
              <Plus className="w-5 h-5" />
              Nouvelle Culture
            </button>
          </div>
        )}
      </div>

      {/* Sélecteur de Campagne */}
      <div className="flex items-center gap-4 mb-6">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Campagne:</label>
        <select
          value={selectedCampagne}
          onChange={(e) => setSelectedCampagne(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Toutes les campagnes</option>
          {campagnes.map((camp) => (
            <option key={camp.id} value={camp.id}>{camp.nom}</option>
          ))}
        </select>
        {isGerant && (
          <button
            onClick={() => {
              const nom = prompt("Nom de la nouvelle campagne:");
              if (nom) {
                const dateDebut = prompt("Date de début (YYYY-MM-DD):");
                const dateFin = prompt("Date de fin (YYYY-MM-DD):");
                if (dateDebut && dateFin) {
                  fetchWithAuth("/api/campagnes", {
                    method: 'POST',
                    body: JSON.stringify({ nom, description: "", dateDebut, dateFin })
                  }).then(async (res) => {
                    if (res.ok) {
                      await refetchAll();
                      showToast("Campagne créée avec succès !", 'success');
                    } else {
                      showToast("Erreur lors de la création", 'error');
                    }
                  });
                }
              }
            }}
            className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-colors"
          >
            + Nouvelle Campagne
          </button>
        )}
      </div>

      <SubNav />

      {currentView === 'cultures' && (
        <div className="animate-in fade-in duration-500">
          <ExportButtons<Speculation>
            data={specTable.sortedData}
            columns={specColumns}
            filename="speculations"
            title="Liste des spéculations"
          />
          <SearchBar table={specTable} placeholder="Rechercher une culture..." />
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <TableHeader label="Spéculation" sortKey="name" table={specTable} />
                  <TableHeader label="Catégorie" sortKey="category" table={specTable} />
                  <TableHeader label="Taille (Ha)" sortKey="areaSize" table={specTable} />
                  <TableHeader label="Status" sortKey="status" table={specTable} />
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <TableSkeleton columns={5} />
                ) : specTable.paginatedData.length === 0 && specTable.totalItems === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon="cultures"
                        title="Aucune culture"
                        description="Commencez par ajouter votre première culture pour gérer vos spéculations."
                        onAdd={() => { setEditingSpec(null); setSpecFormData({ name: "", category: "Cultures Industrielles", areaSize: "" }); setShowSpecModal(true); }}
                        addButtonText="Ajouter une culture"
                      />
                    </td>
                  </tr>
                ) : specTable.paginatedData.map((spec: Speculation) => (
                  <tr key={spec.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/5 text-primary rounded-xl">
                          <Sprout className="w-5 h-5" />
                        </div>
                        <span className="font-black text-gray-800 uppercase tracking-tight">{spec.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-gray-500 uppercase tracking-widest">{spec.category}</td>
                    <td className="px-8 py-6 font-black text-gray-700">{spec.areaSize || '-'} Ha</td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        spec.status === 'EN_COURS' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'
                      )}>
                        {spec.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right space-x-2">
                      {isGerant && (
                        <button 
                          onClick={() => { 
                            setEditingSpec(spec);
                            setSpecFormData({ name: spec.name, category: spec.category, areaSize: spec.areaSize?.toString() || "" });
                            // Check if the spec name is in the predefined list for its category
                            const isCustom = !SPECULATIONS_BY_CATEGORY[spec.category]?.includes(spec.name);
                            setShowCustomSpecInput(isCustom);
                            setShowSpecModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      )}
                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteSpeculation(spec.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && (
              <div className="px-8">
                <Pagination
                  currentPage={specTable.currentPage}
                  totalPages={specTable.totalPages}
                  onPageChange={specTable.setCurrentPage}
                  itemsPerPage={specTable.itemsPerPage}
                  onItemsPerPageChange={specTable.setItemsPerPage}
                  totalItems={specTable.totalItems}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {currentView === 'harvests' && (
        <div className="animate-in slide-in-from-bottom-4 duration-300">
          <ExportButtons<Harvest>
            data={harvestTable.sortedData}
            columns={harvestColumns}
            filename="recoltes"
            title="Liste des récoltes"
          />
          <SearchBar table={harvestTable} placeholder="Rechercher une récolte..." />
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <TableHeader label="Date" sortKey="date" table={harvestTable} />
                  <TableHeader label="Culture" sortKey="speculationId" table={harvestTable} />
                  <TableHeader label="Quantité" sortKey="quantity" table={harvestTable} />
                  <TableHeader label="Qualité" sortKey="quality" table={harvestTable} />
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Observation</th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <TableSkeleton columns={6} />
                ) : harvestTable.paginatedData.length === 0 && harvestTable.totalItems === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon="harvests"
                        title="Aucune récolte"
                        description="Enregistrez vos récoltes pour suivre la production."
                        onAdd={() => { setHarvFormData({ speculationId: "", quantity: "", unit: "KG", date: new Date().toISOString().split('T')[0], quality: "Standard", observation: "", campagneId: "" }); setShowHarvModal(true); }}
                        addButtonText="Enregistrer une récolte"
                      />
                    </td>
                  </tr>
                ) : harvestTable.paginatedData.map((h: Harvest) => (
                  <tr key={h.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6 text-sm font-bold text-gray-500">{new Date(h.date).toLocaleDateString()}</td>
                    <td className="px-8 py-6 font-black text-gray-800 uppercase tracking-tight">{h.speculation.name}</td>
                    <td className="px-8 py-6">
                      <span className="text-lg font-black text-primary">{h.quantity} <span className="text-[10px] uppercase opacity-40">{h.unit}</span></span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-lg">
                        {h.quality || 'N/A'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-xs text-gray-400 italic">{h.observation || '-'}</td>
                    <td className="px-8 py-6 text-right">
                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteHarvest(h.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && (
              <div className="px-8">
                <Pagination
                  currentPage={harvestTable.currentPage}
                  totalPages={harvestTable.totalPages}
                  onPageChange={harvestTable.setCurrentPage}
                  itemsPerPage={harvestTable.itemsPerPage}
                  onItemsPerPageChange={harvestTable.setItemsPerPage}
                  totalItems={harvestTable.totalItems}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {currentView === 'sales' && (
        <div className="animate-in slide-in-from-bottom-4 duration-300">
          <ExportButtons<Sale>
            data={salesTable.sortedData}
            columns={saleColumns}
            filename="ventes"
            title="Liste des ventes"
          />
          <SearchBar table={salesTable} placeholder="Rechercher une vente..." />
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <TableHeader label="Date" sortKey="date" table={salesTable} />
                  <TableHeader label="Produit" sortKey="product" table={salesTable} />
                  <TableHeader label="Quantité" sortKey="quantity" table={salesTable} />
                  <TableHeader label="Client" sortKey="client" table={salesTable} />
                  <TableHeader label="Total" sortKey="totalPrice" table={salesTable} />
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <TableSkeleton columns={6} />
                ) : salesTable.paginatedData.length === 0 && salesTable.totalItems === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon="sales"
                        title="Aucune vente"
                        description="Enregistrez vos ventes pour suivre les revenus."
                        onAdd={() => { setTypeClientVente('occasionnel'); setSaleFormData(initialSaleForm); setShowSaleModal(true); }}
                        addButtonText="Ajouter une vente"
                      />
                    </td>
                  </tr>
                ) : salesTable.paginatedData.map((s: Sale) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6 text-sm font-bold text-gray-500">{new Date(s.date).toLocaleDateString()}</td>
                    <td className="px-8 py-6 font-black text-gray-800 uppercase tracking-tight">{s.speculation.name}</td>
                    <td className="px-8 py-6 text-sm font-bold text-gray-600">{s.quantity} {s.unit}</td>
                    <td className="px-8 py-6 text-sm font-medium text-gray-500 uppercase">
                      <div className="flex items-center gap-2">
                        <span>{s.client || s.clientCompte?.nom || '-'}</span>
                        {s.clientId && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase rounded-md">Compte</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-lg font-black text-green-600">{s.totalPrice.toLocaleString()} <span className="text-[10px] opacity-40 uppercase">FCFA</span></span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {s.clientId && (
                        <button
                          onClick={() => handleEncaisser(s)}
                          className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-colors"
                        >
                          Encaisser
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && (
              <div className="px-8">
                <Pagination
                  currentPage={salesTable.currentPage}
                  totalPages={salesTable.totalPages}
                  onPageChange={salesTable.setCurrentPage}
                  itemsPerPage={salesTable.itemsPerPage}
                  onItemsPerPageChange={salesTable.setItemsPerPage}
                  totalItems={salesTable.totalItems}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {currentView === 'expenses' && (
        <div className="animate-in slide-in-from-bottom-4 duration-300">
          <ExportButtons<Expense>
            data={expensesTable.sortedData}
            columns={expenseColumns}
            filename="depenses"
            title="Liste des dépenses"
          />
          <SearchBar table={expensesTable} placeholder="Rechercher une dépense..." />
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <TableHeader label="Date" sortKey="date" table={expensesTable} />
                  <TableHeader label="Culture" sortKey="speculationId" table={expensesTable} />
                  <TableHeader label="Nature" sortKey="category" table={expensesTable} />
                  <TableHeader label="Montant" sortKey="amount" table={expensesTable} />
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <TableSkeleton columns={5} />
                ) : expensesTable.paginatedData.length === 0 && expensesTable.totalItems === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon="expenses"
                        title="Aucune dépense"
                        description="Enregistrez vos dépenses pour suivre les coûts."
                        onAdd={() => { setExpFormData({ speculationId: "", type: "Achat", category: "Intrants", amount: "", date: new Date().toISOString().split('T')[0], supplier: "", observation: "" }); setShowExpModal(true); }}
                        addButtonText="Ajouter une dépense"
                      />
                    </td>
                  </tr>
                ) : expensesTable.paginatedData.map((e: Expense) => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6 text-sm font-bold text-gray-500">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="px-8 py-6 font-black text-gray-800 uppercase tracking-tight">{e.speculation?.name || 'Générale'}</td>
                    <td className="px-8 py-6 text-sm font-bold text-gray-600 uppercase tracking-widest">{e.category}</td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-lg font-black text-red-500">-{e.amount.toLocaleString()} <span className="text-[10px] opacity-40 uppercase">FCFA</span></span>
                    </td>
                    <td className="px-8 py-6 text-xs text-gray-400 italic">{e.observation || '-'}</td>
                  </tr>
                ))}
              </tbody>
              {!loading && expensesTable.sortedData.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-900 text-white">
                    <td className="px-8 py-5 text-[10px] font-black uppercase tracking-widest" colSpan={2}>
                      Total ({expensesTable.sortedData.length} dépense{expensesTable.sortedData.length > 1 ? 's' : ''})
                    </td>
                    <td></td>
                    <td className="px-8 py-5 text-right">
                      <span className="text-lg font-black text-red-400">-{expensesTable.sortedData.reduce((acc: number, e: Expense) => acc + e.amount, 0).toLocaleString()} <span className="text-[10px] opacity-40 uppercase">FCFA</span></span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
            {!loading && (
              <div className="px-8">
                <Pagination
                  currentPage={expensesTable.currentPage}
                  totalPages={expensesTable.totalPages}
                  onPageChange={expensesTable.setCurrentPage}
                  itemsPerPage={expensesTable.itemsPerPage}
                  onItemsPerPageChange={expensesTable.setItemsPerPage}
                  totalItems={expensesTable.totalItems}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {currentView === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in zoom-in-95 duration-300">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm min-h-[400px]">
            <h4 className="font-black text-gray-800 uppercase tracking-tight mb-6">Rentabilité par Culture</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={speculations.map(s => ({
                name: s.name,
                revenue: s.sales.reduce((acc, sale) => acc + sale.totalPrice, 0),
                expense: s.expenses.reduce((acc, exp) => acc + exp.amount, 0)
              }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip cursor={{fill: '#f9fafb'}} />
                <Bar dataKey="revenue" fill="#1a4d2e" radius={[10, 10, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm min-h-[400px]">
            <h4 className="font-black text-gray-800 uppercase tracking-tight mb-6">Volume des Récoltes</h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={speculations.map(s => ({
                    name: s.name,
                    value: s.harvests.reduce((acc, h) => acc + h.quantity, 0)
                  })).filter(s => s.value > 0)}
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {speculations.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#1a4d2e', '#e8c872', '#3b82f6', '#ef4444'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sale Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[80] backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md max-h-[90vh] overflow-y-auto p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Nouvelle Vente</h3>
              <button onClick={() => setShowSaleModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleRecordSale} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Culture / Spéculation</label>
                  <select 
                    required 
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary/20 outline-none" 
                    value={saleFormData.speculationId} 
                    onChange={e => setSaleFormData({...saleFormData, speculationId: e.target.value})}
                  >
                    <option value="">-- Sélectionner --</option>
                    {speculations.map(spec => (
                      <option key={spec.id} value={spec.id}>{spec.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Produit spécifique</label>
                  <input type="text" required placeholder="Ex: Latex, Fond de tasse..." className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary/20 outline-none" value={saleFormData.product} onChange={e => setSaleFormData({...saleFormData, product: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Quantité</label>
                    <input type="number" step="0.01" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={saleFormData.quantity} onChange={e => setSaleFormData({...saleFormData, quantity: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Unité</label>
                    <select required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={saleFormData.unit} onChange={e => setSaleFormData({...saleFormData, unit: e.target.value})}>
                      <option value="KG">KG</option>
                      <option value="Unité">Unité</option>
                      <option value="Litre">Litre</option>
                      <option value="Tonne">Tonne</option>
                      <option value="Sac">Sac</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Prix Unitaire</label>
                  <input type="number" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={saleFormData.unitPrice} onChange={e => setSaleFormData({...saleFormData, unitPrice: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Client</label>
                  <div className="flex bg-gray-50 p-1 rounded-xl mb-3">
                    {[
                      { id: 'occasionnel', label: 'Occasionnel' },
                      { id: 'regulier', label: 'Client régulier' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTypeClientVente(t.id as 'regulier' | 'occasionnel');
                          setSaleFormData({ ...saleFormData, client: '', clientId: '' });
                        }}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          typeClientVente === t.id ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {typeClientVente === 'regulier' ? (
                    <select
                      required
                      className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                      value={saleFormData.clientId}
                      onChange={e => setSaleFormData({ ...saleFormData, clientId: e.target.value })}
                    >
                      <option value="">-- Sélectionner un client --</option>
                      {clientsActifs.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nom}{c.telephone ? ` (${c.telephone})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Nom du client occasionnel..."
                      className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                      value={saleFormData.client}
                      onChange={e => setSaleFormData({ ...saleFormData, client: e.target.value })}
                    />
                  )}
                  {typeClientVente === 'regulier' && (
                    <p className="text-[10px] text-gray-400 italic mt-2 ml-1">
                      La vente sera automatiquement enregistrée sur le compte client.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Date</label>
                  <input type="date" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={saleFormData.date} onChange={e => setSaleFormData({...saleFormData, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Campagne</label>
                  <select className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={saleFormData.campagneId} onChange={e => setSaleFormData({...saleFormData, campagneId: e.target.value})}>
                    <option value="">Sans campagne</option>
                    {campagnes.map(camp => <option key={camp.id} value={camp.id}>{camp.nom}</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-xl shadow-green-200">
                Confirmer la Vente
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[80] backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Nouvelle Dépense</h3>
              <button onClick={() => setShowExpModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleRecordExpense} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Culture liée (Optionnel)</label>
                  <select 
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" 
                    value={expFormData.speculationId} 
                    onChange={e => setExpFormData({...expFormData, speculationId: e.target.value})}
                  >
                    <option value="">-- Dépense Générale --</option>
                    {speculations.map(spec => (
                      <option key={spec.id} value={spec.id}>{spec.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Catégorie</label>
                  <select className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={expFormData.category} onChange={e => setExpFormData({...expFormData, category: e.target.value})}>
                    {["Intrants", "Main d'œuvre", "Transport", "Matériel", "Autre"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Montant (FCFA)</label>
                  <input type="number" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={expFormData.amount} onChange={e => setExpFormData({...expFormData, amount: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Date</label>
                  <input type="date" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={expFormData.date} onChange={e => setExpFormData({...expFormData, date: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200">
                Enregistrer la Dépense
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Harvest Modal */}
      {showHarvModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[80] backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Nouvelle Récolte</h3>
              <button onClick={() => setShowHarvModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleRecordHarvest} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Culture</label>
                  <select 
                    required 
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" 
                    value={harvFormData.speculationId} 
                    onChange={e => setHarvFormData({...harvFormData, speculationId: e.target.value})}
                  >
                    <option value="">-- Sélectionner --</option>
                    {speculations.map(spec => (
                      <option key={spec.id} value={spec.id}>{spec.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Quantité</label>
                    <input type="number" step="0.01" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={harvFormData.quantity} onChange={e => setHarvFormData({...harvFormData, quantity: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Unité</label>
                    <select className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={harvFormData.unit} onChange={e => setHarvFormData({...harvFormData, unit: e.target.value})}>
                      {["KG", "Tonne", "Litre", "Sac", "Casier", "Unité"].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Date de récolte</label>
                  <input type="date" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={harvFormData.date} onChange={e => setHarvFormData({...harvFormData, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Campagne</label>
                  <select className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={harvFormData.campagneId} onChange={e => setHarvFormData({...harvFormData, campagneId: e.target.value})}>
                    <option value="">Sans campagne</option>
                    {campagnes.map(camp => <option key={camp.id} value={camp.id}>{camp.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Qualité</label>
                  <select className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={harvFormData.quality} onChange={e => setHarvFormData({...harvFormData, quality: e.target.value})}>
                    {["Premium", "Standard", "Second choix"].map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Observation</label>
                  <textarea className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold h-20" placeholder="Notes éventuelles..." value={harvFormData.observation} onChange={e => setHarvFormData({...harvFormData, observation: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-xl shadow-primary/20">
                Enregistrer la Récolte
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Speculation Modal */}
      {showSpecModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[80] backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">
                {editingSpec ? "Modifier Spéculation" : "Nouvelle Spéculation"}
              </h3>
              <button onClick={() => setShowSpecModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateSpec} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Catégorie</label>
                  <select 
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" 
                    value={specFormData.category} 
                    onChange={e => setSpecFormData({...specFormData, category: e.target.value, name: ""})}
                  >
                    {SPECULATION_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Culture / Spéculation</label>
                  {SPECULATIONS_BY_CATEGORY[specFormData.category]?.length > 0 ? (
                    <>
                      <select
                        required
                        className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                        value={showCustomSpecInput ? "custom" : specFormData.name}
                        onChange={e => {
                          if (e.target.value === "custom") {
                            setShowCustomSpecInput(true);
                            setSpecFormData({...specFormData, name: ""});
                          } else {
                            setShowCustomSpecInput(false);
                            setSpecFormData({...specFormData, name: e.target.value});
                          }
                        }}
                      >
                        <option value="">-- Choisir une spéculation --</option>
                        {SPECULATIONS_BY_CATEGORY[specFormData.category].map(spec => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                        <option value="custom">-- Autre ( personnaliser ) --</option>
                      </select>
                      {showCustomSpecInput && (
                        <input type="text" required placeholder="Entrez le nom de la spéculation..." className="w-full p-4 mt-3 bg-primary/5 border-none rounded-2xl font-bold text-primary" value={specFormData.name} onChange={e => setSpecFormData({...specFormData, name: e.target.value})} />
                      )}
                    </>
                  ) : (
                    <input type="text" required placeholder="Nom de la spéculation..." className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={specFormData.name} onChange={e => setSpecFormData({...specFormData, name: e.target.value})} />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Taille de la parcelle (Ha)</label>
                  <input type="number" step="0.01" placeholder="Ex: 5.5" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={specFormData.areaSize} onChange={e => setSpecFormData({...specFormData, areaSize: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-xl shadow-primary/20">
                {editingSpec ? "Mettre à jour" : "Créer la Spéculation"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Encaissement Modal */}
      {showEncaissementModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[80] backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">
                Encaisser Paiement
              </h3>
              <button onClick={() => setShowEncaissementModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEncaissementSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Montant à encaisser</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                    value={encaissementData.montant}
                    onChange={e => setEncaissementData({ ...encaissementData, montant: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Mode de paiement</label>
                  <select
                    required
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                    value={encaissementData.modePaiement}
                    onChange={e => setEncaissementData({ ...encaissementData, modePaiement: e.target.value })}
                  >
                    <option value="espece">Espèces</option>
                    <option value="mobile_money">Mobile Money (Orange/MTN/Wave)</option>
                    <option value="cheque">Chèque</option>
                    <option value="virement">Virement bancaire</option>
                  </select>
                </div>
                {(encaissementData.modePaiement === 'mobile_money' || encaissementData.modePaiement === 'cheque' || encaissementData.modePaiement === 'virement') && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Référence</label>
                    <input
                      type="text"
                      placeholder="Numéro de transaction, chèque, etc."
                      className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                      value={encaissementData.reference}
                      onChange={e => setEncaissementData({ ...encaissementData, reference: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Date du paiement</label>
                  <input
                    type="date"
                    required
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                    value={encaissementData.date}
                    onChange={e => setEncaissementData({ ...encaissementData, date: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-amber-500/20">
                Enregistrer le Paiement
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
