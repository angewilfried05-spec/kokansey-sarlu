import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  RotateCcw, 
  BookOpen, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  ShoppingCart, 
  CreditCard, 
  FileText,
  X,
  Plus
} from "lucide-react";
import { fetchWithAuth } from "../lib/api";
import { cn } from "../lib/utils";

interface MonthlyCounter {
  id: string;
  month: string;
  year: number;
  monthNumber: number;
  salesCount: number;
  expensesCount: number;
  stockMovementsCount: number;
  harvestsCount: number;
  totalSalesAmount: number;
  totalExpensesAmount: number;
  notes?: string;
  resetAt?: string;
  resetBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface JournalEntry {
  id: string;
  month: string;
  date: string;
  type: string;
  description: string;
  amount?: number;
  metadata?: string;
  createdAt: string;
}

export default function MonthlyReportPage() {
  const [currentCounter, setCurrentCounter] = useState<MonthlyCounter | null>(null);
  const [allCounters, setAllCounters] = useState<MonthlyCounter[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [resetNotes, setResetNotes] = useState("");
  const [journalForm, setJournalForm] = useState({
    type: "NOTE",
    description: "",
    amount: ""
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [counterRes, countersRes, journalRes] = await Promise.all([
        fetchWithAuth("/api/monthly/counter"),
        fetchWithAuth("/api/monthly/counters"),
        fetchWithAuth("/api/monthly/journal")
      ]);
      
      const counterData = await counterRes.json();
      const countersData = await countersRes.json();
      const journalData = await journalRes.json();
      
      setCurrentCounter(counterData);
      setAllCounters(countersData);
      setJournal(journalData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReset = async () => {
    try {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const res = await fetchWithAuth("/api/monthly/reset", {
        method: 'POST',
        body: JSON.stringify({
          month: monthKey,
          notes: resetNotes
        })
      });
      
      if (res.ok) {
        setShowResetModal(false);
        setResetNotes("");
        fetchData();
      }
    } catch (error) {
      console.error("Error resetting counter:", error);
    }
  };

  const handleAddJournalEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const res = await fetchWithAuth("/api/monthly/journal", {
        method: 'POST',
        body: JSON.stringify({
          month: monthKey,
          ...journalForm,
          amount: journalForm.amount ? parseFloat(journalForm.amount) : undefined
        })
      });
      
      if (res.ok) {
        setShowJournalModal(false);
        setJournalForm({ type: "NOTE", description: "", amount: "" });
        fetchData();
      }
    } catch (error) {
      console.error("Error adding journal entry:", error);
    }
  };

  const getMonthName = (monthNumber: number) => {
    const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    return months[monthNumber - 1];
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    return `${getMonthName(parseInt(month))} ${year}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Rapport Mensuel</h2>
          <p className="text-gray-500 font-medium italic">Compteurs et journal de bord</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowJournalModal(true)}
            className="bg-white text-primary border-2 border-primary/20 px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-primary hover:text-white transition-all font-bold shadow-sm"
          >
            <BookOpen className="w-5 h-5" />
            Ajouter Note
          </button>
          <button 
            onClick={() => setShowResetModal(true)}
            className="bg-red-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-red-700 transition-all font-bold shadow-lg shadow-red-200"
          >
            <RotateCcw className="w-5 h-5" />
            Remise à Zéro
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 italic">Chargement...</div>
      ) : (
        <>
          {/* Current Month Stats */}
          {currentCounter && (
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-800 uppercase">
                  {formatMonth(currentCounter.month)}
                </h3>
                <span className="text-sm font-bold text-gray-400">
                  {currentCounter.resetAt ? `Remis à zéro le ${new Date(currentCounter.resetAt).toLocaleDateString()}` : "En cours"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-green-50 p-6 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <ShoppingCart className="w-5 h-5 text-green-600" />
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Ventes</span>
                  </div>
                  <p className="text-2xl font-black text-green-600">{currentCounter.salesCount}</p>
                  <p className="text-sm font-bold text-gray-500">{currentCounter.totalSalesAmount.toLocaleString()} FCFA</p>
                </div>

                <div className="bg-red-50 p-6 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <CreditCard className="w-5 h-5 text-red-600" />
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Dépenses</span>
                  </div>
                  <p className="text-2xl font-black text-red-600">{currentCounter.expensesCount}</p>
                  <p className="text-sm font-bold text-gray-500">{currentCounter.totalExpensesAmount.toLocaleString()} FCFA</p>
                </div>

                <div className="bg-blue-50 p-6 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Stocks</span>
                  </div>
                  <p className="text-2xl font-black text-blue-600">{currentCounter.stockMovementsCount}</p>
                  <p className="text-sm font-bold text-gray-500">Mouvements</p>
                </div>

                <div className="bg-amber-50 p-6 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Récoltes</span>
                  </div>
                  <p className="text-2xl font-black text-amber-600">{currentCounter.harvestsCount}</p>
                  <p className="text-sm font-bold text-gray-500">Enregistrées</p>
                </div>
              </div>

              {currentCounter.notes && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Notes</p>
                  <p className="text-sm font-bold text-gray-700">{currentCounter.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Monthly Journal */}
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black text-gray-800 uppercase mb-6">Journal de Bord</h3>
            
            {journal.length === 0 ? (
              <div className="text-center py-10 text-gray-400 italic">
                Aucune entrée dans le journal ce mois-ci
              </div>
            ) : (
              <div className="space-y-4">
                {journal.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className={cn(
                      "p-2 rounded-lg",
                      entry.type === 'SALE' ? 'bg-green-100 text-green-600' :
                      entry.type === 'EXPENSE' ? 'bg-red-100 text-red-600' :
                      entry.type === 'HARVEST' ? 'bg-amber-100 text-amber-600' :
                      entry.type === 'STOCK' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-200 text-gray-600'
                    )}>
                      {entry.type === 'SALE' ? <ShoppingCart className="w-4 h-4" /> :
                       entry.type === 'EXPENSE' ? <CreditCard className="w-4 h-4" /> :
                       entry.type === 'HARVEST' ? <TrendingUp className="w-4 h-4" /> :
                       entry.type === 'STOCK' ? <Package className="w-4 h-4" /> :
                       <FileText className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-black text-gray-800 uppercase">{entry.description}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(entry.date).toLocaleDateString('fr-FR', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        {entry.amount && (
                          <span className="text-sm font-bold text-gray-600">
                            {entry.amount.toLocaleString()} FCFA
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historical Counters */}
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black text-gray-800 uppercase mb-6">Historique Mensuel</h3>
            
            <div className="space-y-4">
              {allCounters.map((counter) => (
                <div key={counter.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-black text-gray-800 uppercase">{formatMonth(counter.month)}</p>
                    <p className="text-xs text-gray-400">
                      {counter.salesCount} ventes • {counter.expensesCount} dépenses • {counter.harvestsCount} récoltes
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-bold",
                      counter.totalSalesAmount - counter.totalExpensesAmount >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {(counter.totalSalesAmount - counter.totalExpensesAmount).toLocaleString()} FCFA
                    </p>
                    <p className="text-xs text-gray-400">Solde</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[80] backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">Remise à Zéro</h3>
              <button onClick={() => setShowResetModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                <p className="text-sm font-bold text-amber-800">
                  ⚠️ Cette action remettra tous les compteurs du mois en cours à zéro.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Notes (optionnel)</label>
                <textarea 
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold h-20" 
                  placeholder="Raison de la remise à zéro..."
                  value={resetNotes}
                  onChange={e => setResetNotes(e.target.value)}
                />
              </div>

              <button 
                onClick={handleReset}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-200"
              >
                Confirmer la Remise à Zéro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Journal Modal */}
      {showJournalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[80] backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">Ajouter une Note</h3>
              <button onClick={() => setShowJournalModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddJournalEntry} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Type</label>
                <select 
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                  value={journalForm.type}
                  onChange={e => setJournalForm({...journalForm, type: e.target.value})}
                >
                  <option value="NOTE">Note</option>
                  <option value="SALE">Vente</option>
                  <option value="EXPENSE">Dépense</option>
                  <option value="HARVEST">Récolte</option>
                  <option value="STOCK">Stock</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Description</label>
                <textarea 
                  required
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold h-20" 
                  placeholder="Description de l'entrée..."
                  value={journalForm.description}
                  onChange={e => setJournalForm({...journalForm, description: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Montant (optionnel)</label>
                <input 
                  type="number"
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                  placeholder="Montant en FCFA"
                  value={journalForm.amount}
                  onChange={e => setJournalForm({...journalForm, amount: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-xl shadow-primary/20"
              >
                Ajouter au Journal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
