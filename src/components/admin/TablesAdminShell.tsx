"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { downloadQrPng, TableQrDisplay } from "@/components/admin/TableQrCode";
import { merchantApi } from "@/lib/merchant/fetch";
import { tablePreviewRoute } from "@/lib/navigation/routes";
import { Icon } from "@/components/ui/Icon";

type TablesAdminShellProps = { merchantSlug: string };

type Table = { id: string; tableNumber: string };

type ViewMode = "grid" | "list";

const VIEW_STORAGE_KEY = "irewards-tables-view";

function TableQrActions({
  merchantSlug,
  table,
  url,
  onRemove,
  compact = false,
}: {
  merchantSlug: string;
  table: Table;
  url: string;
  onRemove: () => void;
  compact?: boolean;
}) {
  const qrSize = compact ? 96 : 160;

  return (
    <>
      <TableQrDisplay url={url} size={qrSize} className="shrink-0" />
      <div className={compact ? "flex min-w-0 flex-1 flex-col gap-2" : "mt-4 flex w-full flex-col items-center gap-2"}>
        <h2 className={`font-display text-primary ${compact ? "text-headline-sm" : "text-headline-sm text-center"}`}>
          Table {table.tableNumber}
        </h2>
        <p className={`break-all font-mono text-[10px] text-on-surface-variant ${compact ? "" : "text-center"}`}>
          {url}
        </p>
        <div className={`flex flex-wrap gap-3 ${compact ? "" : "justify-center"}`}>
          <a
            href={tablePreviewRoute(merchantSlug, table.tableNumber)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-label-mono uppercase text-primary underline"
          >
            Preview diner view
          </a>
          <button
            type="button"
            onClick={() => downloadQrPng(url, qrSize, `table-${table.tableNumber}-qr.png`)}
            className="font-mono text-label-mono uppercase text-primary underline"
          >
            Download QR
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="font-mono text-label-mono uppercase text-red-700 underline"
          >
            Remove
          </button>
        </div>
      </div>
    </>
  );
}

export function TablesAdminShell({ merchantSlug }: TablesAdminShellProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [newTable, setNewTable] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const appOrigin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "grid" || stored === "list") setView(stored);
  }, []);

  const load = useCallback(async () => {
    const data = await merchantApi<{ tables: Table[] }>(
      `/api/merchant/${merchantSlug}/tables`,
    );
    setTables(data.tables);
  }, [merchantSlug]);

  useEffect(() => {
    load();
  }, [load]);

  function setViewMode(mode: ViewMode) {
    setView(mode);
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
  }

  async function addTable() {
    if (!newTable.trim()) return;
    await merchantApi(`/api/merchant/${merchantSlug}/tables`, {
      method: "POST",
      body: JSON.stringify({ tableNumber: newTable.trim() }),
    });
    setNewTable("");
    await load();
  }

  async function removeTable(tableId: string) {
    await merchantApi(`/api/merchant/${merchantSlug}/tables`, {
      method: "DELETE",
      body: JSON.stringify({ tableId }),
    });
    await load();
  }

  return (
    <AdminShell merchantSlug={merchantSlug} active="tables" title="Table QR codes" eyebrow="Scan to order">
      <p className="mb-6 max-w-2xl text-body-md text-on-surface-variant">
        Generate QR codes for each table. Diners scan to open their storefront.
      </p>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <input
            value={newTable}
            onChange={(e) => setNewTable(e.target.value)}
            placeholder="Table number"
            className="border border-surface-container-highest px-3 py-2"
            onKeyDown={(e) => e.key === "Enter" && addTable()}
          />
          <button type="button" onClick={addTable} className="bg-primary px-4 py-2 text-on-primary">
            Add table
          </button>
        </div>

        <div className="flex border border-surface-container-highest">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            aria-pressed={view === "grid"}
            className={`flex items-center gap-2 px-3 py-2 font-mono text-label-mono uppercase ${
              view === "grid" ? "bg-primary text-on-primary" : "text-on-surface-variant"
            }`}
          >
            <Icon name="grid_view" />
            Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            aria-pressed={view === "list"}
            className={`flex items-center gap-2 border-l border-surface-container-highest px-3 py-2 font-mono text-label-mono uppercase ${
              view === "list" ? "bg-primary text-on-primary" : "text-on-surface-variant"
            }`}
          >
            <Icon name="view_list" />
            List
          </button>
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center border border-dashed border-surface-container-highest bg-surface-container-lowest">
          <p className="text-body-md text-on-surface-variant">No tables yet — add a table number above.</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tables.map((table) => {
            const url = `${appOrigin}${tablePreviewRoute(merchantSlug, table.tableNumber)}`;
            return (
              <div
                key={table.id}
                className="flex flex-col items-center border border-surface-container-highest bg-surface-container-lowest p-6"
              >
                <TableQrActions
                  merchantSlug={merchantSlug}
                  table={table}
                  url={url}
                  onRemove={() => removeTable(table.id)}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tables.map((table) => {
            const url = `${appOrigin}${tablePreviewRoute(merchantSlug, table.tableNumber)}`;
            return (
              <div
                key={table.id}
                className="flex flex-wrap items-start gap-6 border border-surface-container-highest bg-surface-container-lowest p-4 sm:flex-nowrap"
              >
                <TableQrActions
                  merchantSlug={merchantSlug}
                  table={table}
                  url={url}
                  onRemove={() => removeTable(table.id)}
                  compact
                />
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
