import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDataTable } from "./useDataTable";

interface TestItem {
  id: string;
  name: string;
  category: string;
  amount: number;
}

const data: TestItem[] = [
  { id: "1", name: "Coton", category: "Industriel", amount: 100 },
  { id: "2", name: "Manioc", category: "Vivrier", amount: 50 },
  { id: "3", name: "Cacao", category: "Industriel", amount: 200 },
];

describe("useDataTable", () => {
  it("returns initial pagination and search state", () => {
    const { result } = renderHook(() => useDataTable(data));
    expect(result.current.paginatedData).toHaveLength(3);
    expect(result.current.totalItems).toBe(3);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.search).toBe("");
  });

  it("filters data with search query", () => {
    const { result } = renderHook(() => useDataTable(data));
    act(() => result.current.setSearch("coton"));
    expect(result.current.paginatedData).toHaveLength(1);
    expect(result.current.paginatedData[0].name).toBe("Coton");
    expect(result.current.totalItems).toBe(1);
  });

  it("sorts data ascending then descending", () => {
    const { result } = renderHook(() => useDataTable(data));
    act(() => result.current.requestSort("amount"));
    expect(result.current.paginatedData[0].amount).toBe(50);
    act(() => result.current.requestSort("amount"));
    expect(result.current.paginatedData[0].amount).toBe(200);
  });

  it("paginates data based on itemsPerPage", () => {
    const { result } = renderHook(() => useDataTable(data));
    act(() => result.current.setItemsPerPage(2));
    expect(result.current.paginatedData).toHaveLength(2);
    expect(result.current.totalPages).toBe(2);
    act(() => result.current.setCurrentPage(2));
    expect(result.current.paginatedData).toHaveLength(1);
  });
});
