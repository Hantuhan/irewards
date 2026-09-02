"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  formatVoucherDate,
  formatVoucherDateTime,
  type VoucherInventoryItem,
  type VoucherStatus,
  voucherStatusDotClass,
  voucherStatusLabel,
} from "@/lib/campaigns/voucher-inventory";
import { merchantApi } from "@/lib/merchant/fetch";

const labelClass = "font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant";

type StatusFilter = "all" | VoucherStatus;

type PromoVoucherInventoryViewProps = {
  merchantSlug: string;
  onCreateVoucher: (input: {
    name: string;
    code: string;
    type: "percentage" | "fixed";
    value: number;
    expiresAt: string | null;
  }) => Promise<void>;
  onRevokeVoucher: (promoId: string) => Promise<void>;
};

function StatusBadge({ status }: { status: VoucherStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-on-surface-variant">
      <span className={`h-1.5 w-1.5 rounded-full ${voucherStatusDotClass(status)}`} />
      {voucherStatusLabel(status)}
    </span>
  );
}

function generateVoucherCode(prefix: string): string {
  const base = prefix.trim().replace(/\s+/g, "-").toUpperCase().slice(0, 12) || "PROMO";
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${base}-${suffix}`;
}

export function PromoVoucherInventoryView({
  merchantSlug,
  onCreateVoucher,
  onRevokeVoucher,
}: PromoVoucherInventoryViewProps) {
  const [vouchers, setVouchers] = useState<VoucherInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    code: "",
    type: "percentage" as "percentage" | "fixed",
    value: 20,
    expiresAt: "",
  });

  async function loadInventory() {
    setLoading(true);
    try {
      const data = await merchantApi<{ vouchers: VoucherInventoryItem[] }>(
        `/api/merchant/${merchantSlug}/promos/inventory`,
      );
      setVouchers(data.vouchers);
      if (!selectedId && data.vouchers.length > 0) {
        setSelectedId(data.vouchers[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantSlug]);

  const filtered = useMemo(() => {
    let list = vouchers;
    if (statusFilter !== "all") {
      list = list.filter((v) => v.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.code.toLowerCase().includes(q) ||
          v.customerName?.toLowerCase().includes(q) ||
          v.promoName.toLowerCase().includes(q) ||
          v.valueLabel.toLowerCase().includes(q),
      );
    }
    return list;
  }, [vouchers, search, statusFilter]);

  const selected = useMemo(
    () => vouchers.find((v) => v.id === selectedId) ?? null,
    [vouchers, selectedId],
  );

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((v) => v.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  async function handleCreate() {
    if (!createForm.name.trim() || !createForm.code.trim()) return;
    setCreating(true);
    try {
      await onCreateVoucher({
        name: createForm.name.trim(),
        code: createForm.code.trim().toUpperCase(),
        type: createForm.type,
        value: createForm.value,
        expiresAt: createForm.expiresAt ? new Date(createForm.expiresAt).toISOString() : null,
      });
      setCreateForm({ name: "", code: "", type: "percentage", value: 20, expiresAt: "" });
      setShowCreate(false);
      await loadInventory();
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke() {
    if (!selected || selected.status !== "active") return;
    setRevoking(true);
    try {
      await onRevokeVoucher(selected.promoId);
      await loadInventory();
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 border-b border-surface-container-highest pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className={labelClass}>Promo codes</p>
          <h2 className="mt-1 font-display text-headline-md text-primary">Voucher inventory</h2>
          <p className="mt-2 max-w-xl text-body-md text-on-surface-variant">
            Manage and track issued promotional vouchers.
          </p>
        </div>
        <div className="relative w-full max-w-md">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vouchers…"
            className="h-10 w-full border border-surface-container-highest bg-surface-container-lowest pl-10 pr-3 text-body-md outline-none focus:border-primary/40"
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-9 border border-surface-container-highest bg-surface-container-lowest px-3 text-body-md"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="redeemed">Redeemed</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setShowCreate((v) => !v);
            if (!createForm.code) {
              setCreateForm((f) => ({ ...f, code: generateVoucherCode(f.name || "PROMO") }));
            }
          }}
          className="inline-flex h-9 items-center gap-1.5 bg-primary px-4 text-body-md font-medium text-on-primary hover:opacity-90"
        >
          <Icon name="add" className="text-base" />
          Create manual voucher
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 border border-surface-container-highest bg-surface-container-low p-4">
          <p className={labelClass}>New voucher</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={createForm.name}
              onChange={(e) => {
                const name = e.target.value;
                setCreateForm((f) => ({
                  ...f,
                  name,
                  code: f.code || generateVoucherCode(name),
                }));
              }}
              placeholder="Voucher name"
              className="min-w-[160px] flex-1 border border-surface-container-highest bg-surface-container-lowest px-3 py-2 text-body-md"
            />
            <input
              value={createForm.code}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
              }
              placeholder="Code"
              className="w-40 border border-surface-container-highest bg-surface-container-lowest px-3 py-2 font-mono text-body-md"
            />
            <select
              value={createForm.type}
              onChange={(e) =>
                setCreateForm((f) => ({
                  ...f,
                  type: e.target.value as "percentage" | "fixed",
                }))
              }
              className="border border-surface-container-highest bg-surface-container-lowest px-3 py-2 text-body-md"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
            <input
              type="number"
              min={1}
              value={createForm.value}
              onChange={(e) => setCreateForm((f) => ({ ...f, value: Number(e.target.value) }))}
              className="w-20 border border-surface-container-highest bg-surface-container-lowest px-3 py-2 text-body-md"
            />
            <input
              type="date"
              value={createForm.expiresAt}
              onChange={(e) => setCreateForm((f) => ({ ...f, expiresAt: e.target.value }))}
              className="border border-surface-container-highest bg-surface-container-lowest px-3 py-2 text-body-md"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !createForm.name.trim() || !createForm.code.trim()}
              className="bg-primary px-4 py-2 text-body-md text-on-primary disabled:opacity-50"
            >
              {creating ? "Creating…" : "Issue voucher"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="border border-surface-container-highest px-4 py-2 text-body-md"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-[520px] flex-col border border-surface-container-highest lg:flex-row">
        <div className="min-w-0 flex-1 border-b border-surface-container-highest lg:border-b-0 lg:border-r">
          {loading ? (
            <p className="px-4 py-12 text-center text-on-surface-variant">Loading vouchers…</p>
          ) : (
            <table className="w-full text-left text-body-md">
              <thead>
                <tr className="border-b border-surface-container-highest bg-surface-container-low">
                  {["Code", "Customer", "Value", "Status", "Expiry"].map((h) => (
                    <th key={h} className={`px-4 py-3 ${labelClass}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-on-surface-variant">
                      No vouchers yet. Create a manual voucher to get started.
                    </td>
                  </tr>
                ) : (
                  filtered.map((v) => {
                    const active = v.id === selectedId;
                    return (
                      <tr
                        key={v.id}
                        onClick={() => setSelectedId(v.id)}
                        className={`cursor-pointer border-b border-surface-container-highest transition-colors ${
                          active ? "bg-surface-container-low" : "hover:bg-surface-container-low/60"
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-[13px] font-medium text-primary">
                          {v.code}
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant">
                          {v.customerName ?? "—"}
                        </td>
                        <td className="px-4 py-3">{v.valueLabel}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={v.status} />
                        </td>
                        <td className="px-4 py-3 tabular-nums text-on-surface-variant">
                          {formatVoucherDate(v.expiresAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <aside className="w-full shrink-0 bg-surface-container-lowest p-5 lg:w-[340px]">
            <p className={labelClass}>Voucher details</p>
            <div className="mt-3 border border-surface-container-highest bg-surface-container-low px-4 py-3">
              <p className="font-mono text-[22px] font-semibold leading-tight tracking-tight text-primary">
                {selected.code}
              </p>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 text-body-md">
              <div>
                <dt className={labelClass}>Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={selected.status} />
                </dd>
              </div>
              <div>
                <dt className={labelClass}>Value</dt>
                <dd className="mt-1 font-medium text-primary">{selected.valueLabel}</dd>
              </div>
              <div>
                <dt className={labelClass}>Customer</dt>
                <dd className="mt-1 text-on-surface-variant">{selected.customerName ?? "—"}</dd>
              </div>
              <div>
                <dt className={labelClass}>Expiry</dt>
                <dd className="mt-1 tabular-nums text-on-surface-variant">
                  {formatVoucherDate(selected.expiresAt)}
                </dd>
              </div>
            </dl>

            <div className="mt-6">
              <p className={labelClass}>Redemption history</p>
              <ol className="relative mt-4 space-y-4 border-l border-surface-container-highest pl-4">
                <li>
                  <span className="absolute -left-[5px] mt-1.5 h-2 w-2 rounded-full bg-primary" />
                  <p className="text-body-md font-medium text-primary">Issued manually</p>
                  <p className="text-[12px] text-on-surface-variant">
                    {formatVoucherDateTime(selected.issuedAt)}
                  </p>
                  {selected.issuedBy && (
                    <p className="text-[12px] text-on-surface-variant">By {selected.issuedBy}</p>
                  )}
                </li>
                {selected.redeemedAt ? (
                  <li>
                    <span className="absolute -left-[5px] mt-1.5 h-2 w-2 rounded-full bg-outline-variant" />
                    <p className="text-body-md font-medium text-primary">Redeemed</p>
                    <p className="text-[12px] text-on-surface-variant">
                      {formatVoucherDateTime(selected.redeemedAt)}
                    </p>
                    {selected.customerName && (
                      <p className="text-[12px] text-on-surface-variant">By {selected.customerName}</p>
                    )}
                  </li>
                ) : selected.status === "active" ? (
                  <li className="text-[12px] italic text-on-surface-variant">Awaiting redemption…</li>
                ) : null}
              </ol>
            </div>

            {selected.status === "active" && (
              <button
                type="button"
                onClick={handleRevoke}
                disabled={revoking}
                className="mt-8 h-10 w-full border border-on-surface bg-surface-container-lowest text-body-md font-medium uppercase tracking-wide hover:bg-surface-container-low disabled:opacity-50"
              >
                {revoking ? "Revoking…" : "Revoke voucher"}
              </button>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
