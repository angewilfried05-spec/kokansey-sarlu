import { useState, useMemo, useEffect } from 'react';
import type { DataTable } from '../types';

const getNestedValue = <T,>(item: T, key: string): unknown => {
  return key.split('.').reduce((value: unknown, segment) => {
    if (value === null || value === undefined) return value;
    return (value as Record<string, unknown>)[segment];
  }, item as unknown);
};

export function useDataTable<T>(data: T[]): DataTable<T> {
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, data]);

  const filteredData = useMemo(() => {
    if (!search) return data;
    const lowerSearch = search.toLowerCase();
    return data.filter((item) =>
      Object.values(item as Record<string, unknown>).some(val =>
        String(val).toLowerCase().includes(lowerSearch)
      )
    );
  }, [data, search]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key);
      const bValue = getNestedValue(b, sortConfig.key);

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      return sortConfig.direction === 'asc'
        ? aValue < bValue ? -1 : 1
        : aValue > bValue ? -1 : 1;
    });
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return {
    search,
    setSearch,
    sortConfig,
    requestSort,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    sortedData,
    totalPages,
    totalItems: sortedData.length
  };
}
