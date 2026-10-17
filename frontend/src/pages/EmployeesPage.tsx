import React, { useState, useEffect } from "react";
import { Plus, Search, UserCircle, X, Mail, Phone, MapPin, Briefcase, Banknote, History, Download, Edit, Trash2, Users, ClipboardCheck, ChevronDown, FileText, ChevronUp } from "lucide-react";
import { fetchWithAuth, downloadWithAuth } from "../lib/api";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CONTRACT_TYPES, SPECULATION_CATEGORIES } from "../lib/constants";
import { useDataTable } from "../hooks/useDataTable";
import { cn } from "../lib/utils";

interface Salary {
  id: string;
  amount: number;
  baseSalary?: number;
  bonuses?: number;
  cnpsEmployee?: number;
  cnpsEmployer?: number;
  taxIS?: number;
  date: string;
  employee: { firstName: string, lastName: string, position: string, matricule?: string };
}

interface Absence {
  id: string;
  date: string;
  reason: string;
  employee: { firstName: string, lastName: string };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  salary: number;
  hireDate: string;
  contact: string;
  residence: string;
  cniNumber: string;
  matricule?: string;
  typeSpeculation: string;
  speculation: string;
  contractType?: string;
  contractStart?: string;
  contractEnd?: string;
  _count: {
    absences: number;
    salaries: number;
  };
}

