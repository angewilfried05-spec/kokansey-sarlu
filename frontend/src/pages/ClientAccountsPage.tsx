import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  X,
  Phone,
  Mail,
  MapPin,
  UserCircle,
  Wallet,
  ChevronDown,
  Building2,
  Users,
  Filter,
  Edit,
  Trash2
} from "lucide-react";
import { fetchWithAuth } from "../lib/api";
import { cn } from "../lib/utils";
import ConfirmationModal from "../components/ConfirmationModal";

interface Client {
  id: string;
  nom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  typeClient: "particulier" | "entreprise" | "cooperative";
  actif: boolean;
  solde: number;
  _count?: { operations: number };
}

interface OperationClient {
  id: string;
  clientId: string;
  typeOperation: "vente" | "paiement" | "avance" | "depense";
  montant: number;
  description?: string;
  reference?: string;
  modePaiement?: string;
  dateOperation: string;
  creePar?: string;
  soldeApresOperation: number;
}

interface ReleveCompte {
  soldeInitial: number;
  soldeActuel: number;
  operations: OperationClient[];
}

const TYPES_OPERATION = [
  { value: "vente", label: "Vente", couleur: "bg-green-50 text-green-700 border-green-100" },
  { value: "paiement", label: "Paiement", couleur: "bg-blue-50 text-blue-700 border-blue-100" },
  { value: "avance", label: "Avance", couleur: "bg-purple-50 text-purple-700 border-purple-100" },
  { value: "depense", label: "Dépense", couleur: "bg-orange-50 text-orange-700 border-orange-100" },
] as const;

