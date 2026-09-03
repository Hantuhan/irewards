"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apexDomain, merchantPublicOrigin } from "@/lib/tenancy/host";

type Tenant = {
  id: string;
  slug: string;
  subdomain: string;
  name: string;
  currency: string;
  retentionEnabled: boolean;
  suspended: boolean;
  createdAt: string | null;
  staffCount: number;
};

export function PlatformTenantsConsole() {
  const apex = apexDomain();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/platform/tenants", { credentials: "include" });
      if (response.status === 401) {
        router.replace("/platform/login");
        return;
      }
      const json = (await response.json()) as { tenants?: Tenant[]; error?: string };
      if (!response.ok) throw new Error(json.error ?? "Failed to load tenants");
      setTenants(json.tenants ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchTenant(merchantId: string, body: Record<string, unknown>) {
    const response = await fetch("/api/platform/tenants", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantId, ...body }),
    });
    if (response.status === 401) {
      router.replace("/platform/login");
      return;
    }
    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setError(json.error ?? "Update failed");
      return;
    }
    await load();
  }

  async function logout() {
    await fetch("/api/platform/auth/login", { method: "DELETE", credentials: "include" });
    router.replace("/platform/login");
  }

  return (
    <main className="min-h-screen bg-surface p-6 md:p-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Platform
          </p>
          <h1 className="font-display text-display-md text-primary">All tenants</h1>
        </div>
        <div className="flex gap-4">
          <Link href="/signup" className="font-display text-eyebrow uppercase underline">
            Merchant signup
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="font-display text-eyebrow uppercase underline"
          >
            Lock console
          </button>
        </div>
      </header>

      {loading && <p>Loading tenants…</p>}
      {error && <p className="mb-4 text-body-md text-on-surface-variant">{error}</p>}

      <div className="overflow-x-auto border border-surface-container-highest bg-surface-container-lowest">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="border-b border-surface-container-highest bg-surface-container-low">
              {["Cafe", "Subdomain", "Currency", "Staff", "Retention", "Status", "Opened", "Open"].map(
                (col) => (
                  <th
                    key={col}
                    className="px-4 py-3 font-display text-eyebrow uppercase text-on-surface-variant"
                  >
                    {col}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-surface-container">
                <td className="px-4 py-3 font-display text-headline-sm text-primary">{t.name}</td>
                <td className="px-4 py-3 font-mono text-label-mono">{t.subdomain}.{apex}</td>
                <td className="px-4 py-3">{t.currency}</td>
                <td className="px-4 py-3 font-mono text-label-mono">{t.staffCount}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="font-display text-eyebrow uppercase underline"
                    onClick={() => void patchTenant(t.id, { retentionEnabled: !t.retentionEnabled })}
                  >
                    {t.retentionEnabled ? "On" : "Off"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="font-display text-eyebrow uppercase underline"
                    onClick={() => void patchTenant(t.id, { suspended: !t.suspended })}
                  >
                    {t.suspended ? "Suspended" : "Active"}
                  </button>
                </td>
                <td className="px-4 py-3 text-body-md text-on-surface-variant">
                  {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`/dashboard/${t.slug}`}
                    className="mr-3 font-display text-eyebrow uppercase underline"
                  >
                    Dashboard
                  </a>
                  <a
                    href={merchantPublicOrigin(t.subdomain)}
                    className="font-display text-eyebrow uppercase underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Portal
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
