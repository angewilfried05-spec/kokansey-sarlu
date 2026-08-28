import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export type ExportColumn<T> = {
  label: string;
  value: keyof T | ((item: T) => string | number);
};

function getCellValue<T>(item: T, column: ExportColumn<T>): string | number {
  if (typeof column.value === "function") {
    return column.value(item);
  }
  const raw = item[column.value];
  return raw == null ? "" : String(raw);
}

export function exportToExcel<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  sheetName = "Export"
) {
  const rows = data.map((item) =>
    columns.reduce((acc, col) => {
      acc[col.label] = getCellValue(item, col);
      return acc;
    }, {} as Record<string, string | number>)
  );

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  XLSX.writeFile(workbook, `${filename.replace(/ /g, "_")}_${Date.now()}.xlsx`);
}

export function exportToPDF<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  title: string
) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.setTextColor(26, 77, 46);
  doc.text("KOKANSEY SARLU", 105, 15, { align: "center" });
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(title.toUpperCase(), 105, 23, { align: "center" });
  doc.setFontSize(9);
  doc.text(`Généré le ${new Date().toLocaleDateString()}`, 105, 29, { align: "center" });

  const headers = [columns.map((c) => c.label)];
  const body = data.map((item) => columns.map((col) => String(getCellValue(item, col))));

  autoTable(doc, {
    startY: 35,
    head: headers,
    body,
    theme: "grid",
    headStyles: { fillColor: [26, 77, 46], textColor: [255, 255, 255] },
    styles: { fontSize: 9 },
  });

  doc.save(`${filename.replace(/ /g, "_")}_${Date.now()}.pdf`);
}