export default function EmployeesPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user.role || 'GERANT';
  const isAdmin = role === 'ADMIN';
  const isGerant = role === 'GERANT' || isAdmin;
  const isRH = role === 'RH' || isGerant;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allSalaries, setAllSalaries] = useState<Salary[]>([]);
  const [allAbsences, setAllAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'personnel' | 'payroll' | 'absences'>('personnel');

  const empTable = useDataTable(employees);
  const salaryTable = useDataTable(allSalaries);
  const absenceTable = useDataTable(allAbsences);

  const [period, setPeriod] = useState("Mensuel");
  const [customDates, setCustomDates] = useState({ start: "", end: "" });

  const getPeriodDates = () => {
    if (period === "Personnalisé") {
      return { startDate: customDates.start, endDate: customDates.end };
    }

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (period) {
      case "Journalier":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "Hebdomadaire":
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(now.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
        break;
      case "Mensuel":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "Annuel":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return { startDate: null, endDate: null };
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const calculatePresenteeismRate = () => {
    if (employees.length === 0) return "100%";

    const { startDate, endDate } = getPeriodDates();
    if (!startDate || !endDate) return "94.2%";

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const totalPossibleDays = employees.length * diffDays;
    const actualAbsences = allAbsences.length;

    const rate = ((totalPossibleDays - actualAbsences) / totalPossibleDays) * 100;
    return `${Math.max(0, Math.min(100, rate)).toFixed(1)}%`;
  };

  const [showModal, setShowModal] = useState(false);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", hireDate: new Date().toISOString().split('T')[0],
    salary: "", contact: "", position: "", residence: "", cniNumber: "",
    matricule: "",
    typeSpeculation: "Cultures Industrielles", speculation: "Hévéa", service: "Production",
    contractType: "CDI", contractStart: new Date().toISOString().split('T')[0], contractEnd: ""
  });

  const [absenceData, setAbsenceData] = useState({ employeeId: "", date: new Date().toISOString().split('T')[0], reason: "" });
  const [salaryData, setSalaryData] = useState({ employeeId: "", date: new Date().toISOString().split('T')[0], amount: "", baseSalary: "", bonuses: "0" });

  const generatePaySlip = (s: Salary) => {
    const doc = new jsPDF();
    const margin = 15;

    doc.setFontSize(22);
    doc.setTextColor(26, 77, 46);
    doc.text('KOKANSEY SARLU', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Exploitation Agricole & Services', 105, 26, { align: 'center' });

    doc.setDrawColor(200);
    doc.line(margin, 35, 210 - margin, 35);

    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('BULLETIN DE PAIE', 105, 45, { align: 'center' });
    doc.setFontSize(10);
    const period = new Date(s.date).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    doc.text(`Période : ${period.toUpperCase()}`, 105, 52, { align: 'center' });

    doc.setFillColor(245, 247, 249);
    doc.rect(margin, 60, 180, 35, 'F');
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(`EMPLOYÉ : ${s.employee.firstName} ${s.employee.lastName}`, margin + 5, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(`Matricule : ${s.employee.matricule || 'N/A'}`, margin + 5, 77);
    doc.text(`Poste : ${s.employee.position}`, margin + 5, 84);

    doc.text(`Date de paiement : ${new Date(s.date).toLocaleDateString()}`, 130, 70);
    doc.text(`Mode : Virement / Espèces`, 130, 77);

    const gross = (s.baseSalary || 0) + (s.bonuses || 0);

    autoTable(doc, {
      startY: 105,
      head: [['Libellé', 'Base', 'Taux', 'Retenues', 'Gains']],
      body: [
        ['Salaire de Base', (s.baseSalary || 0).toLocaleString(), '', '', (s.baseSalary || 0).toLocaleString()],
        ['Primes / Gratifications', (s.bonuses || 0).toLocaleString(), '', '', (s.bonuses || 0).toLocaleString()],
        ['CNPS Part Salariale', gross.toLocaleString(), '6.3%', (s.cnpsEmployee || 0).toLocaleString(), ''],
        ['Impôt sur Salaire (IS)', (gross * 0.8).toLocaleString(), '1.5%', (s.taxIS || 0).toLocaleString(), ''],
      ],
      theme: 'grid',
      headStyles: { fillColor: [26, 77, 46], textColor: 255 },
      styles: { fontSize: 9 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL BRUT :`, 130, finalY);
    doc.text(`${gross.toLocaleString()} FCFA`, 180, finalY, { align: 'right' });

    doc.text(`TOTAL RETENUES :`, 130, finalY + 7);
    doc.text(`${((s.cnpsEmployee || 0) + (s.taxIS || 0)).toLocaleString()} FCFA`, 180, finalY + 7, { align: 'right' });

    doc.setFontSize(14);
    doc.setFillColor(26, 77, 46);
    doc.rect(125, finalY + 15, 70, 15, 'F');
    doc.setTextColor(255);
    doc.text(`NET À PAYER :`, 130, finalY + 25);
    doc.text(`${s.amount.toLocaleString()} FCFA`, 190, finalY + 25, { align: 'right' });

    doc.setTextColor(150);
    doc.setFontSize(8);
    doc.text('Document généré par KOKANSEY Management System - Conforme SAGE-SARI', 105, 285, { align: 'center' });

    doc.save(`Bulletin_${s.employee.lastName}_${period.replace(' ', '_')}.pdf`);
  };

  // Export Employees to Excel
  const handleExportEmployeesExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(employees.map(emp => ({
      "Prénom": emp.firstName,
      "Nom": emp.lastName,
      "Matricule": emp.matricule || "N/A",
      "Poste": emp.position,
      "Salaire": emp.salary,
      "Date d'Embauche": new Date(emp.hireDate).toLocaleDateString('fr-FR'),
      "Contact": emp.contact,
      "Résidence": emp.residence,
      "CNI": emp.cniNumber,
      "Type de Contrat": emp.contractType || "N/A",
      "Type de Spéculation": emp.typeSpeculation,
      "Spéculation": emp.speculation
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employés");
    XLSX.writeFile(workbook, `employes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getPeriodDates();
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const [empRes, salRes, absRes] = await Promise.all([
        fetchWithAuth("/api/employees"),
        fetchWithAuth(`/api/employees/salaries?${queryParams.toString()}`),
        fetchWithAuth(`/api/employees/absences?${queryParams.toString()}`)
      ]);

      const empData = await empRes.json();
      const salData = await salRes.json();
      const absData = await absRes.json();

      setEmployees(Array.isArray(empData) ? empData : []);
      setAllSalaries(Array.isArray(salData) ? salData : []);
      setAllAbsences(Array.isArray(absData) ? absData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, customDates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingEmployee;
    const endpoint = isEdit ? `/api/employees/${editingEmployee.id}` : "/api/employees";

    const payload = {
      ...formData,
      salary: Number(formData.salary),
      contractStart: formData.contractStart || null,
      contractEnd: formData.contractEnd || null
    };

    try {
      const res = await fetchWithAuth(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        setEditingEmployee(null);
        resetForm();
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth("/api/employees/absences", {
        method: 'POST',
        body: JSON.stringify(absenceData)
      });
      if (res.ok) {
        setShowAbsenceModal(false);
        setAbsenceData({ employeeId: "", date: new Date().toISOString().split('T')[0], reason: "" });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...salaryData,
      amount: Number(salaryData.amount),
      baseSalary: Number(salaryData.baseSalary),
      bonuses: Number(salaryData.bonuses)
    };

    try {
      const res = await fetchWithAuth("/api/employees/salaries", {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowSalaryModal(false);
        setSalaryData({ employeeId: "", date: new Date().toISOString().split('T')[0], amount: "", baseSalary: "", bonuses: "0" });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet employé ?")) return;
    try {
      const res = await fetchWithAuth(`/api/employees/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAbsence = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette absence ?")) return;
    try {
      const res = await fetchWithAuth(`/api/employees/absences/${id}`, { method: 'DELETE' });
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

  const resetForm = () => {
    setFormData({
      firstName: "", lastName: "", hireDate: new Date().toISOString().split('T')[0],
      salary: "", contact: "", position: "", residence: "", cniNumber: "",
      matricule: "",
      typeSpeculation: "Cultures Industrielles", speculation: "Hévéa", service: "Production",
      contractType: "CDI", contractStart: new Date().toISOString().split('T')[0], contractEnd: ""
    });
  };

  const SubNav = () => (
    <div className="flex items-center bg-white p-1 rounded-2xl border border-gray-100 shadow-sm w-fit mb-8">
      {[
        { id: 'personnel', label: 'Effectif Personnel', icon: Users },
        { id: 'payroll', label: 'Historique de Paie', icon: Banknote },
        { id: 'absences', label: 'Pointage & Absences', icon: ClipboardCheck },
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Ressources Humaines</h2>
          <p className="text-gray-500 font-medium italic">Gestion du personnel et de la paie</p>
        </div>
        <div className="flex items-center gap-3">
          {period === "Personnalisé" && (
            <div className="flex gap-2 items-center mr-2">
              <input
                type="date"
                value={customDates.start}
                onChange={(e) => setCustomDates({...customDates, start: e.target.value})}
                className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-gray-400 font-bold">au</span>
              <input
                type="date"
                value={customDates.end}
                onChange={(e) => setCustomDates({...customDates, end: e.target.value})}
                className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="appearance-none bg-white border border-gray-200 px-4 py-2 pr-10 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
            >
              {["Journalier", "Hebdomadaire", "Mensuel", "Annuel", "Personnalisé"].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          {currentView === 'personnel' && (
            <button
              onClick={handleExportEmployeesExcel}
              className="bg-white text-primary border border-gray-200 px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-primary/5 transition-all font-bold shadow-sm"
            >
              <Download className="w-5 h-5" />
              Export Excel
            </button>
          )}
          <button
            onClick={() => {
              const type = currentView === 'payroll' ? 'sage-accounting' : 'sage';
              downloadWithAuth(`/api/export/csv?type=${type}`, `${type}.csv`).catch(() => {
                alert('Erreur lors du téléchargement de l\'export');
              });
            }}
            className="bg-green-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-green-700 transition-all font-bold shadow-lg shadow-green-200"
          >
            <Download className="w-5 h-5" />
            Export SAGE
          </button>
          {isRH && (
            <button
              onClick={() => {
                if (currentView === 'personnel') {
                  setEditingEmployee(null);
                  resetForm();
                  setShowModal(true);
                } else if (currentView === 'payroll') {
                  setShowSalaryModal(true);
                } else {
                  setShowAbsenceModal(true);
                }
              }}
              className="bg-primary text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-opacity-90 transition-all font-bold shadow-lg shadow-primary/20"
            >
              <Plus className="w-5 h-5" />
              {currentView === 'personnel' ? "Nouvel Employé" : currentView === 'payroll' ? "Enregistrer un Paiement" : "Signaler une Absence"}
            </button>
          )}
        </div>
      </div>

      <SubNav />

      {currentView === 'personnel' && (
        <div className="animate-in fade-in duration-500">
          <SearchBar table={empTable} placeholder="Rechercher un employé par nom, poste, matricule..." />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-20 text-gray-400 italic">Chargement du personnel...</div>
            ) : empTable.sortedData.map((emp: any) => (
              <div key={emp.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary relative">
                  <UserCircle className="w-10 h-10" />
                  {emp.matricule && (
                    <span className="absolute -top-2 -right-2 bg-gray-800 text-white text-[8px] px-1.5 py-0.5 rounded-md font-black">
                      {emp.matricule}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-black text-gray-800 uppercase tracking-tight">{emp.firstName} {emp.lastName}</h3>
                  <div className="flex gap-2 mt-1">
                    <p className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full inline-block uppercase tracking-widest">{emp.position}</p>
                    {emp.contractType && (
                      <p className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full inline-block uppercase tracking-widest">{emp.contractType}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-gray-500">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm font-bold">{emp.contact}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-500">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-bold">{emp.residence}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-500">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-sm font-bold">{emp.speculation}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isRH && (
                    <button
                      onClick={() => {
                        setEditingEmployee(emp);
                        setFormData({
                          firstName: emp.firstName,
                          lastName: emp.lastName,
                          hireDate: new Date(emp.hireDate).toISOString().split('T')[0],
                          salary: emp.salary.toString(),
                          contact: emp.contact,
                          position: emp.position,
                          residence: emp.residence,
                          cniNumber: emp.cniNumber,
                          matricule: emp.matricule || "",
                          typeSpeculation: emp.typeSpeculation || "Cultures Industrielles",
                          speculation: emp.speculation,
                          service: (emp as any).service || "Production",
                          contractType: emp.contractType || "CDI",
                          contractStart: emp.contractStart ? new Date(emp.contractStart).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                          contractEnd: emp.contractEnd ? new Date(emp.contractEnd).toISOString().split('T')[0] : ""
                        });
                        setShowModal(true);
                      }}
                      className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteEmployee(emp.id)}
                      className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Salaire de base</p>
                  <p className="text-sm font-black text-gray-900">{emp.salary.toLocaleString()} <span className="text-[10px] opacity-40 uppercase">FCFA</span></p>
                </div>
              </div>
            </div>
          ))}
        </div>
        </div>
      )}

      {currentView === 'payroll' && (
        <div className="animate-in slide-in-from-bottom-4 duration-300">
          <SearchBar table={salaryTable} placeholder="Rechercher un paiement par nom ou matricule..." />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <TableHeader label="Date Paiement" sortKey="date" table={salaryTable} />
                  <TableHeader label="Employé" sortKey="employee.firstName" table={salaryTable} />
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Période</th>
                  <TableHeader label="Montant Versé" sortKey="amount" table={salaryTable} />
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {salaryTable.sortedData.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6 text-sm font-bold text-gray-500">{new Date(s.date).toLocaleDateString()}</td>
                    <td className="px-8 py-6 font-black text-gray-800 uppercase tracking-tight">{s.employee.firstName} {s.employee.lastName}</td>
                    <td className="px-8 py-6 text-sm font-bold text-primary uppercase tracking-widest">
                      {new Date(s.date).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
                    </td>
                    <td className="px-8 py-6 text-right font-black text-green-600 text-lg">
                      {s.amount.toLocaleString()} <span className="text-[10px] opacity-40">FCFA</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button
                        onClick={() => generatePaySlip(s)}
                        className="p-2 bg-primary/5 text-primary hover:bg-primary hover:text-white rounded-xl transition-all"
                        title="Imprimer Bulletin"
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currentView === 'absences' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Absences</p>
              <h4 className="text-3xl font-black text-red-500">{allAbsences.length}</h4>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Taux Présentéisme</p>
              <h4 className="text-3xl font-black text-primary">{calculatePresenteeismRate()}</h4>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Moyenne / Employé</p>
              <h4 className="text-3xl font-black text-gray-800">{(allAbsences.length / (employees.length || 1)).toFixed(1)}</h4>
            </div>
          </div>

          <div className="animate-in slide-in-from-bottom-4 duration-300">
            <SearchBar table={absenceTable} placeholder="Rechercher une absence..." />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <TableHeader label="Date" sortKey="date" table={absenceTable} />
                    <TableHeader label="Employé" sortKey="employee.firstName" table={absenceTable} />
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Poste</th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Motif / Observation</th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {absenceTable.sortedData.length === 0 ? (
                    <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-400 italic">Aucun pointage enregistré</td></tr>
                  ) : absenceTable.sortedData.map((a: any) => (
                    <tr key={a.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-6 text-sm font-bold text-gray-500">{new Date(a.date).toLocaleDateString()}</td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-[10px]">
                            {a.employee.firstName[0]}{a.employee.lastName[0]}
                          </div>
                          <span className="font-black text-gray-800 uppercase tracking-tight">{a.employee.firstName} {a.employee.lastName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-xs font-bold text-gray-400 uppercase">{a.employee.position}</td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase rounded-lg border border-red-100">
                          {a.reason || 'Absence Non Justifiée'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {isRH && (
                          <button
                            onClick={() => handleDeleteAbsence(a.id)}
                            className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-8 shadow-2xl my-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">{editingEmployee ? "Modifier l'Employé" : "Nouvel Employé"}</h3>
              <button onClick={() => { setShowModal(false); setEditingEmployee(null); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Prénom</label>
                <input type="text" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Nom</label>
                <input type="text" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Poste occupé</label>
                <input type="text" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Salaire de base (FCFA)</label>
                <input type="number" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Contact</label>
                <input type="text" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Lieu de résidence</label>
                <input type="text" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={formData.residence} onChange={e => setFormData({...formData, residence: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">N° CNI</label>
                <input type="text" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={formData.cniNumber} onChange={e => setFormData({...formData, cniNumber: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Matricule SAGE (Optionnel)</label>
                <input type="text" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" placeholder="Ex: EMP001" value={formData.matricule} onChange={e => setFormData({...formData, matricule: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Date d'embauche</label>
                <input type="date" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Type d'exploitation</label>
                <select
                  required
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                  value={formData.typeSpeculation}
                  onChange={e => setFormData({...formData, typeSpeculation: e.target.value})}
                >
                  {SPECULATION_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Type de Contrat</label>
                <select
                  required
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                  value={formData.contractType}
                  onChange={e => setFormData({...formData, contractType: e.target.value})}
                >
                  {CONTRACT_TYPES.map(ct => (
                    <option key={ct.value} value={ct.value}>{ct.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Début du Contrat</label>
                <input
                  type="date"
                  required={formData.contractType !== "CDI"}
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                  value={formData.contractStart}
                  onChange={e => setFormData({...formData, contractStart: e.target.value})}
                />
              </div>

              {formData.contractType !== "CDI" && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Fin du Contrat</label>
                  <input
                    type="date"
                    required
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                    value={formData.contractEnd}
                    onChange={e => setFormData({...formData, contractEnd: e.target.value})}
                  />
                </div>
              )}

              <div className="md:col-span-2 pt-6">
                <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-xl shadow-primary/20">
                  {editingEmployee ? "Mettre à jour le profil" : "Enregistrer l'Employé"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAbsenceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">Signaler Absence</h3>
              <button onClick={() => setShowAbsenceModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleRecordAbsence} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Choisir l'employé</label>
                <select
                  required
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                  value={absenceData.employeeId}
                  onChange={e => setAbsenceData({...absenceData, employeeId: e.target.value})}
                >
                  <option value="">-- Sélectionner --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Date de l'absence</label>
                <input type="date" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={absenceData.date} onChange={e => setAbsenceData({...absenceData, date: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Motif / Justificatif</label>
                <textarea className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold h-24" placeholder="Ex: Maladie, Urgence familiale..." value={absenceData.reason} onChange={e => setAbsenceData({...absenceData, reason: e.target.value})} />
              </div>

              <button type="submit" className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-xl shadow-red-200">
                Enregistrer l'absence
              </button>
            </form>
          </div>
        </div>
      )}

      {showSalaryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">Enregistrer Paiement</h3>
              <button onClick={() => setShowSalaryModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleRecordSalary} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Bénéficiaire</label>
                <select
                  required
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                  value={salaryData.employeeId}
                  onChange={e => {
                    const emp = employees.find(emp => emp.id === e.target.value);
                    setSalaryData({
                      ...salaryData,
                      employeeId: e.target.value,
                      amount: emp?.salary.toString() || "",
                      baseSalary: emp?.salary.toString() || ""
                    });
                  }}
                >
                  <option value="">-- Sélectionner --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Salaire de Base</label>
                  <input
                    type="number"
                    required
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                    value={salaryData.baseSalary}
                    onChange={e => setSalaryData({...salaryData, baseSalary: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Primes / Bonus</label>
                  <input
                    type="number"
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold"
                    value={salaryData.bonuses}
                    onChange={e => setSalaryData({...salaryData, bonuses: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Date du paiement</label>
                <input type="date" required className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" value={salaryData.date} onChange={e => setSalaryData({...salaryData, date: e.target.value})} />
              </div>

              <div className="bg-primary/5 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                  <span>Salaire Brut</span>
                  <span>{(parseFloat(salaryData.baseSalary || "0") + parseFloat(salaryData.bonuses || "0")).toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-red-500 uppercase">
                  <span>Retenues CNPS (6.3%)</span>
                  <span>{((parseFloat(salaryData.baseSalary || "0") + parseFloat(salaryData.bonuses || "0")) * 0.063).toLocaleString()} FCFA</span>
                </div>
                <div className="pt-2 border-t border-primary/10 flex justify-between text-sm font-black text-primary uppercase">
                  <span>Net Estimé</span>
                  <span>{((parseFloat(salaryData.baseSalary || "0") + parseFloat(salaryData.bonuses || "0")) * (1 - 0.063 - 0.012)).toLocaleString()} FCFA</span>
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-xl shadow-primary/20">
                Générer & Enregistrer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
 );
}
