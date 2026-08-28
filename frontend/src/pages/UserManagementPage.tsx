import React, { useState, useEffect } from "react";
import { 
  UserPlus, 
  Users, 
  Shield, 
  ShieldCheck, 
  Trash2, 
  Edit,
  X, 
  Search,
  Lock,
  User as UserIcon,
  Mail,
  Phone,
  UserCheck,
  Download
} from "lucide-react";
import { fetchWithAuth } from "../lib/api";
import { useDataTable } from "../hooks/useDataTable";
import Pagination from "../components/Pagination";
import * as XLSX from "xlsx";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  contact: string;
  position: string;
}

interface User {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  contact: string | null;
  role: string;
  createdAt: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    contact: "",
    role: "GERANT"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>("all");

  const userTable = useDataTable(users);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch users
      const usersRes = await fetchWithAuth("/api/users");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      } else {
        const errData = await usersRes.json().catch(() => ({}));
        const msg = errData.message || errData.error || `Erreur ${usersRes.status}`;
        setError(msg);
        console.error("Erreur lors de la récupération des utilisateurs:", usersRes.status, errData);
      }

      // Fetch employees separately
      const employeesRes = await fetchWithAuth("/api/employees");
      if (employeesRes.ok) {
        const employeesData = await employeesRes.json();
        setEmployees(employeesData);
      } else {
        console.error("Erreur lors de la récupération des employés:", employeesRes.status);
      }
    } catch (err) {
      console.error("Erreur de connexion API:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    if (!employeeId) {
      setFormData({ ...formData, name: "", contact: "" });
      return;
    }
    
    const emp = employees.find(e => e.id === employeeId);
    if (emp) {
      setFormData({
        ...formData,
        name: `${emp.firstName} ${emp.lastName}`,
        contact: emp.contact,
        username: `${emp.firstName.toLowerCase()}.${emp.lastName.toLowerCase()}`.replace(/\s+/g, '')
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Simple email validation
    if (formData.email && !formData.email.includes('@')) {
      alert("Veuillez entrer une adresse email valide");
      return;
    }

    setIsSubmitting(true);
    const isEdit = !!editingUser;
    const endpoint = isEdit ? `/api/users/${editingUser.id}` : "/api/users";
    try {
      const res = await fetchWithAuth(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(formData)
      });
      
      let data;
      try {
        data = await res.json();
      } catch (e) {
        data = { error: "Réponse serveur invalide (Non-JSON)" };
      }
      
      if (res.ok) {
        setShowModal(false);
        setEditingUser(null);
        resetForm();
        fetchData();
      } else {
        alert(data.error || data.message || `Erreur ${res.status}: Impossible de ${isEdit ? 'modifier' : 'créer'} l'utilisateur`);
      }
    } catch (err: any) {
      console.error("Submit Error:", err);
      alert(`Erreur de connexion : ${err.message || "Le serveur est peut-être hors ligne"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ username: "", password: "", name: "", email: "", contact: "", role: "GERANT" });
    setSelectedEmployeeId("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) return;
    try {
      const res = await fetchWithAuth(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
      else {
        const err = await res.json();
        alert(err.error || "Erreur lors de la suppression");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.name?.toLowerCase().includes(userTable.search.toLowerCase()) || 
       user.username.toLowerCase().includes(userTable.search.toLowerCase()) ||
       user.email?.toLowerCase().includes(userTable.search.toLowerCase()) ||
       user.contact?.toLowerCase().includes(userTable.search.toLowerCase()));
    
    const matchesRole = filterRole === "all" || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  // Get unique roles
  const uniqueRoles = Array.from(new Set(users.map(user => user.role)));

  // Export to Excel
  const handleExcelExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredUsers.map(user => ({
      "Nom": user.name || "Sans nom",
      "Identifiant": user.username,
      "Email": user.email || "-",
      "Téléphone": user.contact || "-",
      "Rôle": user.role,
      "Créé le": user.createdAt ? new Date(user.createdAt).toLocaleString('fr-FR') : "-"
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Utilisateurs");
    XLSX.writeFile(workbook, `utilisateurs-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Sorting and pagination
  const sortUsers = (usersToSort: User[]) => {
    if (!userTable.sortConfig) return usersToSort;
    return [...usersToSort].sort((a, b) => {
      const aVal = (a as any)[userTable.sortConfig!.key] || "";
      const bVal = (b as any)[userTable.sortConfig!.key] || "";
      if (aVal < bVal) return userTable.sortConfig!.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return userTable.sortConfig!.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getPaginatedUsers = () => {
    const sorted = sortUsers(filteredUsers);
    const start = (userTable.currentPage - 1) * userTable.itemsPerPage;
    return sorted.slice(start, start + userTable.itemsPerPage);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Utilisateurs</h2>
          <p className="text-gray-500 font-medium">Gestion des accès et des rôles système</p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleExcelExport}
            className="bg-white text-primary border border-gray-200 px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-primary/5 transition-all font-bold shadow-sm"
          >
            <Download className="w-5 h-5" />
            Exporter Excel
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-primary text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-opacity-90 transition-all font-bold shadow-lg shadow-primary/20"
          >
            <UserPlus className="w-5 h-5" />
            Nouvel Utilisateur
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Rechercher un utilisateur..." 
                className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={userTable.search}
                onChange={e => userTable.setSearch(e.target.value)}
              />
            </div>
            <select 
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
            >
              <option value="all">Tous les rôles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {filteredUsers.length} UTILISATEURS
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100" onClick={() => userTable.requestSort('name')}>Utilisateur</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100" onClick={() => userTable.requestSort('username')}>Identifiant</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact / Email</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100" onClick={() => userTable.requestSort('role')}>Rôle</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100" onClick={() => userTable.requestSort('createdAt')}>Créé le</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-gray-400 italic font-bold">Chargement...</td></tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="text-red-500 font-bold mb-2">{error}</div>
                    <button onClick={fetchData} className="text-primary underline text-sm">Réessayer</button>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-gray-400 italic font-bold">Aucun utilisateur trouvé</td></tr>
              ) : getPaginatedUsers().map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black">
                        {u.name ? u.name[0].toUpperCase() : u.username[0].toUpperCase()}
                      </div>
                      <span className="font-bold text-gray-800">{u.name || "Sans nom"}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 font-medium text-gray-500">{u.username}</td>
                  <td className="px-8 py-6">
                    <div className="text-xs space-y-1">
                      {u.contact && <div className="flex items-center gap-1.5 text-gray-600 font-bold"><Phone className="w-3 h-3" /> {u.contact}</div>}
                      {u.email && <div className="flex items-center gap-1.5 text-gray-400 font-medium"><Mail className="w-3 h-3" /> {u.email}</div>}
                      {!u.contact && !u.email && <span className="text-gray-300 italic">Non renseigné</span>}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                      {u.role === 'ADMIN' ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-gray-400 text-sm">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          setEditingUser(u);
                          setFormData({
                            username: u.username,
                            password: "", // Leave blank for edit unless changing
                            name: u.name || "",
                            email: u.email || "",
                            contact: u.contact || "",
                            role: u.role
                          });
                          setShowModal(true);
                        }}
                        className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="px-6 pt-4 pb-6">
            <Pagination 
              currentPage={userTable.currentPage}
              totalPages={Math.ceil(filteredUsers.length / userTable.itemsPerPage)}
              onPageChange={userTable.setCurrentPage}
              itemsPerPage={userTable.itemsPerPage}
              onItemsPerPageChange={userTable.setItemsPerPage}
              totalItems={filteredUsers.length}
            />
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">{editingUser ? "Modifier Utilisateur" : "Nouvel Utilisateur"}</h3>
              <button onClick={() => { setShowModal(false); setEditingUser(null); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Choisir un employé (Lien direct)</label>
                  <div className="relative">
                    <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                    <select 
                      className="w-full pl-12 pr-4 py-4 bg-primary/5 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none font-bold text-sm text-primary appearance-none"
                      value={selectedEmployeeId}
                      onChange={(e) => handleEmployeeSelect(e.target.value)}
                    >
                      <option value="">-- Création libre (Sans lien) --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.position})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="h-px bg-gray-100 my-2"></div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Nom complet</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                    <input type="text" required placeholder="Ex: Jean Dupont" className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Identifiant (Username)</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                    <input type="text" required placeholder="Ex: jdupont" className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none font-bold" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                      <input 
                        type="text" 
                        placeholder="Ex: jean@mail.com" 
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none font-bold text-sm" 
                        value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                      <input type="text" placeholder="Ex: 0700000000" className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none font-bold text-sm" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Mot de passe {editingUser && "(Laisser vide pour ne pas changer)"}</label>
                  <input type="password" required={!editingUser} className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none font-bold" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Rôle système</label>
                  <select className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none font-bold mb-2" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="GERANT">Gérant (Accès standard)</option>
                    <option value="COMMERCIAL">Commercial (Ventes & Récoltes)</option>
                    <option value="STOCK_MANAGER">Gestionnaire de Stock (Inventaire)</option>
                    <option value="RH">Ressources Humaines (RH)</option>
                    <option value="ADMIN">Administrateur (Contrôle total)</option>
                  </select>
                  <div className="px-4 py-2 bg-primary/5 rounded-xl border border-primary/10">
                    <p className="text-[10px] text-primary font-bold italic">
                      {formData.role === 'ADMIN' && "• Accès total • Gestion des utilisateurs • Audit logs • Suppressions"}
                      {formData.role === 'GERANT' && "• Gestion opérationnelle • Rapports • Pas de gestion d'utilisateurs"}
                      {formData.role === 'COMMERCIAL' && "• Saisie des ventes • Suivi des récoltes • Rapports de vente"}
                      {formData.role === 'STOCK_MANAGER' && "• Gestion de l'inventaire • Mouvements de stock • Alertes"}
                      {formData.role === 'RH' && "• Gestion du personnel • Paie • Pointage & Absences"}
                    </p>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (editingUser ? "Mise à jour..." : "Création en cours...") : (editingUser ? "Mettre à jour" : "Créer le compte")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
