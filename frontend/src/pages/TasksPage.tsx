import React, { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, CheckCircle2, X, Truck, Calendar as CalendarIcon, List } from "lucide-react";
import { fetchWithAuth } from "../lib/api";
import Toast, { ToastType } from "../components/Toast";
import Calendar from "../components/Calendar";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  contact?: string;
}

interface Truck {
  id: string;
  internalCode: string;
  registration: string;
  brand: string;
  model: string;
  year: number;
  energyType: string;
  mileage?: number;
}

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "NORMAL" | "HIGH";
  dueDate?: string;
  assignedToId: string;
  assignedTo?: Employee;
  truckId?: string;
  truck?: Truck;
  createdAt: string;
}

const statusLabels: Record<string, string> = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée"
};

const priorityLabels: Record<string, string> = {
  LOW: "Basse",
  NORMAL: "Normale",
  HIGH: "Haute"
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "PENDING",
    priority: "NORMAL",
    dueDate: "",
    assignedToId: "",
    truckId: ""
  });
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, employeesRes, trucksRes] = await Promise.all([
        fetchWithAuth("/api/tasks"),
        fetchWithAuth("/api/employees"),
        fetchWithAuth("/api/trucks")
      ]);
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (employeesRes.ok) setEmployees(await employeesRes.json());
      if (trucksRes.ok) setTrucks(await trucksRes.json());
    } catch (error) {
      console.error("Erreur chargement tâches:", error);
      showToast("Erreur lors du chargement des données", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreate = () => {
    setEditingTask(null);
    setFormData({ title: "", description: "", status: "PENDING", priority: "NORMAL", dueDate: "", assignedToId: "", truckId: "" });
    setShowModal(true);
  };

  const openEdit = (task: TaskItem) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
      assignedToId: task.assignedToId,
      truckId: task.truckId || ""
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTask ? `/api/tasks/${editingTask.id}` : "/api/tasks";
      const method = editingTask ? "PUT" : "POST";
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        showToast(editingTask ? "Tâche modifiée avec succès" : "Tâche créée et notification WhatsApp envoyée", "success");
        setShowModal(false);
        fetchData();
      } else {
        const error = await res.json();
        showToast(error.error || "Erreur lors de l'enregistrement", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erreur lors de l'enregistrement", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette tâche ?")) return;
    try {
      const res = await fetchWithAuth(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Tâche supprimée", "success");
        fetchData();
      } else {
        showToast("Erreur lors de la suppression", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erreur lors de la suppression", "error");
    }
  };

  const filteredTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      `${t.assignedTo?.firstName} ${t.assignedTo?.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      t.truck?.internalCode.toLowerCase().includes(search.toLowerCase()) ||
      t.truck?.registration.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Tâches</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Assignez des tâches à vos employés et suivez leur avancement.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-full p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                viewMode === "list"
                  ? "bg-primary text-white"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
              }`}
            >
              <List className="w-3.5 h-3.5" /> Liste
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                viewMode === "calendar"
                  ? "bg-primary text-white"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> Calendrier
            </button>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle tâche
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
        <input
          type="text"
          placeholder="Rechercher une tâche, un employé..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-100 dark:border-slate-700 focus:ring-2 focus:ring-primary/10 outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-slate-400">Chargement...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
          Aucune tâche trouvée.
        </div>
      ) : viewMode === "calendar" ? (
        <Calendar
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          events={filteredTasks
            .filter((t) => t.dueDate)
            .map((t) => ({
              id: t.id,
              date: t.dueDate!,
              title: t.title,
              color:
                t.priority === "HIGH"
                  ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300"
                  : t.priority === "LOW"
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300",
            }))}
          onEventClick={(id) => {
            const task = tasks.find((t) => t.id === id);
            if (task) openEdit(task);
          }}
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-gray-50 text-gray-500 dark:text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Titre</th>
                <th className="px-4 py-3 text-left">Assigné à</th>
                <th className="px-4 py-3 text-left">Priorité</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Véhicule</th>
                <th className="px-4 py-3 text-left">Échéance</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id} className="border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                    {task.title}
                    {task.description && (
                      <p className="text-xs text-gray-400 dark:text-slate-500 font-normal line-clamp-1">{task.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                    {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      task.priority === "HIGH" ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400" :
                      task.priority === "LOW" ? "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" :
                      "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"
                    }`}>
                      {priorityLabels[task.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      task.status === "COMPLETED" ? "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400" :
                      task.status === "IN_PROGRESS" ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400" :
                      task.status === "CANCELLED" ? "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300" :
                      "bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
                    }`}>
                      {task.status === "COMPLETED" && <CheckCircle2 className="w-3 h-3" />}
                      {statusLabels[task.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                    {task.truck ? (
                      <div className="flex items-center gap-1 text-xs">
                        <Truck className="w-3 h-3 text-primary" />
                        <span>{task.truck.internalCode}</span>
                        <span className="text-gray-400 dark:text-slate-500">({task.truck.registration})</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(task)} className="p-2 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-full text-primary mr-1">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(task.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{editingTask ? "Modifier la tâche" : "Nouvelle tâche"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full">
                <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-1">Titre</label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-3 rounded-2xl border border-gray-100 dark:border-slate-700 focus:ring-2 focus:ring-primary/10 outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 rounded-2xl border border-gray-100 dark:border-slate-700 focus:ring-2 focus:ring-primary/10 outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-1">Priorité</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full p-3 rounded-2xl border border-gray-100 dark:border-slate-700 focus:ring-2 focus:ring-primary/10 outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value="LOW">Basse</option>
                    <option value="NORMAL">Normale</option>
                    <option value="HIGH">Haute</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-1">Statut</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-3 rounded-2xl border border-gray-100 dark:border-slate-700 focus:ring-2 focus:ring-primary/10 outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value="PENDING">En attente</option>
                    <option value="IN_PROGRESS">En cours</option>
                    <option value="COMPLETED">Terminée</option>
                    <option value="CANCELLED">Annulée</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-1">Échéance</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full p-3 rounded-2xl border border-gray-100 dark:border-slate-700 focus:ring-2 focus:ring-primary/10 outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-1">Assigné à</label>
                  <select
                    required
                    value={formData.assignedToId}
                    onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                    className="w-full p-3 rounded-2xl border border-gray-100 dark:border-slate-700 focus:ring-2 focus:ring-primary/10 outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value="">— Sélectionner —</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-1">Véhicule assigné</label>
                <select
                  value={formData.truckId}
                  onChange={(e) => setFormData({ ...formData, truckId: e.target.value })}
                  className="w-full p-3 rounded-2xl border border-gray-100 dark:border-slate-700 focus:ring-2 focus:ring-primary/10 outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                >
                  <option value="">— Aucun —</option>
                  {trucks.map((truck) => (
                    <option key={truck.id} value={truck.id}>
                      {truck.internalCode} — {truck.brand} {truck.model} ({truck.registration})
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-2xl text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-2xl font-medium hover:bg-primary/90"
                >
                  {editingTask ? "Enregistrer" : "Créer et notifier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
