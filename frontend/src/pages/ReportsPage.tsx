import React, { useState } from "react";
import { Download, FileText, Table as TableIcon, Calendar, Filter, ChevronDown } from "lucide-react";
import { fetchWithAuth } from "../lib/api";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "../contexts/ToastContext";
import * as XLSX from "xlsx";

export default function ReportsPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user.role || 'GERANT';
  const isAdmin = role === 'ADMIN';
  const isGerant = role === 'GERANT' || isAdmin;
  const isCommercial = role === 'COMMERCIAL';
  const isStockManager = role === 'STOCK_MANAGER';

  const [period, setPeriod] = useState("Mensuel");
  const [customDates, setCustomDates] = useState({ start: "", end: "" });
  const toast = useToast();

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

  const handleExcelExport = async (type: string, name: string) => {
    try {
      const { startDate, endDate } = getPeriodDates();
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const endpointMap: Record<string, string> = {
        'expenses': '/api/expenses',
        'sales': '/api/sales',
        'employees': '/api/employees',
        'trucks': '/api/trucks',
        'stocks': '/api/stocks'
      };

      const res = await fetchWithAuth(`${endpointMap[type]}?${queryParams.toString()}`);
      const data = await res.json();

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, name);

      XLSX.writeFile(workbook, `${name.replace(/ /g, '_')}_${new Date().getTime()}.xlsx`);

      toast.success("Export Excel généré avec succès !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'export Excel.");
    }
  };

  const generatePDFReport = async (title: string, type: string) => {
    try {
      const { startDate, endDate } = getPeriodDates();
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const res = await fetchWithAuth(`/api/${type}?${queryParams.toString()}`);
      const data = await res.json();
      
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.setTextColor(26, 77, 46);
      doc.text('KOKANSEY SARLU', 105, 15, { align: 'center' });
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(title.toUpperCase(), 105, 25, { align: 'center' });
      doc.setFontSize(10);
      const periodLabel = period === "Personnalisé" 
        ? `du ${new Date(customDates.start).toLocaleDateString()} au ${new Date(customDates.end).toLocaleDateString()}`
        : period;
      doc.text(`Période: ${periodLabel} - Généré le ${new Date().toLocaleDateString()}`, 105, 32, { align: 'center' });

      const headers = type === 'sales' 
        ? [['Date', 'Produit', 'Quantité', 'Prix Un.', 'Total']]
        : type === 'accounts'
        ? [['Spéculation', 'Catégorie', 'Revenus', 'Dépenses', 'Bénéfice Net', 'ROI']]
        : [['Date', 'Catégorie', 'Type', 'Montant']];

      const body = data.map((item: any) => {
        if (type === 'sales') {
          return [new Date(item.date).toLocaleDateString(), item.product, `${item.quantity} ${item.unit}`, item.unitPrice.toLocaleString(), item.totalPrice.toLocaleString()];
        } else if (type === 'accounts') {
          return [item.name, item.category, item.totalRevenue.toLocaleString(), item.totalExpenses.toLocaleString(), item.netProfit.toLocaleString(), `${(item.roi * 100).toFixed(1)}%` ];
        } else {
          return [new Date(item.date).toLocaleDateString(), item.category, item.type, item.amount.toLocaleString()];
        }
      });

      autoTable(doc, {
        startY: 40,
        head: headers,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [26, 77, 46] }
      });

      doc.save(`${title.replace(/ /g, '_')}_${new Date().getTime()}.pdf`);
      toast.success("Export PDF généré avec succès !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'export PDF.");
    }
  };

  return (
    <div className="space-y-8 dark:text-white">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Rapports & Exportations</h2>
          <p className="text-gray-500 dark:text-slate-400">Générez vos documents financiers officiels</p>
        </div>
        <div className="flex gap-2">
           {period === "Personnalisé" && (
             <div className="flex gap-2 items-center mr-2">
               <input 
                 type="date" 
                 value={customDates.start}
                 onChange={(e) => setCustomDates({...customDates, start: e.target.value})}
                 className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-4 py-2 rounded-lg text-sm font-bold text-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
               />
               <span className="text-gray-400 dark:text-slate-400 font-bold">au</span>
               <input 
                 type="date" 
                 value={customDates.end}
                 onChange={(e) => setCustomDates({...customDates, end: e.target.value})}
                 className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-4 py-2 rounded-lg text-sm font-bold text-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
               />
             </div>
           )}
           <div className="relative">
              <select 
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="appearance-none bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-4 py-2 pr-10 rounded-lg text-sm font-bold text-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
              >
                {["Journalier", "Hebdomadaire", "Mensuel", "Annuel", "Personnalisé"].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-400 pointer-events-none" />
           </div>
           <button 
             onClick={() => {
               setPeriod("Journalier");
               const today = new Date().toISOString().split('T')[0];
               setCustomDates({ start: today, end: today });
             }}
             className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-opacity-90 transition-all font-bold text-sm"
           >
             <Calendar className="w-4 h-4" />
             Aujourd'hui
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Export Cards */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-800 dark:text-white">Export PDF</h3>
              <p className="text-gray-400 dark:text-slate-400 text-sm">Format prêt pour l'impression</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { name: "Rapport des Ventes", type: "sales", allowed: isGerant || isCommercial },
              { name: "Rapport des Dépenses", type: "expenses", allowed: isGerant },
              { name: "Compte d'Exploitation Global", type: "accounts", allowed: isGerant }
            ].filter(r => r.allowed).map(report => (
              <button 
                key={report.name} 
                onClick={() => generatePDFReport(report.name, report.type)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl transition-colors group"
              >
                <span className="font-bold text-gray-600 dark:text-slate-300 group-hover:text-primary">{report.name}</span>
                <Download className="w-5 h-5 text-gray-300 dark:text-slate-500 group-hover:text-primary" />
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-2xl">
              <TableIcon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-800 dark:text-white">Export Excel</h3>
              <p className="text-gray-400 dark:text-slate-400 text-sm">Format pour analyse approfondie</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { name: "Journal de caisse", type: "expenses", allowed: isGerant },
              { name: "Ventes détaillées", type: "sales", allowed: isGerant || isCommercial },
              { name: "Employés & Paie", type: "employees", allowed: isGerant },
              { name: "Suivi Flotte Camions", type: "trucks", allowed: isGerant },
              { name: "Inventaire des Stocks", type: "stocks", allowed: isGerant || isStockManager }
            ].filter(r => r.allowed).map(report => (
              <button 
                key={report.name} 
                onClick={() => handleExcelExport(report.type, report.name)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl transition-colors group"
              >
                <span className="font-bold text-gray-600 dark:text-slate-300 group-hover:text-primary">{report.name}</span>
                <Download className="w-5 h-5 text-gray-300 dark:text-slate-500 group-hover:text-primary" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-primary/5 dark:bg-primary/10 p-8 rounded-3xl border border-primary/10 dark:border-primary/20 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-primary text-white rounded-2xl">
             <Filter className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-black text-primary">Génération Automatique</h4>
            <p className="text-gray-600 dark:text-slate-300">Tous les rapports sont mis à jour en temps réel à chaque nouvelle transaction.</p>
          </div>
        </div>
        <button 
          onClick={() => toast.info("Les paramètres d'alerte seront disponibles dans la prochaine mise à jour.")}
          className="bg-white dark:bg-slate-800 text-primary border-2 border-primary/20 px-6 py-3 rounded-xl font-black hover:bg-primary hover:text-white transition-all"
        >
          CONFIGURER LES ALERTES
        </button>
      </div>

    </div>
  );
}
