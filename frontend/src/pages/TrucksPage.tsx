import React, { useState, useEffect, useMemo } from "react";
import { Plus, Truck as TruckIcon, User, X, Shield, Settings, Navigation, Fuel, Wrench, MapPin, Calendar, History, TrendingDown, BarChart3, PieChart as PieChartIcon, Edit, Trash2, Banknote, CreditCard, ChevronRight, ChevronUp, ChevronDown, Search, Download } from "lucide-react";
import { cn } from "../lib/utils";
import { fetchWithAuth } from "../lib/api";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { 
  VEHICLE_CATALOG, 
  TRUCK_CATEGORIES as CATEGORIES, 
  TRUCK_ASSIGNMENTS as ASSIGNMENTS, 
  TRUCK_STATUSES as STATUSES, 
  ENERGY_TYPES as ENERGIES 
} from "../lib/constants";
import { useDataTable } from "../hooks/useDataTable";
import * as XLSX from "xlsx";

interface Trip {
  id: string;
  date: string;
  destination: string;
  cargo: string;
  observation?: string;
  status?: string;
  completedAt?: string;
  truck: { registration: string };
}

interface TruckExpense {
  id: string;
  date: string;
  type: string;
  amount: number;
  observation?: string;
  truck: { registration: string };
}

interface Truck {
  id: string;
  internalCode: string;
  registration: string;
  category: string;
  subCategory: string;
  brand: string;
  model: string;
  year: number;
  assignment: string;
  energyType: string;
  mileage: number;
  consumption?: number;
  serviceDate: string;
  nextMaintenance?: string;
  status: string;
  driverId?: string;
  driver?: { firstName: string; lastName: string };
  conveyorId?: string;
  conveyor?: { firstName: string; lastName: string };
  _count: {
    trips: number;
    expenses: number;
  };
  expenses?: any[];
}

