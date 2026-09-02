import type { SalesReportBucket } from "@/lib/merchant/sales-report";

export type ExportRow = Record<string, string | number>;

export function salesSeriesToRows(
  series: SalesReportBucket[],
  currency: string,
): ExportRow[] {
  return series.map((row) => ({
    Period: row.label,
    "Period start": row.periodStart,
    Orders: row.orderCount,
    [`Revenue (${currency})`]: (row.revenueCents / 100).toFixed(2),
    [`Avg order (${currency})`]:
      row.orderCount > 0 ? (row.revenueCents / row.orderCount / 100).toFixed(2) : "0.00",
  }));
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => {
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

/** Excel-compatible XML spreadsheet (opens in Excel without extra deps). */
export function toExcelXml(rows: ExportRow[], sheetName = "Sales Report"): string {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const cell = (value: string | number) =>
    `<Cell><Data ss:Type="String">${String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</Data></Cell>`;

  const headerRow = `<Row>${headers.map((h) => cell(h)).join("")}</Row>`;
  const dataRows = rows
    .map((row) => `<Row>${headers.map((h) => cell(row[h] ?? "")).join("")}</Row>`)
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${sheetName}">
  <Table>
   ${headerRow}
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;
}

export function toSimplePdfHtml(title: string, rows: ExportRow[], merchantName: string): string {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const head = headers.map((h) => `<th>${h}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${headers.map((h) => `<td>${String(row[h] ?? "")}</td>`).join("")}</tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 24px; color: #1a1a1a; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  p { color: #666; font-size: 12px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background: #f5f5f5; }
</style></head><body>
<h1>${title}</h1>
<p>${merchantName} · Generated ${new Date().toLocaleString()}</p>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`;
}

export function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportSalesReport(
  format: "csv" | "excel" | "pdf",
  series: SalesReportBucket[],
  currency: string,
  merchantName: string,
  period: string,
) {
  const rows = salesSeriesToRows(series, currency);
  const stamp = new Date().toISOString().slice(0, 10);
  const base = `${merchantName.replace(/\s+/g, "-")}-sales-${period}-${stamp}`;

  if (format === "csv") {
    downloadBlob(toCsv(rows), `${base}.csv`, "text/csv;charset=utf-8");
    return;
  }
  if (format === "excel") {
    downloadBlob(toExcelXml(rows), `${base}.xls`, "application/vnd.ms-excel");
    return;
  }
  const html = toSimplePdfHtml(`${period} sales report`, rows, merchantName);
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }
}
