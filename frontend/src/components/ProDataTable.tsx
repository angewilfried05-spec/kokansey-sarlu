import React from "react";
import { Search, Filter, Download, ChevronDown, ChevronUp, CheckSquare, Square, MoreHorizontal, X } from "lucide-react";
import * as XLSX from "xlsx";
import Pagination from "./Pagination";

export interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T, index: number) => React.ReactNode;
}

export interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface ProDataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  searchPlaceholder?: string;
  searchableKeys?: (keyof T)[];
  filters?: FilterOption[];
  onExport?: (filteredData: T[]) => void;
  bulkActions?: {
    label: string;
    onClick: (selectedIds: string[]) => void;
    variant?: "primary" | "danger" | "secondary";
  }[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    itemsPerPage: number;
    onItemsPerPageChange: (count: number) => void;
  };
  sortConfig?: { key: keyof T; direction: "asc" | "desc" };
  onSort?: (key: keyof T) => void;
}

export default function ProDataTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  emptyState,
  searchPlaceholder = "Rechercher...",
  searchableKeys,
  filters = [],
  onExport,
  bulkActions = [],
  pagination,
  sortConfig,
  onSort,
}: ProDataTableProps<T>) {
  const [search, setSearch] = React.useState("");
  const [activeFilters, setActiveFilters] = React.useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [showFilters, setShowFilters] = React.useState(false);
  const [showBulkMenu, setShowBulkMenu] = React.useState(false);

  // Filter and search logic
  const filteredData = React.useMemo(() => {
    let result = [...data];

    // Apply search
    if (search && searchableKeys) {
      result = result.filter(item =>
        searchableKeys.some(key => {
          const value = item[key];
          return String(value).toLowerCase().includes(search.toLowerCase());
        })
      );
    }

    // Apply filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value !== "all") {
        result = result.filter(item => String(item[key as keyof T]) === value);
      }
    });

    return result;
  }, [data, search, activeFilters, searchableKeys]);

  // Sort logic
  const sortedData = React.useMemo(() => {
    if (!sortConfig) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate logic (if no external pagination provided)
  const [internalPage, setInternalPage] = React.useState(1);
  const [internalItemsPerPage, setInternalItemsPerPage] = React.useState(10);
  
  const displayData = pagination 
    ? sortedData 
    : sortedData.slice((internalPage - 1) * internalItemsPerPage, internalPage * internalItemsPerPage);

  const totalPages = pagination ? pagination.totalPages : Math.ceil(sortedData.length / internalItemsPerPage);

  // Default export handler
  const handleDefaultExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(sortedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
    XLSX.writeFile(workbook, `export-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Bulk selection
  const toggleSelectAll = () => {
    if (selectedIds.length === displayData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayData.map(item => item.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="card overflow-hidden">
      {/* Header Actions */}
      <div className="p-6 border-b border-gray-50 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filters Toggle */}
            {filters.length > 0 && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                  showFilters ? "bg-primary/10 text-primary" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtres
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Count */}
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {sortedData.length} ÉLÉMENTS
            </span>

            {/* Export */}
            <button
              onClick={() => onExport ? onExport(sortedData) : handleDefaultExport()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
          </div>
        </div>

        {/* Active Filters */}
        {showFilters && filters.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
            {filters.map((filter) => (
              <select
                key={filter.key}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={activeFilters[filter.key] || "all"}
                onChange={(e) => setActiveFilters(prev => ({ ...prev, [filter.key]: e.target.value }))}
              >
                <option value="all">Tous les {filter.label.toLowerCase()}</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50">
              {bulkActions.length > 0 && (
                <th className="px-6 py-4 w-12">
                  <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600">
                    {selectedIds.length === displayData.length ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest ${
                    col.sortable ? "cursor-pointer hover:bg-gray-100" : ""
                  }`}
                  onClick={() => col.sortable && onSort && onSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortConfig?.key === col.key && (
                      <span className="text-primary">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {bulkActions.length > 0 && <td className="px-6 py-4"><div className="w-5 h-5 bg-gray-200 dark:bg-slate-700 rounded" /></td>}
                  {columns.map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded" style={{ width: `${55 + ((i + j) % 3) * 15}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (bulkActions.length > 0 ? 1 : 0)} className="px-6 py-12">
                  {emptyState || (
                    <div className="text-center text-gray-400 italic font-bold">
                      Aucune donnée disponible
                    </div>
                  )}
                </td>
              </tr>
            ) : displayData.map((item, index) => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                {bulkActions.length > 0 && (
                  <td className="px-6 py-4">
                    <button onClick={() => toggleSelect(item.id)} className="text-gray-400 hover:text-gray-600">
                      {selectedIds.includes(item.id) ? (
                        <CheckSquare className="w-5 h-5 text-primary" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                )}
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-6 py-4">
                    {col.render ? col.render(item[col.key], item, index) : String(item[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Actions Bar */}
      {bulkActions.length > 0 && selectedIds.length > 0 && (
        <div className="px-6 py-4 bg-primary/5 border-t border-primary/10 flex items-center justify-between animate-in slide-in-from-bottom">
          <span className="text-sm font-bold text-primary">
            {selectedIds.length} élément{selectedIds.length > 1 ? "s" : ""} sélectionné{selectedIds.length > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => setShowBulkMenu(!showBulkMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
              Actions
            </button>
            {showBulkMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden min-w-[200px]">
                {bulkActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      action.onClick(selectedIds);
                      setShowBulkMenu(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-gray-50 transition-colors ${
                      action.variant === "danger" ? "text-red-600" : action.variant === "primary" ? "text-primary" : "text-gray-700"
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && sortedData.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-100">
          {pagination ? (
            <Pagination {...pagination} totalItems={sortedData.length} />
          ) : (
            <Pagination
              currentPage={internalPage}
              totalPages={totalPages}
              onPageChange={setInternalPage}
              itemsPerPage={internalItemsPerPage}
              onItemsPerPageChange={setInternalItemsPerPage}
              totalItems={sortedData.length}
            />
          )}
        </div>
      )}
    </div>
  );
}