import { useConfirm } from "../contexts/ConfirmContext";
export default function TrucksPage() {
  const confirmDialog = useConfirm();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [allExpenses, setAllExpenses] = useState<TruckExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<Truck | null>(null);
  const [currentView, setCurrentView] = useState<'fleet' | 'trips' | 'expenses' | 'analytics' | 'add'>('fleet');
  const [activeDetailTab, setActiveDetailTab] = useState<'trips' | 'expenses' | 'analytics'>('trips');
  
  // DataTable hooks
  const truckTable = useDataTable(trucks);
  const tripTable = useDataTable(allTrips);
  const expenseTable = useDataTable(allExpenses);
  
  // Trip & Expense Modals
  const [showTripModal, setShowTripModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const [tripFormData, setTripFormData] = useState({
    truckId: "",
    date: new Date().toISOString().split('T')[0],
    destination: "",
    cargo: "",
    observation: ""
  });

  const [expenseFormData, setExpenseFormData] = useState({
    truckId: "",
    date: new Date().toISOString().split('T')[0],
    type: "Carburant",
    amount: "",
    observation: ""
  });
  
  // Fleet Stats
  const fleetStats = {
    totalTrucks: trucks.length,
    totalTrips: allTrips.filter(t => t.status !== 'TERMINE').length,
    totalExpenses: allExpenses.reduce((acc, e) => acc + e.amount, 0)
  };

  const handleCompleteTrip = async (id: string) => {
    if (!(await confirmDialog("Marquer ce trajet comme terminé ?"))) return;
    try {
      const res = await fetchWithAuth(`/api/trucks/trips/${id}/complete`, { method: 'PATCH' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Chart colors
  const COLORS = ['#1a4d2e', '#e8c872', '#ef4444', '#3b82f6', '#8b5cf6', '#f59e0b'];

  const [formData, setFormData] = useState({
    internalCode: "",
    registration: "",
    category: "AGR",
    subCategory: "Tracteur",
    brand: "",
    model: "",
    year: new Date().getFullYear().toString(),
    assignment: "EXP",
    energyType: "Diesel",
    mileage: "0",
    consumption: "",
    serviceDate: new Date().toISOString().split('T')[0],
    nextMaintenance: "",
    status: "Disponible",
    driverId: "",
    conveyorId: ""
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trucksRes, tripsRes, expRes, empRes] = await Promise.all([
        fetchWithAuth("/api/trucks"),
        fetchWithAuth("/api/trucks/trips"),
        fetchWithAuth("/api/trucks/expenses"),
        fetchWithAuth("/api/employees")
      ]);
      const truckData = await trucksRes.json();
      const tripData = await tripsRes.json();
      const expData = await expRes.json();
      const empData = await empRes.json();

      setTrucks(Array.isArray(truckData) ? truckData : []);
      setAllTrips(Array.isArray(tripData) ? tripData : []);
      setAllExpenses(Array.isArray(expData) ? expData : []);
      setEmployees(Array.isArray(empData) ? empData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTruck ? `/api/trucks/${editingTruck.id}` : "/api/trucks";
      const method = editingTruck ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        setCurrentView('fleet');
        setEditingTruck(null);
        resetForm();
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth("/api/trucks/trips", {
        method: 'POST',
        body: JSON.stringify(tripFormData)
      });
      if (res.ok) {
        setShowTripModal(false);
        setTripFormData({
          truckId: "",
          date: new Date().toISOString().split('T')[0],
          destination: "",
          cargo: "",
          observation: ""
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth("/api/trucks/expenses", {
        method: 'POST',
        body: JSON.stringify(expenseFormData)
      });
      if (res.ok) {
        setShowExpenseModal(false);
        setExpenseFormData({
          truckId: "",
          date: new Date().toISOString().split('T')[0],
          type: "Carburant",
          amount: "",
          observation: ""
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTruck = async (id: string) => {
    if (!(await confirmDialog("Voulez-vous vraiment supprimer ce camion ?"))) return;
    try {
      const res = await fetchWithAuth(`/api/trucks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export Trucks to Excel
  const handleExportTrucksExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(trucks.map(truck => ({
      "Code Interne": truck.internalCode,
      "Immatriculation": truck.registration,
      "Catégorie": truck.category,
      "Sous-Catégorie": truck.subCategory,
      "Marque": truck.brand,
      "Modèle": truck.model,
      "Année": truck.year,
      "Affectation": truck.assignment,
      "Type d'Énergie": truck.energyType,
      "Kilométrage": truck.mileage,
      "Consommation": truck.consumption || "N/A",
      "Date de Service": new Date(truck.serviceDate).toLocaleDateString('fr-FR'),
      "Prochaine Maintenance": truck.nextMaintenance ? new Date(truck.nextMaintenance).toLocaleDateString('fr-FR') : "N/A",
      "Statut": truck.status,
      "Conducteur": truck.driver ? `${truck.driver.firstName} ${truck.driver.lastName}` : "N/A",
      "Transporteur": truck.conveyor ? `${truck.conveyor.firstName} ${truck.conveyor.lastName}` : "N/A"
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Flotte");
    XLSX.writeFile(workbook, `flotte_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const resetForm = () => {
    setFormData({
      internalCode: "",
      registration: "",
      category: "AGR",
      subCategory: "Tracteur",
      brand: "",
      model: "",
      year: new Date().getFullYear().toString(),
      assignment: "EXP",
      energyType: "Diesel",
      mileage: "0",
      consumption: "",
      serviceDate: new Date().toISOString().split('T')[0],
      nextMaintenance: "",
      status: "Disponible",
      driverId: "",
      conveyorId: ""
    });
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

  const openDetailModal = async (truck: Truck) => {
    try {
      const res = await fetchWithAuth(`/api/trucks/${truck.id}/details`);
      const data = await res.json();
      setShowDetailModal(data);
    } catch (err) {
      console.error(err);
    }
  };

  const SubNav = () => (
    <div className="flex items-center bg-white p-1 rounded-2xl border border-gray-100 shadow-sm w-fit mb-8">
      {[
        { id: 'fleet', label: 'Ma Flotte', icon: TruckIcon },
        { id: 'trips', label: 'Journal des Trajets', icon: Navigation },
        { id: 'expenses', label: 'Dépenses Flotte', icon: Fuel },
        { id: 'analytics', label: 'Statistiques', icon: BarChart3 },
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
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Gestion Logistique</h2>
          <p className="text-gray-500 font-medium italic">Parc automobile et engins</p>
        </div>
        <div className="flex gap-4">
          {currentView === 'fleet' && (
            <button 
              onClick={handleExportTrucksExcel}
              className="bg-white text-primary border border-gray-200 px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-primary/5 transition-all font-bold shadow-sm"
            >
              <Download className="w-5 h-5" />
              Export Excel
            </button>
          )}
          {currentView === 'add' ? (
            <button 
              onClick={() => { setCurrentView('fleet'); setEditingTruck(null); resetForm(); }}
              className="bg-white text-gray-600 border-2 border-gray-100 px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-gray-50 transition-all font-bold shadow-sm"
            >
              <X className="w-5 h-5" />
              Annuler
            </button>
          ) : (
            <button 
              onClick={() => { resetForm(); setEditingTruck(null); setCurrentView('add'); }}
              className="bg-primary text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-opacity-90 transition-all font-bold shadow-lg shadow-primary/20"
            >
              <Plus className="w-5 h-5" />
              Nouveau Véhicule
            </button>
          )}
        </div>
      </div>

      {currentView === 'add' ? (
        <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="max-w-4xl mx-auto">
            <div className="mb-10">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">
                {editingTruck ? "Modifier le Véhicule" : "Enregistrement d'un nouveau véhicule"}
              </h3>
              <p className="text-gray-400 font-bold text-sm mt-1 uppercase tracking-widest">Veuillez renseigner toutes les informations techniques et administratives</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Identification */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-black text-xs">01</div>
                    <h4 className="text-sm font-black text-primary tracking-[0.2em]">Identification</h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Code Interne (Codification)</label>
                      <input type="text" required placeholder="Ex: EXP-AGR-TRA-001" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary/10 outline-none transition-all" value={formData.internalCode} onChange={e => setFormData({...formData, internalCode: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Immatriculation</label>
                      <input type="text" required placeholder="Ex: 1234 AB 01" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary/10 outline-none transition-all" value={formData.registration} onChange={e => setFormData({...formData, registration: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Marque</label>
                        <select 
                          required 
                          className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary/10 outline-none transition-all" 
                          value={formData.brand} 
                          onChange={e => {
                            const models = VEHICLE_CATALOG[e.target.value] || [];
                            setFormData({...formData, brand: e.target.value, model: models[0] || ""});
                          }}
                        >
                          <option value="">-- Choisir --</option>
                          {Object.keys(VEHICLE_CATALOG).map(brand => (
                            <option key={brand} value={brand}>{brand}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Modèle</label>
                        <input type="text" required placeholder="Saisir modèle" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary/10 outline-none transition-all" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Classification */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-black text-xs">02</div>
                    <h4 className="text-sm font-black text-primary tracking-[0.2em]">Classification</h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Catégorie principale</label>
                      <select 
                        className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary/10 outline-none transition-all" 
                        value={formData.category} 
                        onChange={e => setFormData({...formData, category: e.target.value, subCategory: CATEGORIES[e.target.value as keyof typeof CATEGORIES].sub[0]})}
                      >
                        {Object.entries(CATEGORIES).map(([code, cat]) => (
                          <option key={code} value={code}>{cat.label} ({code})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Sous-catégorie</label>
                      <select 
                        className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary/10 outline-none transition-all" 
                        value={formData.subCategory} 
                        onChange={e => setFormData({...formData, subCategory: e.target.value})}
                      >
                        {CATEGORIES[formData.category as keyof typeof CATEGORIES].sub.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Affectation / Service</label>
                      <select 
                        className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary/10 outline-none transition-all" 
                        value={formData.assignment} 
                        onChange={e => setFormData({...formData, assignment: e.target.value})}
                      >
                        {Object.entries(ASSIGNMENTS).map(([code, label]) => (
                          <option key={code} value={code}>{label} ({code})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Technique */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-black text-xs">03</div>
                    <h4 className="text-sm font-black text-primary tracking-[0.2em]">Technique</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Année</label>
                      <input type="number" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary/10 outline-none transition-all" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Énergie</label>
                      <select className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary/10 outline-none transition-all" value={formData.energyType} onChange={e => setFormData({...formData, energyType: e.target.value})}>
                        {ENERGIES.map(en => <option key={en} value={en}>{en}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">KM / Heures</label>
                      <input type="number" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary/10 outline-none transition-all" value={formData.mileage} onChange={e => setFormData({...formData, mileage: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Conso. Moyenne</label>
                      <input type="number" step="0.1" placeholder="L/100km" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary/10 outline-none transition-all" value={formData.consumption} onChange={e => setFormData({...formData, consumption: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Personnel & Statut */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-black text-xs">04</div>
                    <h4 className="text-sm font-black text-primary tracking-[0.2em]">Personnel & Statut</h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Conducteur Principal</label>
                      <select className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary/10 outline-none transition-all" value={formData.driverId} onChange={e => setFormData({...formData, driverId: e.target.value})}>
                        <option value="">-- Aucun --</option>
                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Convoyeur</label>
                      <select className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary/10 outline-none transition-all" value={formData.conveyorId} onChange={e => setFormData({...formData, conveyorId: e.target.value})}>
                        <option value="">-- Aucun --</option>
                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Statut Opérationnel</label>
                      <select className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary/10 outline-none transition-all" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                        {STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-6 md:col-span-2">
                  <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-black text-xs">05</div>
                    <h4 className="text-sm font-black text-primary tracking-[0.2em]">Dates de Suivi</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Date de mise en service</label>
                      <input type="date" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary/10 outline-none transition-all" value={formData.serviceDate} onChange={e => setFormData({...formData, serviceDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Prochaine Maintenance prévue</label>
                      <input type="date" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary/10 outline-none transition-all" value={formData.nextMaintenance} onChange={e => setFormData({...formData, nextMaintenance: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-10 border-t border-gray-100 flex gap-4">
                <button type="submit" className="flex-1 py-5 bg-primary text-white rounded-2xl font-black tracking-widest hover:bg-opacity-90 transition-all shadow-2xl shadow-primary/20">
                  {editingTruck ? "Enregistrer les modifications" : "Enregistrer le nouveau véhicule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "Véhicules en Service", value: fleetStats.totalTrucks, icon: TruckIcon, color: "text-primary", bg: "bg-primary/5" },
              { label: "Missions en cours", value: fleetStats.totalTrips, icon: MapPin, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Coûts de Maintenance", value: `${fleetStats.totalExpenses.toLocaleString()} FCFA`, icon: Banknote, color: "text-red-600", bg: "bg-red-50" }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-6">
                <div className={cn("p-4 rounded-2xl", stat.bg)}>
                  <stat.icon className={cn("w-6 h-6", stat.color)} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <h3 className="text-2xl font-black text-gray-800">{stat.value}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Tabs */}
          <div className="flex justify-between items-center">
            <div className="flex p-2 bg-white rounded-2xl shadow-sm border border-gray-100 w-fit">
              {[
                { id: 'fleet', label: "Flotte Automobile", icon: TruckIcon },
                { id: 'trips', label: "Suivi des Trajets", icon: History },
                { id: 'expenses', label: "Frais & Entretien", icon: CreditCard },
                { id: 'analytics', label: "Analyses & Rapports", icon: BarChart3 }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentView(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                    currentView === tab.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-gray-400 hover:bg-gray-50"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {currentView === 'trips' && (
              <button 
                onClick={() => setShowTripModal(true)}
                className="bg-primary text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-opacity-90 transition-all font-bold shadow-lg shadow-primary/20"
              >
                <Plus className="w-5 h-5" />
                Enregistrer un Trajet
              </button>
            )}

            {currentView === 'expenses' && (
              <button 
                onClick={() => setShowExpenseModal(true)}
                className="bg-primary text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-opacity-90 transition-all font-bold shadow-lg shadow-primary/20"
              >
                <Plus className="w-5 h-5" />
                Enregistrer une Dépense
              </button>
            )}
          </div>

          {/* Views content */}
          {currentView === 'fleet' && (
            <div className="animate-in fade-in duration-500">
              <SearchBar table={truckTable} placeholder="Rechercher un véhicule..." />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {truckTable.paginatedData.map((truck: any) => (
                <div key={truck.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-primary/10 rounded-xl text-primary">
                        <TruckIcon className="w-8 h-8" />
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">{truck.internalCode}</span>
                        <span className="text-sm font-black text-primary bg-primary/5 px-3 py-1 rounded-lg border border-primary/20 inline-block mt-1">
                          {truck.registration}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-extrabold text-xl text-gray-800 uppercase tracking-tight">
                        {truck.brand} <span className="text-gray-400 font-medium">{truck.model}</span>
                      </h3>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[9px] font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full uppercase">{truck.subCategory}</span>
                        <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase">{ASSIGNMENTS[truck.assignment as keyof typeof ASSIGNMENTS]}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Chauffeur</p>
                        <div className="flex items-center gap-2 text-sm text-gray-700 font-bold uppercase">
                          <User className="w-4 h-4 text-primary" />
                          {truck.driver ? `${truck.driver.firstName} ${truck.driver.lastName}` : "Non assigné"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Convoyeur</p>
                        <div className="flex items-center gap-2 text-sm text-gray-700 font-bold uppercase">
                          <User className="w-4 h-4 text-primary" />
                          {truck.conveyor ? `${truck.conveyor.firstName} ${truck.conveyor.lastName}` : "Non assigné"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", 
                          truck.status === 'Disponible' ? "bg-green-500" : 
                          truck.status === 'En maintenance' ? "bg-amber-500" : "bg-red-500")} 
                        />
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{truck.status}</span>
                      </div>
                      <span className="text-[10px] font-black text-primary uppercase">{truck.mileage.toLocaleString()} KM</span>
                    </div>

                    <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setEditingTruck(truck);
                            setFormData({
                              internalCode: truck.internalCode,
                              registration: truck.registration,
                              category: truck.category,
                              subCategory: truck.subCategory,
                              brand: truck.brand,
                              model: truck.model,
                              year: truck.year.toString(),
                              assignment: truck.assignment,
                              energyType: truck.energyType,
                              mileage: truck.mileage.toString(),
                              consumption: truck.consumption?.toString() || "",
                              serviceDate: new Date(truck.serviceDate).toISOString().split('T')[0],
                              nextMaintenance: truck.nextMaintenance ? new Date(truck.nextMaintenance).toISOString().split('T')[0] : "",
                              status: truck.status,
                              driverId: truck.driverId || "",
                              conveyorId: truck.conveyorId || ""
                            });
                            setCurrentView('add');
                          }}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setShowDetailModal(truck)}
                          className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-primary hover:text-white transition-all"
                          title="Voir Détails"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      <button 
                        onClick={() => handleDeleteTruck(truck.id)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}

      {currentView === 'trips' && (
        <div className="animate-in slide-in-from-bottom-4 duration-300">
          <SearchBar table={tripTable} placeholder="Rechercher un trajet..." />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <TableHeader label="Date" sortKey="date" table={tripTable} />
                  <TableHeader label="Véhicule" sortKey="truckId" table={tripTable} />
                  <TableHeader label="Destination" sortKey="destination" table={tripTable} />
                  <TableHeader label="Chargement" sortKey="cargo" table={tripTable} />
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Observation</th>
                  <TableHeader label="Statut" sortKey="status" table={tripTable} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tripTable.paginatedData.map((trip: any) => (
                <tr key={trip.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-6 text-sm font-bold text-gray-500">{new Date(trip.date).toLocaleDateString()}</td>
                  <td className="px-8 py-6">
                    <span className="bg-primary/5 text-primary px-3 py-1 rounded-lg text-xs font-black border border-primary/10 uppercase">
                      {trip.truck.registration}
                    </span>
                  </td>
                  <td className="px-8 py-6 font-black text-gray-800 tracking-tight">{trip.destination}</td>
                  <td className="px-8 py-6 text-sm font-medium text-gray-600">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-blue-400" />
                      {trip.cargo}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-xs text-gray-400 italic">
                    {trip.observation || "Aucune observation"}
                  </td>
                  <td className="px-8 py-6">
                    {trip.status === 'TERMINE' ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-700">
                        Terminé
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCompleteTrip(trip.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 hover:bg-primary hover:text-white transition-all"
                        title="Marquer comme terminé"
                      >
                        En cours — Terminer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {currentView === 'expenses' && (
        <div className="animate-in slide-in-from-bottom-4 duration-300">
          <SearchBar table={expenseTable} placeholder="Rechercher une dépense..." />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <TableHeader label="Date" sortKey="date" table={expenseTable} />
                  <TableHeader label="Véhicule" sortKey="truckId" table={expenseTable} />
                  <TableHeader label="Nature" sortKey="type" table={expenseTable} />
                  <TableHeader label="Montant" sortKey="amount" table={expenseTable} />
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Observation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenseTable.paginatedData.map((exp: any) => (
                <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-6 text-sm font-bold text-gray-500">{new Date(exp.date).toLocaleDateString()}</td>
                  <td className="px-8 py-6">
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-black border border-gray-200 uppercase">
                      {exp.truck.registration}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      {exp.type === 'Carburant' ? <Fuel className="w-4 h-4 text-orange-500" /> : <Wrench className="w-4 h-4 text-blue-500" />}
                      <span className="text-sm font-black text-gray-700 tracking-tight">{exp.type}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className="text-lg font-black text-red-600">
                      -{exp.amount.toLocaleString()} <span className="text-[10px] opacity-40">FCFA</span>
                    </span>
                  </td>
                  <td className="px-8 py-6 text-xs text-gray-400 italic">
                    {exp.observation || "Aucune observation"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {currentView === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full animate-in zoom-in-95 duration-300">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
            <h4 className="font-black text-gray-800 tracking-tight mb-6 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary" />
              Répartition Globale des Coûts
            </h4>
            <div className="flex-1 min-h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(allExpenses.reduce((acc, e) => {
                      acc[e.type] = (acc[e.type] || 0) + e.amount;
                      return acc;
                    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }))}
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
            <h4 className="font-black text-gray-800 tracking-tight mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Coûts par Véhicule (Total)
            </h4>
            <div className="flex-1 min-h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trucks.map(t => ({
                  name: t.registration,
                  amount: t.expenses?.reduce((acc, e) => acc + e.amount, 0) || 0
                }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 'bold'}} />
                  <Tooltip cursor={{fill: '#f9fafb'}} />
                  <Bar dataKey="amount" fill="#1a4d2e" radius={[10, 10, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

          {/* ... autres vues existantes ... */}
        </>
      )}

      {/* Add Trip Modal */}
      {showTripModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">Nouveau Trajet</h3>
              <button onClick={() => setShowTripModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleRecordTrip} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Véhicule</label>
                  <select 
                    required 
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" 
                    value={tripFormData.truckId} 
                    onChange={e => setTripFormData({...tripFormData, truckId: e.target.value})}
                  >
                    <option value="">-- Sélectionner --</option>
                    {trucks.map(t => (
                      <option key={t.id} value={t.id}>{t.registration} - {t.brand}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Destination</label>
                  <input type="text" required placeholder="Ex: Port de San Pedro" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={tripFormData.destination} onChange={e => setTripFormData({...tripFormData, destination: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Chargement / Cargo</label>
                  <input type="text" required placeholder="Ex: 30T de Caoutchouc" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={tripFormData.cargo} onChange={e => setTripFormData({...tripFormData, cargo: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Date</label>
                  <input type="date" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={tripFormData.date} onChange={e => setTripFormData({...tripFormData, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Observation</label>
                  <textarea className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold h-20" placeholder="Notes éventuelles..." value={tripFormData.observation} onChange={e => setTripFormData({...tripFormData, observation: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black tracking-widest hover:bg-opacity-90 transition-all shadow-xl shadow-primary/20">
                Enregistrer le Trajet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">Frais & Entretien</h3>
              <button onClick={() => setShowExpenseModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleRecordExpense} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Véhicule</label>
                  <select 
                    required 
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" 
                    value={expenseFormData.truckId} 
                    onChange={e => setExpenseFormData({...expenseFormData, truckId: e.target.value})}
                  >
                    <option value="">-- Sélectionner --</option>
                    {trucks.map(t => (
                      <option key={t.id} value={t.id}>{t.registration} - {t.brand}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Nature de la dépense</label>
                  <select className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={expenseFormData.type} onChange={e => setExpenseFormData({...expenseFormData, type: e.target.value})}>
                    {["Carburant", "Entretien", "Réparation", "Péage", "Amende", "Assurance", "Autre"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Montant (FCFA)</label>
                  <input type="number" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={expenseFormData.amount} onChange={e => setExpenseFormData({...expenseFormData, amount: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Date</label>
                  <input type="date" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={expenseFormData.date} onChange={e => setExpenseFormData({...expenseFormData, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Observation</label>
                  <textarea className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold h-20" placeholder="Détails de l'opération..." value={expenseFormData.observation} onChange={e => setExpenseFormData({...expenseFormData, observation: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black tracking-widest hover:bg-opacity-90 transition-all shadow-xl shadow-primary/20">
                Enregistrer la Dépense
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Truck Detail Modal (Individual) */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                  <TruckIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{showDetailModal.registration} - {showDetailModal.brand} {showDetailModal.model}</h3>
                  <p className="text-sm text-gray-500">
                    Chauffeur: {showDetailModal.driver ? `${showDetailModal.driver.firstName} ${showDetailModal.driver.lastName}` : "N/A"} | 
                    Convoyeur: {showDetailModal.conveyor ? `${showDetailModal.conveyor.firstName} ${showDetailModal.conveyor.lastName}` : "N/A"}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(null)} className="p-2 hover:bg-gray-200 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex border-b">
              {['trips', 'expenses', 'analytics'].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveDetailTab(tab as any)}
                  className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors uppercase tracking-widest ${activeDetailTab === tab ? 'border-b-2 border-primary text-primary bg-primary/5' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  {tab === 'trips' && <MapPin className="w-4 h-4" />}
                  {tab === 'expenses' && <Fuel className="w-4 h-4" />}
                  {tab === 'analytics' && <BarChart3 className="w-4 h-4" />}
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Content for individual truck details can be simplified here as global views are now available */}
              <div className="text-center py-20 text-gray-400 italic">
                Utilisez les onglets principaux pour une gestion globale, ou gérez les trajets/dépenses spécifiques ici.
                {/* I could add forms here but keeping it simple for the professional structure */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
