"use client";

import { useCallback, useEffect, useState } from "react";
import { merchantApi } from "@/lib/merchant/fetch";
import { MAX_MERCHANT_USERS } from "@/lib/merchant/team-limits";
import { merchantPublicOrigin } from "@/lib/tenancy/host";

type TeamMember = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  active: boolean;
  lastLoginAt: string | null;
};

type TeamPanelProps = {
  merchantSlug: string;
};

export function TeamSettingsPanel({ merchantSlug }: TeamPanelProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [limit, setLimit] = useState(MAX_MERCHANT_USERS);
  const [used, setUsed] = useState(0);
  const [subdomain, setSubdomain] = useState(merchantSlug);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"manager" | "staff">("staff");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await merchantApi<{
        members: TeamMember[];
        subdomain: string;
        limit?: number;
        used?: number;
      }>(`/api/merchant/${merchantSlug}/team`);
      setMembers(data.members);
      setLimit(data.limit ?? MAX_MERCHANT_USERS);
      setUsed(data.used ?? data.members.filter((m) => m.active).length);
      setSubdomain(data.subdomain || merchantSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }, [merchantSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (atCap) {
      setError(`This cafe already has ${limit} users. Deactivate someone to add another.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await merchantApi(`/api/merchant/${merchantSlug}/team`, {
        method: "POST",
        body: JSON.stringify({ email, password, name, role }),
      });
      setEmail("");
      setName("");
      setPassword("");
      setRole("staff");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setSaving(false);
    }
  }

  async function setActive(userId: string, active: boolean) {
    setError(null);
    try {
      await merchantApi(`/api/merchant/${merchantSlug}/team`, {
        method: "PATCH",
        body: JSON.stringify({ userId, active }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  const storeUrl = merchantPublicOrigin(subdomain);
  const remaining = Math.max(0, limit - used);
  const atCap = remaining <= 0;

  return (
    <div className="space-y-8">
      <section className="border border-surface-container-highest bg-surface-container-lowest p-4">
        <h2 className="font-display text-headline-sm text-primary">Cafe subdomain</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Diners and staff reach this cafe at its own host. Path URLs still work for QR codes.
        </p>
        <p className="mt-3 font-mono text-label-mono text-primary">{storeUrl}</p>
      </section>

      <section>
        <h2 className="font-display text-headline-sm text-primary">Team</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Up to {limit} logins for this cafe — owner, manager, or staff. {used} of {limit} in use.
        </p>
        {loading && <p className="mt-3">Loading team…</p>}
        {error && <p className="mt-3 text-body-md text-on-surface-variant">{error}</p>}
        <ul className="mt-4 divide-y divide-surface-container border border-surface-container-highest">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-display text-headline-sm">{m.name ?? m.email}</p>
                <p className="font-mono text-label-mono text-on-surface-variant">{m.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="border border-surface-container-highest px-2 py-1 font-display text-eyebrow uppercase">
                  {m.role}
                  {!m.active ? " · off" : ""}
                </span>
                {m.role !== "owner" && (
                  <button
                    type="button"
                    className="font-display text-eyebrow uppercase underline"
                    onClick={() => void setActive(m.id, !m.active)}
                  >
                    {m.active ? "Deactivate" : "Reactivate"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-surface-container-highest bg-surface-container-low p-4">
        <h2 className="font-display text-headline-sm text-primary">Invite staff</h2>
        {atCap ? (
          <p className="mt-2 text-body-md text-on-surface-variant">
            This cafe already has {limit} users. Deactivate someone to add another.
          </p>
        ) : (
          <p className="mt-2 text-body-md text-on-surface-variant">
            {remaining} seat{remaining === 1 ? "" : "s"} left.
          </p>
        )}
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => void invite(e)}>
          <label className="block text-body-md">
            Name
            <input
              className="mt-1 w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block text-body-md">
            Email
            <input
              type="email"
              className="mt-1 w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block text-body-md">
            Temporary password
            <input
              type="password"
              minLength={12}
              className="mt-1 w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <label className="block text-body-md">
            Role
            <select
              className="mt-1 w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
              value={role}
              onChange={(e) => setRole(e.target.value as "manager" | "staff")}
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving || atCap}
              className="border border-primary bg-primary px-4 py-2 font-display text-eyebrow uppercase text-on-primary disabled:opacity-50"
            >
              {saving ? "Inviting…" : atCap ? "Team full" : "Add team member"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
