import React, { useState, useEffect } from "react";
import { History, Search, User, Shield, Clock, FileText, Filter, Download } from "lucide-react";
import { fetchWithAuth } from "../lib/api";
import { useDataTable } from "../hooks/useDataTable";
import Pagination from "../components/Pagination";
import * as XLSX from "xlsx";

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  details: string;
  timestamp: string;
  user?: {
    username: string;
    name: string | null;
  };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterEntity, setFilterEntity] = useState<string>("all");

  const auditTable = useDataTable(logs);

  useEffect(() => {
    fetchWithAuth("/api/audit-logs")
      .then(res => res.json())
      .then(data => setLogs(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.action.toLowerCase().includes(auditTable.search.toLowerCase()) ||
      log.entity.toLowerCase().includes(auditTable.search.toLowerCase()) ||
      log.details.toLowerCase().includes(auditTable.search.toLowerCase()));
    
    const matchesAction = filterAction === "all" || log.action === filterAction;
    const matchesEntity = filterEntity === "all" || log.entity === filterEntity;
    
    return matchesSearch && matchesAction && matchesEntity;
  });

  // Get unique entities and actions for filters
  const uniqueActions = Array.from(new Set(logs.map(log => log.action)));
  const uniqueEntities = Array.from(new Set(logs.map(log => log.entity)));

  // Export to Excel
  const handleExcelExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredLogs.map(log => ({
      "Date & Heure": new Date(log.timestamp).toLocaleString('fr-FR'),
      "Utilisateur": log.user?.name || log.user?.username || "Système",
      "Action": log.action,
      "Entité": log.entity,
      "Détails": log.details
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Logs");
    XLSX.writeFile(workbook, `audit-logs-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Sorting function
  const sortLogs = (logsToSort: AuditLog[]) => {
    if (!auditTable.sortConfig) return logsToSort;
    return [...logsToSort].sort((a, b) => {
      const aVal = (a as any)[auditTable.sortConfig!.key];
      const bVal = (b as any)[auditTable.sortConfig!.key];
      if (aVal < bVal) return auditTable.sortConfig!.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return auditTable.sortConfig!.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Get paginated logs
  const getPaginatedLogs = () => {
    const sorted = sortLogs(filteredLogs);
    const start = (auditTable.currentPage - 1) * auditTable.itemsPerPage;
    return sorted.slice(start, start + auditTable.itemsPerPage);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Journal d'Audit</h2>
          <p className="text-gray-500 font-medium">Historique complet des actions effectuées sur le système</p>
        </div>
        <button 
          onClick={handleExcelExport}
          className="bg-white text-primary border border-gray-200 px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-primary/5 transition-all font-bold shadow-sm"
        >
          <Download className="w-5 h-5" />
          Exporter Excel
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Rechercher une action..." 
                className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={auditTable.search}
                onChange={e => auditTable.setSearch(e.target.value)}
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select 
                className="pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
              >
                <option value="all">Toutes les actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            <select 
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
              value={filterEntity}
              onChange={e => setFilterEntity(e.target.value)}
            >
              <option value="all">Toutes les entités</option>
              {uniqueEntities.map(entity => (
                <option key={entity} value={entity}>{entity}</option>
              ))}
            </select>
          </div>

          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {filteredLogs.length} ACTIONS ENREGISTRÉES
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100" onClick={() => auditTable.requestSort('timestamp')}>Date & Heure</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100" onClick={() => auditTable.requestSort('userId')}>Utilisateur</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100" onClick={() => auditTable.requestSort('action')}>Action</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100" onClick={() => auditTable.requestSort('entity')}>Entité</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-400 italic font-bold">Chargement du journal...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-400 italic font-bold">Aucune action trouvée</td></tr>
              ) : getPaginatedLogs().map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      {new Date(log.timestamp).toLocaleString('fr-FR')}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                        {log.user?.name ? log.user.name[0].toUpperCase() : log.user?.username[0].toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-800 uppercase tracking-tight">{log.user?.name || "Système"}</span>
                        <span className="text-[10px] text-gray-400 font-bold">@{log.user?.username}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      log.action === 'CREATE' ? 'bg-green-50 text-green-600' :
                      log.action === 'DELETE' ? 'bg-red-50 text-red-600' :
                      log.action === 'UPDATE' ? 'bg-blue-50 text-blue-600' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-sm font-black text-gray-700 uppercase">
                      <FileText className="w-4 h-4 text-gray-300" />
                      {log.entity}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-xs font-medium text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100 max-w-md overflow-hidden text-ellipsis">
                      {log.details}
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
              currentPage={auditTable.currentPage}
              totalPages={Math.ceil(filteredLogs.length / auditTable.itemsPerPage)}
              onPageChange={auditTable.setCurrentPage}
              itemsPerPage={auditTable.itemsPerPage}
              onItemsPerPageChange={auditTable.setItemsPerPage}
              totalItems={filteredLogs.length}
            />
          </div>
        )}
      </div>
    </div>
  );
}