const MODES_PAIEMENT = [
  { value: "espece", label: "Espèces" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement" },
  { value: "mobile_money", label: "Mobile Money" },
];

const TYPES_CLIENT = [
  { value: "particulier", label: "Particulier", icon: UserCircle },
  { value: "entreprise", label: "Entreprise", icon: Building2 },
  { value: "cooperative", label: "Coopérative", icon: Users },
];

function formatMontant(montant: number) {
  return `${montant.toLocaleString("fr-FR")} FCFA`;
}

function getLibelleType(type: string) {
  return TYPES_OPERATION.find(t => t.value === type)?.label || type;
}

function getCouleurType(type: string) {
  return TYPES_OPERATION.find(t => t.value === type)?.couleur || "bg-gray-50 text-gray-700 border-gray-100";
}

function getSoldeClasses(solde: number) {
  if (solde > 0) return "text-red-600";
  if (solde < 0) return "text-green-600";
  return "text-gray-500";
}

function getSoldeLabel(solde: number) {
  if (solde > 0) return "Le client doit";
  if (solde < 0) return "Crédit client";
  return "Compte soldé";
}

import { useToast } from "../contexts/ToastContext";
import { useConfirm } from "../contexts/ConfirmContext";
export default function ClientAccountsPage() {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user.role || "GERANT";
  const isAdmin = role === "ADMIN" || user?.username === "KOKANSEY GROUP";
  const isGerant = role === "GERANT" || isAdmin;
  const isCommercial = role === "COMMERCIAL" || isGerant;

  const [clients, setClients] = useState<Client[]>([]);
  const [clientSelectionne, setClientSelectionne] = useState<Client | null>(null);
  const [releve, setReleve] = useState<ReleveCompte | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingReleve, setLoadingReleve] = useState(false);

  const [recherche, setRecherche] = useState("");
  const [filtreActif, setFiltreActif] = useState<"tous" | "actif" | "inactif">("actif");
  const [filtreDateDebut, setFiltreDateDebut] = useState("");
  const [filtreDateFin, setFiltreDateFin] = useState("");
  const [filtreTypeOperation, setFiltreTypeOperation] = useState("");

  const [showModalClient, setShowModalClient] = useState(false);
  const [showModalOperation, setShowModalOperation] = useState(false);
  const [operationEnEdition, setOperationEnEdition] = useState<OperationClient | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingClient, setDeletingClient] = useState(false);

  const [formClient, setFormClient] = useState({
    nom: "",
    telephone: "",
    email: "",
    adresse: "",
    typeClient: "particulier" as Client["typeClient"],
    actif: true,
  });

  const [formOperation, setFormOperation] = useState({
    typeOperation: "vente" as OperationClient["typeOperation"],
    montant: "",
    description: "",
    reference: "",
    modePaiement: "espece",
    dateOperation: new Date().toISOString().split("T")[0],
  });

  const chargerClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const params = new URLSearchParams();
      if (recherche) params.append("search", recherche);
      if (filtreActif === "actif") params.append("actif", "true");
      if (filtreActif === "inactif") params.append("actif", "false");

      const res = await fetchWithAuth(`/api/clients?${params.toString()}`);
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erreur chargement clients:", error);
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  }, [recherche, filtreActif]);

  const chargerReleve = useCallback(async (clientId: string) => {
    setLoadingReleve(true);
    try {
      const params = new URLSearchParams();
      if (filtreDateDebut) params.append("date_debut", filtreDateDebut);
      if (filtreDateFin) params.append("date_fin", filtreDateFin);
      if (filtreTypeOperation) params.append("type_operation", filtreTypeOperation);

      const res = await fetchWithAuth(`/api/clients/${clientId}/operations?${params.toString()}`);
      const data = await res.json();

      if (Array.isArray(data)) {
        setReleve({
          soldeInitial: 0,
          soldeActuel: data.length > 0 ? data[data.length - 1].soldeApresOperation : 0,
          operations: data,
        });
      } else {
        setReleve(data);
      }
    } catch (error) {
      console.error("Erreur chargement relevé:", error);
      setReleve(null);
    } finally {
      setLoadingReleve(false);
    }
  }, [filtreDateDebut, filtreDateFin, filtreTypeOperation]);

  useEffect(() => {
    chargerClients();
  }, [chargerClients]);

  useEffect(() => {
    if (clientSelectionne) {
      chargerReleve(clientSelectionne.id);
    }
  }, [clientSelectionne, chargerReleve]);

  const selectionnerClient = (client: Client) => {
    setClientSelectionne(client);
  };

  const resetFormClient = () => {
    setFormClient({
      nom: "",
      telephone: "",
      email: "",
      adresse: "",
      typeClient: "particulier",
      actif: true,
    });
  };

  const resetFormOperation = () => {
    setFormOperation({
      typeOperation: "vente",
      montant: "",
      description: "",
      reference: "",
      modePaiement: "espece",
      dateOperation: new Date().toISOString().split("T")[0],
    });
    setOperationEnEdition(null);
  };

  const ouvrirModalOperation = (operation?: OperationClient) => {
    if (operation) {
      setOperationEnEdition(operation);
      setFormOperation({
        typeOperation: operation.typeOperation,
        montant: operation.montant.toString(),
        description: operation.description || "",
        reference: operation.reference || "",
        modePaiement: operation.modePaiement || "espece",
        dateOperation: operation.dateOperation.split("T")[0],
      });
    } else {
      resetFormOperation();
    }
    setShowModalOperation(true);
  };

  const rafraichirDonneesClient = async () => {
    if (!clientSelectionne) return;
    await chargerClients();
    await chargerReleve(clientSelectionne.id);
    const detailRes = await fetchWithAuth(`/api/clients/${clientSelectionne.id}`);
    const detail = await detailRes.json();
    setClientSelectionne(detail);
  };

  const handleCreerClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth("/api/clients", {
        method: "POST",
        body: JSON.stringify(formClient),
      });
      if (!res.ok) throw new Error("Erreur création");
      const nouveauClient = await res.json();
      setShowModalClient(false);
      resetFormClient();
      await chargerClients();
      setClientSelectionne({ ...nouveauClient, solde: 0 });
    } catch (error) {
      console.error(error);
      toast.error("Impossible de créer le client.");
    }
  };

  const handleEnregistrerOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientSelectionne) return;

    try {
      const payload: Record<string, unknown> = {
        typeOperation: formOperation.typeOperation,
        montant: parseFloat(formOperation.montant),
        description: formOperation.description || undefined,
        reference: formOperation.reference || undefined,
        dateOperation: formOperation.dateOperation,
      };

      if (formOperation.typeOperation === "paiement" || formOperation.typeOperation === "avance") {
        payload.modePaiement = formOperation.modePaiement;
      }

      const url = operationEnEdition
        ? `/api/operations/${operationEnEdition.id}`
        : `/api/clients/${clientSelectionne.id}/operations`;

      const res = await fetchWithAuth(url, {
        method: operationEnEdition ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur opération");
      }

      setShowModalOperation(false);
      resetFormOperation();
      await rafraichirDonneesClient();
    } catch (error) {
      console.error(error);
      toast.error(operationEnEdition ? "Impossible de modifier l'opération." : "Impossible d'ajouter l'opération.");
    }
  };

  const handleSupprimerClient = async () => {
    if (!clientSelectionne) return;
    setDeletingClient(true);

    try {
      const res = await fetchWithAuth(`/api/clients/${clientSelectionne.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur suppression");
      }
      setClientSelectionne(null);
      setReleve(null);
      await chargerClients();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer le client. Réservé aux administrateurs.");
    } finally {
      setDeletingClient(false);
    }
  };

  const handleSupprimerOperation = async (operation: OperationClient) => {
    if (!clientSelectionne) return;
    if (!(await confirmDialog(`Supprimer cette opération (${getLibelleType(operation.typeOperation)} — ${formatMontant(operation.montant)}) ?`))) return;

    try {
      const res = await fetchWithAuth(`/api/operations/${operation.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur suppression");
      await rafraichirDonneesClient();
    } catch (error) {
      console.error(error);
      toast.error("Impossible de supprimer l'opération. Réservé aux administrateurs.");
    }
  };

  useEffect(() => {
    if (clientSelectionne) {
      const misAJour = clients.find(c => c.id === clientSelectionne.id);
      if (misAJour && misAJour.solde !== clientSelectionne.solde) {
        setClientSelectionne(misAJour);
      }
    }
  }, [clients, clientSelectionne]);

  const soldeActuel = clientSelectionne?.solde ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Comptes Clients</h2>
          <p className="text-gray-500 font-medium italic">Suivi des ventes, avances et paiements par client</p>
        </div>
        {isGerant && (
          <button
            onClick={() => { resetFormClient(); setShowModalClient(true); }}
            className="bg-primary text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-opacity-90 transition-all font-bold shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            Nouveau Client
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[calc(100vh-12rem)]">
        {/* Colonne gauche — Liste des clients */}
        <div className="xl:col-span-4 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un client..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <div className="flex bg-gray-50 p-1 rounded-xl flex-1">
                {[
                  { id: "actif", label: "Actifs" },
                  { id: "inactif", label: "Inactifs" },
                  { id: "tous", label: "Tous" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFiltreActif(f.id as typeof filtreActif)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      filtreActif === f.id ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loadingClients ? (
              <div className="p-8 text-center text-gray-400 italic">Chargement...</div>
            ) : clients.length === 0 ? (
              <div className="p-8 text-center text-gray-400 italic">Aucun client trouvé</div>
            ) : (
              clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => selectionnerClient(client)}
                  className={cn(
                    "w-full text-left p-5 border-b border-gray-50 transition-all hover:bg-gray-50/80",
                    clientSelectionne?.id === client.id && "bg-primary/5 border-l-4 border-l-primary"
                  )}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm shrink-0">
                        {client.nom.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-gray-800 tracking-tight truncate">{client.nom}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {client.typeClient} · {client._count?.operations || 0} op.
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn("text-sm font-black", getSoldeClasses(client.solde))}>
                        {formatMontant(Math.abs(client.solde))}
                      </p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">
                        {client.solde > 0 ? "Doit" : client.solde < 0 ? "Crédit" : "Soldé"}
                      </p>
                    </div>
                  </div>
                  {!client.actif && (
                    <span className="mt-2 inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-black uppercase rounded">Inactif</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Colonne droite — Relevé de compte */}
        <div className="xl:col-span-8 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {!clientSelectionne ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <Wallet className="w-16 h-16 text-gray-200 mb-4" />
              <h3 className="text-xl font-black text-gray-400 tracking-tight">Sélectionnez un client</h3>
              <p className="text-gray-400 italic mt-2">Choisissez un client dans la liste pour voir son relevé de compte</p>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-gray-50">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">{clientSelectionne.nom}</h3>
                      {isAdmin && (
                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                          title="Supprimer le client"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                      {clientSelectionne.telephone && (
                        <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{clientSelectionne.telephone}</span>
                      )}
                      {clientSelectionne.email && (
                        <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{clientSelectionne.email}</span>
                      )}
                      {clientSelectionne.adresse && (
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{clientSelectionne.adresse}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Solde actuel</p>
                    <p className={cn("text-4xl font-black", getSoldeClasses(soldeActuel))}>
                      {formatMontant(Math.abs(soldeActuel))}
                    </p>
                    <p className={cn("text-xs font-bold uppercase mt-1", getSoldeClasses(soldeActuel))}>
                      {getSoldeLabel(soldeActuel)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-6">
                  <input
                    type="date"
                    value={filtreDateDebut}
                    onChange={(e) => setFiltreDateDebut(e.target.value)}
                    className="bg-gray-50 border-none px-4 py-2 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="text-gray-400 font-bold">au</span>
                  <input
                    type="date"
                    value={filtreDateFin}
                    onChange={(e) => setFiltreDateFin(e.target.value)}
                    className="bg-gray-50 border-none px-4 py-2 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="relative">
                    <select
                      value={filtreTypeOperation}
                      onChange={(e) => setFiltreTypeOperation(e.target.value)}
                      className="appearance-none bg-gray-50 border-none px-4 py-2 pr-10 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Tous les types</option>
                      {TYPES_OPERATION.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  {isCommercial && (
                    <button
                      onClick={() => ouvrirModalOperation()}
                      className="ml-auto bg-primary text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-opacity-90 transition-all font-bold text-sm shadow-lg shadow-primary/20"
                    >
                      <Plus className="w-4 h-4" />
                      Nouvelle Opération
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {loadingReleve ? (
                  <div className="p-12 text-center text-gray-400 italic">Chargement du relevé...</div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Référence</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Montant</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Solde</th>
                        {(isGerant || isAdmin) && (
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {releve && releve.soldeInitial !== 0 && filtreDateDebut && (
                        <tr className="bg-gray-50/50">
                          <td className="px-6 py-4 text-sm font-bold text-gray-400" colSpan={4}>
                            Solde reporté avant le {new Date(filtreDateDebut).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="px-6 py-4" />
                          <td className={cn("px-6 py-4 text-sm font-black text-right", getSoldeClasses(releve.soldeInitial))}>
                            {formatMontant(Math.abs(releve.soldeInitial))}
                          </td>
                          {(isGerant || isAdmin) && <td className="px-6 py-4" />}
                        </tr>
                      )}
                      {!releve || releve.operations.length === 0 ? (
                        <tr>
                          <td colSpan={(isGerant || isAdmin) ? 7 : 6} className="px-6 py-16 text-center text-gray-400 italic">
                            Aucune opération enregistrée
                          </td>
                        </tr>
                      ) : (
                        releve.operations.map((op) => (
                          <tr key={op.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-4 text-sm font-bold text-gray-500">
                              {new Date(op.dateOperation).toLocaleDateString("fr-FR")}
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn("px-3 py-1 text-[10px] font-black uppercase rounded-lg border", getCouleurType(op.typeOperation))}>
                                {getLibelleType(op.typeOperation)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-600 max-w-[200px] truncate">
                              {op.description || "—"}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-gray-400">
                              {op.reference || "—"}
                            </td>
                            <td className={cn(
                              "px-6 py-4 text-sm font-black text-right",
                              op.typeOperation === "vente" || op.typeOperation === "depense" ? "text-red-600" : "text-green-600"
                            )}>
                              {op.typeOperation === "vente" || op.typeOperation === "depense" ? "+" : "-"}
                              {op.montant.toLocaleString("fr-FR")}
                            </td>
                            <td className={cn("px-6 py-4 text-sm font-black text-right", getSoldeClasses(op.soldeApresOperation))}>
                              {formatMontant(Math.abs(op.soldeApresOperation))}
                            </td>
                            {(isGerant || isAdmin) && (
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {isGerant && (
                                    <button
                                      onClick={() => ouvrirModalOperation(op)}
                                      className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl transition-all"
                                      title="Modifier"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                  )}
                                  {isAdmin && (
                                    <button
                                      onClick={() => handleSupprimerOperation(op)}
                                      className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal — Nouveau client */}
      {showModalClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">Nouveau Client</h3>
              <button onClick={() => { setShowModalClient(false); resetFormClient(); }} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreerClient} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Nom *</label>
                <input
                  type="text"
                  required
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                  value={formClient.nom}
                  onChange={(e) => setFormClient({ ...formClient, nom: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Téléphone</label>
                  <input
                    type="text"
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                    value={formClient.telephone}
                    onChange={(e) => setFormClient({ ...formClient, telephone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Type</label>
                  <select
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                    value={formClient.typeClient}
                    onChange={(e) => setFormClient({ ...formClient, typeClient: e.target.value as Client["typeClient"] })}
                  >
                    {TYPES_CLIENT.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Email</label>
                <input
                  type="email"
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                  value={formClient.email}
                  onChange={(e) => setFormClient({ ...formClient, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Adresse</label>
                <input
                  type="text"
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                  value={formClient.adresse}
                  onChange={(e) => setFormClient({ ...formClient, adresse: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-white py-4 rounded-2xl font-black tracking-widest hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                Créer le client
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal — Nouvelle / modifier opération */}
      {showModalOperation && clientSelectionne && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">
                  {operationEnEdition ? "Modifier l'Opération" : "Nouvelle Opération"}
                </h3>
                <p className="text-sm text-gray-400 font-medium italic mt-1">{clientSelectionne.nom}</p>
              </div>
              <button onClick={() => { setShowModalOperation(false); resetFormOperation(); }} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleEnregistrerOperation} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Type d'opération *</label>
                <select
                  required
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                  value={formOperation.typeOperation}
                  onChange={(e) => setFormOperation({ ...formOperation, typeOperation: e.target.value as OperationClient["typeOperation"] })}
                >
                  {TYPES_OPERATION.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Montant (FCFA) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                    value={formOperation.montant}
                    onChange={(e) => setFormOperation({ ...formOperation, montant: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Date *</label>
                  <input
                    type="date"
                    required
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                    value={formOperation.dateOperation}
                    onChange={(e) => setFormOperation({ ...formOperation, dateOperation: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Description</label>
                <input
                  type="text"
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                  placeholder="Ex: Vente de caoutchouc, 500 kg"
                  value={formOperation.description}
                  onChange={(e) => setFormOperation({ ...formOperation, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Référence</label>
                <input
                  type="text"
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                  placeholder="Ex: FACT-2026-001"
                  value={formOperation.reference}
                  onChange={(e) => setFormOperation({ ...formOperation, reference: e.target.value })}
                />
              </div>
              {(formOperation.typeOperation === "paiement" || formOperation.typeOperation === "avance") && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Mode de paiement</label>
                  <select
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                    value={formOperation.modePaiement}
                    onChange={(e) => setFormOperation({ ...formOperation, modePaiement: e.target.value })}
                  >
                    {MODES_PAIEMENT.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-primary text-white py-4 rounded-2xl font-black tracking-widest hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                {operationEnEdition ? "Enregistrer les modifications" : "Enregistrer l'opération"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal — Confirmation suppression client */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleSupprimerClient}
        title="Supprimer le client"
        message={`Voulez-vous vraiment supprimer "${clientSelectionne?.nom}" ? Cette action est définitive. Si le client possède des opérations ou des factures, la suppression sera refusée — désactivez-le à la place.`}
        confirmText={deletingClient ? "Suppression..." : "Supprimer"}
        cancelText="Annuler"
        variant="danger"
      />
    </div>
  );
}
