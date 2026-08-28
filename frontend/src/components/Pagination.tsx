import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (count: number) => void;
  totalItems: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const getPageNumbers = () => {
    if (totalPages <= 7) return pages;
    if (currentPage <= 4) return [...pages.slice(0, 5), "...", totalPages];
    if (currentPage >= totalPages - 3) return [1, "...", ...pages.slice(-5)];
    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 pb-2">
      <div className="flex items-center gap-2 text-sm text-gray-600 font-bold">
        <span>Afficher</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="px-3 py-1 border border-gray-200 rounded-lg bg-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={99999}>Tout</option>
        </select>
        <span>élément{totalItems > 1 ? "s" : ""}</span>
        <span className="text-gray-400">
          (
          {(currentPage - 1) * itemsPerPage + 1} -{" "}
          {Math.min(currentPage * itemsPerPage, totalItems)} sur {totalItems})
        </span>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === "number" && onPageChange(page)}
              disabled={page === "..."}
              className={`px-3 py-1 rounded-lg text-sm font-bold transition-all ${
                page === currentPage
                  ? "bg-primary text-white"
                  : page === "..."
                  ? "cursor-default"
                  : "hover:bg-gray-100"
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
