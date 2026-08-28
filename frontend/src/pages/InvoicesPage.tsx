import { useEffect, useState } from "react";
import { Plus, Search, FileText, Printer, CreditCard, Trash2, X, Send, Settings } from "lucide-react";
import { useDataTable } from "../hooks/useDataTable";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import Toast, { ToastType } from "../components/Toast";
import Modal from "../components/Modal";
import { fetchWithAuth } from "../lib/api";
import { getInvoiceHTML, InvoiceTemplate, defaultInvoiceTemplate } from "../lib/invoiceTemplate";
import { escapeHtml } from "../lib/utils";

interface Invoice {
  id: string;
  numero: string;
  clientId: string;
  client: { id: string; nom: string; telephone?: string; email?: string; adresse?: string };
  dateEmission: string;
  dateEcheance: string | null;
  montantTotal: number;
  montantPaye: number;
  statut: string;
  notes: string | null;
  mentionsLegales: string | null;
  items: InvoiceItem[];
  operations: any[];
  createdAt: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  saleId?: string;
  sale?: any;
}

interface Client {
  id: string;
  nom: string;
  telephone?: string;
}

interface Sale {
  id: string;
  product: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  date: string;
  clientId: string | null;
  client: string | null;
  invoiceId?: string | null;
  speculation: { name: string };
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    clientId: "",
    dateEcheance: "",
    notes: "",
    mentionsLegales: "TVA non applicable - Article 293 B du CGI"
  });

  const [items, setItems] = useState<{ description: string; quantity: number; unit: string; unitPrice: number; saleId?: string }[]>([
    { description: "", quantity: 1, unit: "kg", unitPrice: 0 }
  ]);

  const [paymentForm, setPaymentForm] = useState({ montant: 0, modePaiement: "espèces" });

  const [showSendPDFModal, setShowSendPDFModal] = useState(false);
  const [sendPDFForm, setSendPDFForm] = useState({ telephone: "", message: "" });
  const [selectedInvoiceForSend, setSelectedInvoiceForSend] = useState<Invoice | null>(null);

  const [invoiceTemplate, setInvoiceTemplate] = useState<InvoiceTemplate>(defaultInvoiceTemplate);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState<InvoiceTemplate>(defaultInvoiceTemplate);
  const [templateLoading, setTemplateLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === 'ADMIN' || user.username === 'KOKANSEY GROUP';
  const isGerant = user.role === 'GERANT' || isAdmin;

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invoicesRes, clientsRes, salesRes, templateRes] = await Promise.all([
        fetchWithAuth("/api/invoices"),
        fetchWithAuth("/api/clients?actif=true"),
        fetchWithAuth("/api/sales"),
        fetchWithAuth("/api/invoice-template")
      ]);

      if (invoicesRes.ok) setInvoices(await invoicesRes.json());
      if (clientsRes.ok) setClients(await clientsRes.json());
      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setSales(salesData.filter((s: Sale) => !s.invoiceId));
      }
      if (templateRes.ok) {
        const data = await templateRes.json();
        const t = { ...defaultInvoiceTemplate, ...data };
        setInvoiceTemplate(t);
        setTemplateForm(t);
        setFormData(prev => ({
          ...prev,
          notes: t.defaultNotes || prev.notes,
          mentionsLegales: t.legalMention || prev.mentionsLegales
        }));
      }
    } catch (error) {
      console.error("Erreur chargement données:", error);
      showToast("Erreur lors du chargement des données", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit: "kg", unitPrice: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "saleId" && value) {
      const sale = sales.find(s => s.id === value);
      if (sale) {
        newItems[index] = {
          description: `${sale.product} - ${sale.speculation?.name || 'Produit'}`,
          quantity: sale.quantity,
          unit: sale.unit,
          unitPrice: sale.unitPrice,
          saleId: sale.id
        };
      }
    }

    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId || items.length === 0 || items.some(i => !i.description || i.quantity <= 0 || i.unitPrice < 0)) {
      showToast("Veuillez remplir tous les champs obligatoires", "error");
      return;
    }

    try {
      const response = await fetchWithAuth("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          items: items.map(item => ({
            ...item,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice)
          }))
        })
      });

      if (response.ok) {
        showToast("Facture créée avec succès", "success");
        setShowCreateModal(false);
        setFormData({ clientId: "", dateEcheance: "", notes: "", mentionsLegales: "TVA non applicable - Article 293 B du CGI" });
        setItems([{ description: "", quantity: 1, unit: "kg", unitPrice: 0 }]);
        fetchData();
      } else {
        const error = await response.json();
        showToast(error.error || "Erreur lors de la création", "error");
      }
    } catch (error) {
      console.error("Erreur création facture:", error);
      showToast("Erreur lors de la création de la facture", "error");
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || paymentForm.montant <= 0) return;

    try {
      const response = await fetchWithAuth(`/api/invoices/${selectedInvoice.id}/payment`, {
        method: "POST",
        body: JSON.stringify(paymentForm)
      });

      if (response.ok) {
        showToast("Paiement enregistré avec succès", "success");
        setShowPaymentModal(false);
        setSelectedInvoice(null);
        setPaymentForm({ montant: 0, modePaiement: "espèces" });
        fetchData();
      } else {
        const error = await response.json();
        showToast(error.error || "Erreur lors du paiement", "error");
      }
    } catch (error) {
      console.error("Erreur paiement:", error);
      showToast("Erreur lors de l'enregistrement du paiement", "error");
    }
  };

  const openSendPDFModal = (invoice: Invoice) => {
    setSelectedInvoiceForSend(invoice);
    setSendPDFForm({
      telephone: invoice.client?.telephone || "",
      message: `Bonjour ${invoice.client?.nom || "Madame, Monsieur"},\nVoici votre facture ${invoice.numero} - Total : ${invoice.montantTotal.toLocaleString("fr-FR")} FCFA\nKOKANSEY SARLU`
    });
    setShowSendPDFModal(true);
  };

  const handleSendPDFWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForSend) return;

    try {
      const response = await fetchWithAuth(`/api/invoices/${selectedInvoiceForSend.id}/send-pdf`, {
        method: "POST",
        body: JSON.stringify(sendPDFForm)
      });

      if (response.ok) {
        showToast("Facture PDF envoyée par WhatsApp", "success");
        setShowSendPDFModal(false);
        setSelectedInvoiceForSend(null);
      } else {
        const error = await response.json();
        showToast(error.error || "Erreur lors de l'envoi WhatsApp", "error");
      }
    } catch (error) {
      console.error("Erreur envoi WhatsApp:", error);
      showToast("Erreur lors de l'envoi WhatsApp", "error");
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!window.confirm(`Supprimer la facture ${invoice.numero} ?`)) return;

    try {
      const response = await fetchWithAuth(`/api/invoices/${invoice.id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        showToast("Facture supprimée", "success");
        fetchData();
      } else {
        showToast("Erreur lors de la suppression", "error");
      }
    } catch (error) {
      console.error("Erreur suppression:", error);
      showToast("Erreur lors de la suppression", "error");
    }
  };

  const printInvoice = (invoice: Invoice) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(getInvoiceHTML(invoice, invoiceTemplate));
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const openTemplateModal = () => {
    setTemplateForm(invoiceTemplate);
    setShowTemplateModal(true);
  };

  const handleTemplateChange = (field: keyof InvoiceTemplate, value: any) => {
    setTemplateForm(prev => ({ ...prev, [field]: value }));
  };

  const saveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setTemplateLoading(true);
    try {
      const response = await fetchWithAuth("/api/invoice-template", {
        method: "PUT",
        body: JSON.stringify(templateForm)
      });
      if (response.ok) {
        const data = await response.json();
        const t = { ...defaultInvoiceTemplate, ...data };
        setInvoiceTemplate(t);
        setShowTemplateModal(false);
        showToast("Modèle de facture enregistré", "success");
      } else {
        const error = await response.json();
        showToast(error.error || "Erreur lors de l'enregistrement", "error");
      }
    } catch (error) {
      console.error("Erreur sauvegarde modèle:", error);
      showToast("Erreur lors de l'enregistrement du modèle", "error");
    } finally {
      setTemplateLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.client?.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.statut.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const {
    paginatedData,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    totalItems
  } = useDataTable(filteredInvoices);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAYEE': return 'bg-green-100 text-green-800';
      case 'PARTIELLEMENT_PAYEE': return 'bg-yellow-100 text-yellow-800';
      case 'EN_ATTENTE': return 'bg-blue-100 text-blue-800';
      case 'IMPAYEE': return 'bg-red-100 text-red-800';
      case 'ANNULEE': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAYEE': return 'Payée';
      case 'PARTIELLEMENT_PAYEE': return 'Partiellement payée';
      case 'EN_ATTENTE': return 'En attente';
      case 'IMPAYEE': return 'Impayée';
      case 'ANNULEE': return 'Annulée';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Facturation</h1>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une facture..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {isGerant && (
            <>
              <button
                onClick={openTemplateModal}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                title="Configurer le modèle de facture"
              >
                <Settings className="w-4 h-4" />
                Modèle
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nouvelle facture
              </button>
            </>
          )}
        </div>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          title="Aucune facture"
          description="Créez votre première facture pour commencer"
          icon="sales"
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Numéro</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Échéance</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Payé</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Statut</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {paginatedData.map((invoice: Invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-mono text-sm font-medium">{invoice.numero}</td>
                  <td className="px-4 py-3 text-sm">{invoice.client?.nom || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                    {new Date(invoice.dateEmission).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                    {invoice.dateEcheance ? new Date(invoice.dateEcheance).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    {invoice.montantTotal.toLocaleString()} FCFA
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {invoice.montantPaye.toLocaleString()} FCFA
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.statut)}`}>
                      {getStatusLabel(invoice.statut)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => printInvoice(invoice)}
                        className="p-1.5 text-gray-600 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                        title="Imprimer"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {isGerant && (
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setPaymentForm({
                              montant: Math.max(0, invoice.montantTotal - invoice.montantPaye),
                              modePaiement: "espèces"
                            });
                            setShowPaymentModal(true);
                          }}
                          className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Enregistrer un paiement"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                      )}
                      {isGerant && (
                        <button
                          onClick={() => openSendPDFModal(invoice)}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Envoyer PDF par WhatsApp"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(invoice)}
                          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            totalItems={totalItems}
          />
        </div>
      )}

      {/* Modal de création */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)} title="Nouvelle facture">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Client *</label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                  required
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Date d'échéance</label>
                <input
                  type="date"
                  value={formData.dateEcheance}
                  onChange={(e) => setFormData({ ...formData, dateEcheance: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Articles</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
                    <div className="col-span-4">
                      <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border rounded"
                        placeholder="Description"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">Qté</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-sm border rounded"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">Unité</label>
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => updateItem(index, "unit", e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border rounded"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">Prix unit.</label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-sm border rounded"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-1">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {sales.length > 0 && (
                      <div className="col-span-12">
                        <select
                          value={item.saleId || ""}
                          onChange={(e) => updateItem(index, "saleId", e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-slate-800"
                        >
                          <option value="">Sélectionner une vente existante (optionnel)</option>
                          {sales
                            .filter(s => !items.some(i => i.saleId === s.id && i.saleId !== item.saleId))
                            .map(sale => (
                              <option key={sale.id} value={sale.id}>
                                {sale.product} - {sale.quantity} {sale.unit} - {sale.totalPrice.toLocaleString()} FCFA
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-right text-lg font-bold mt-4">
                Total: {calculateTotal().toLocaleString()} FCFA
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Mentions légales</label>
              <input
                type="text"
                value={formData.mentionsLegales}
                onChange={(e) => setFormData({ ...formData, mentionsLegales: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Créer la facture
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de paiement */}
      {showPaymentModal && selectedInvoice && (
        <Modal onClose={() => setShowPaymentModal(false)} title={`Paiement - ${selectedInvoice.numero}`}>
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="bg-gray-50 dark:bg-slate-700/30 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Total: <span className="font-bold">{selectedInvoice.montantTotal.toLocaleString()} FCFA</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Payé: <span className="font-bold">{selectedInvoice.montantPaye.toLocaleString()} FCFA</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Reste: <span className="font-bold text-red-600">{(selectedInvoice.montantTotal - selectedInvoice.montantPaye).toLocaleString()} FCFA</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Montant du paiement *</label>
              <input
                type="number"
                value={paymentForm.montant}
                onChange={(e) => setPaymentForm({ ...paymentForm, montant: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                min="0"
                step="0.01"
                max={selectedInvoice.montantTotal - selectedInvoice.montantPaye}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Mode de paiement *</label>
              <select
                value={paymentForm.modePaiement}
                onChange={(e) => setPaymentForm({ ...paymentForm, modePaiement: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="espèces">Espèces</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="cheque">Chèque</option>
                <option value="virement">Virement bancaire</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Enregistrer le paiement
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal envoi PDF WhatsApp */}
      {showTemplateModal && isGerant && (
        <Modal onClose={() => setShowTemplateModal(false)} title="Configuration du modèle de facture">
          <form onSubmit={saveTemplate} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nom de l'entreprise</label>
                <input
                  type="text"
                  value={templateForm.companyName}
                  onChange={(e) => handleTemplateChange('companyName', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Sous-titre</label>
                <input
                  type="text"
                  value={templateForm.companySubtitle || ''}
                  onChange={(e) => handleTemplateChange('companySubtitle', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Adresse</label>
                <input
                  type="text"
                  value={templateForm.companyAddress || ''}
                  onChange={(e) => handleTemplateChange('companyAddress', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Téléphone</label>
                <input
                  type="text"
                  value={templateForm.companyPhone || ''}
                  onChange={(e) => handleTemplateChange('companyPhone', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="text"
                  value={templateForm.companyEmail || ''}
                  onChange={(e) => handleTemplateChange('companyEmail', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">URL du logo</label>
                <input
                  type="text"
                  value={templateForm.logoUrl || ''}
                  onChange={(e) => handleTemplateChange('logoUrl', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                  placeholder="data:image/png;base64,... ou https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Couleur principale</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={templateForm.primaryColor || '#1a4d2e'}
                    onChange={(e) => handleTemplateChange('primaryColor', e.target.value)}
                    className="h-10 w-14 p-1 border rounded"
                  />
                  <input
                    type="text"
                    value={templateForm.primaryColor || ''}
                    onChange={(e) => handleTemplateChange('primaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Couleur secondaire</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={templateForm.secondaryColor || '#2d6a4f'}
                    onChange={(e) => handleTemplateChange('secondaryColor', e.target.value)}
                    className="h-10 w-14 p-1 border rounded"
                  />
                  <input
                    type="text"
                    value={templateForm.secondaryColor || ''}
                    onChange={(e) => handleTemplateChange('secondaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Libellé taxe</label>
                <input
                  type="text"
                  value={templateForm.taxLabel || 'TVA'}
                  onChange={(e) => handleTemplateChange('taxLabel', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Taux de taxe (décimal, ex: 0,18)</label>
                <input
                  type="number"
                  step="0.01"
                  value={templateForm.taxRate ?? 0}
                  onChange={(e) => handleTemplateChange('taxRate', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Mentions légales</label>
              <textarea
                value={templateForm.legalMention || ''}
                onChange={(e) => handleTemplateChange('legalMention', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Texte de pied de page</label>
              <input
                type="text"
                value={templateForm.footerText || ''}
                onChange={(e) => handleTemplateChange('footerText', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Notes par défaut</label>
              <textarea
                value={templateForm.defaultNotes || ''}
                onChange={(e) => handleTemplateChange('defaultNotes', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Avertissement / Disclaimer</label>
              <textarea
                value={templateForm.disclaimer || ''}
                onChange={(e) => handleTemplateChange('disclaimer', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="showSignatureZones"
                type="checkbox"
                checked={!!templateForm.showSignatureZones}
                onChange={(e) => handleTemplateChange('showSignatureZones', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="showSignatureZones" className="text-sm text-gray-700 dark:text-slate-300">Afficher les zones de signature</label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={templateLoading}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {templateLoading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showSendPDFModal && selectedInvoiceForSend && (
        <Modal onClose={() => setShowSendPDFModal(false)} title={`Envoyer ${selectedInvoiceForSend.numero} par WhatsApp`}>
          <form onSubmit={handleSendPDFWhatsApp} className="space-y-4">
            <div className="bg-gray-50 dark:bg-slate-700/30 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Client : <span className="font-bold">{selectedInvoiceForSend.client?.nom || 'N/A'}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Montant : <span className="font-bold">{selectedInvoiceForSend.montantTotal.toLocaleString()} FCFA</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Numéro WhatsApp *</label>
              <input
                type="tel"
                value={sendPDFForm.telephone}
                onChange={(e) => setSendPDFForm({ ...sendPDFForm, telephone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                placeholder="Ex: 0123456789"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Message accompagnant le PDF</label>
              <textarea
                value={sendPDFForm.message}
                onChange={(e) => setSendPDFForm({ ...sendPDFForm, message: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowSendPDFModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Envoyer le PDF
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
