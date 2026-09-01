"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { merchantApi } from "@/lib/merchant/fetch";

type AdminDashboardShellProps = {
  merchantSlug: string;
};

type KitchenStatus = "new" | "preparing" | "ready" | "served";

type OrderCard = {
  id: string;
  tableNumber: string | null;
  customerDisplay: string | null;
  kitchenStatus: string | null;
  paidAt: string | null;
  items: { name: string; quantity: number }[];
};

type BoardFilter = "active" | KitchenStatus;

const STATUS_META: Record<
  KitchenStatus,
  { label: string; next: KitchenStatus | null; action: string | null }
> = {
  new: { label: "New", next: "preparing", action: "Start preparing" },
  preparing: { label: "Preparing", next: "ready", action: "Mark ready" },
  ready: { label: "Ready", next: "served", action: "Mark served" },
  served: { label: "Served", next: null, action: null },
};

const FILTERS: { id: BoardFilter; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "new", label: "New" },
  { id: "preparing", label: "Preparing" },
  { id: "ready", label: "Ready" },
  { id: "served", label: "Served" },
];

function isKitchenStatus(value: string | null): value is KitchenStatus {
  return value === "new" || value === "preparing" || value === "ready" || value === "served";
}

export function AdminDashboardShell({ merchantSlug }: AdminDashboardShellProps) {
  const [orders, setOrders] = useState<OrderCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BoardFilter>("active");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await merchantApi<{ orders: OrderCard[] }>(
        `/api/merchant/${merchantSlug}/orders`,
      );
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [merchantSlug]);

  useEffect(() => {
    load();
    const stream = new EventSource(`/api/merchant/${merchantSlug}/orders/stream`, {
      withCredentials: true,
    });
    stream.onmessage = () => {
      load();
    };
    stream.onerror = () => {
      stream.close();
    };
    return () => stream.close();
  }, [load, merchantSlug]);

  const counts = useMemo(() => {
    const c = { active: 0, new: 0, preparing: 0, ready: 0, served: 0 };
    for (const order of orders) {
      if (!isKitchenStatus(order.kitchenStatus)) continue;
      c[order.kitchenStatus] += 1;
      if (order.kitchenStatus !== "served") c.active += 1;
    }
    return c;
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const list = orders.filter((o) => isKitchenStatus(o.kitchenStatus));
    const filtered =
      filter === "active"
        ? list.filter((o) => o.kitchenStatus !== "served")
        : list.filter((o) => o.kitchenStatus === filter);

    return filtered.sort((a, b) => {
      const ta = a.paidAt ? new Date(a.paidAt).getTime() : 0;
      const tb = b.paidAt ? new Date(b.paidAt).getTime() : 0;
      return tb - ta;
    });
  }, [orders, filter]);

  async function advanceOrder(orderId: string, kitchenStatus: KitchenStatus) {
    await merchantApi(`/api/merchant/${merchantSlug}/orders`, {
      method: "PATCH",
      body: JSON.stringify({ orderId, kitchenStatus }),
    });
    await load();
  }

  function formatTime(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <AdminShell
      merchantSlug={merchantSlug}
      active="orders"
      title="Order board"
      eyebrow="Live kitchen"
      layout="viewport"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const count = counts[f.id];
              const isActive = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`inline-flex items-center gap-2 border px-3 py-1.5 font-body-md transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-on-primary"
                      : "border-surface-container-highest text-on-surface-variant hover:border-primary hover:text-primary"
                  }`}
                >
                  {f.label}
                  <span
                    className={`font-mono text-label-mono ${
                      isActive ? "text-on-primary/80" : "text-on-surface-variant"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="font-mono text-label-mono text-on-surface-variant">
            {loading ? "Refreshing…" : `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
          </p>
        </div>

        {error && <p className="shrink-0 text-red-700">{error}</p>}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visibleOrders.length === 0 ? (
            <div className="flex h-full min-h-[200px] items-center justify-center border border-dashed border-surface-container-highest bg-surface-container-lowest">
              <p className="text-body-md text-on-surface-variant">
                {filter === "active" ? "No active orders — all caught up." : "No orders in this view."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {visibleOrders.map((order) => {
                const status = order.kitchenStatus as KitchenStatus;
                const meta = STATUS_META[status];
                const isServed = status === "served";

                return (
                  <article
                    key={order.id}
                    className={`flex flex-col border border-surface-container-highest bg-surface-container-lowest p-4 ${
                      isServed ? "opacity-75" : ""
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-headline-sm font-bold text-primary">
                          Table {order.tableNumber ?? "—"}
                        </p>
                        <p className="mt-1 font-mono text-label-mono text-on-surface-variant">
                          {formatTime(order.paidAt)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 border px-2 py-1 font-display text-eyebrow uppercase ${
                          status === "new"
                            ? "border-primary bg-primary text-on-primary"
                            : status === "ready"
                              ? "border-primary text-primary"
                              : "border-surface-container-highest bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {meta.label}
                      </span>
                    </div>

                    {order.customerDisplay && (
                      <p className="mb-2 font-mono text-label-mono text-on-surface-variant">
                        {order.customerDisplay}
                      </p>
                    )}

                    <ul className="flex-1 space-y-1 border-t border-surface-container-highest pt-3 text-body-md">
                      {order.items.map((item) => (
                        <li key={`${order.id}-${item.name}`}>
                          <span className="font-mono text-label-mono">{item.quantity}×</span> {item.name}
                        </li>
                      ))}
                    </ul>

                    {meta.next && meta.action && (
                      <button
                        type="button"
                        onClick={() => advanceOrder(order.id, meta.next!)}
                        className={`mt-4 w-full py-2 font-display text-eyebrow uppercase ${
                          status === "new"
                            ? "border border-primary text-primary hover:bg-surface-container-low"
                            : "bg-primary text-on-primary hover:opacity-90"
                        }`}
                      >
                        {meta.action}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
