"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { validatePasswordStrength } from "@/lib/auth/password-policy";
import { slugifyMerchantName } from "@/lib/tenancy/slug";
import { apexDomain } from "@/lib/tenancy/host";

export function SignupForm() {
  const router = useRouter();
  const [cafeName, setCafeName] = useState("");
  const [currency, setCurrency] = useState<"MYR" | "SGD">("MYR");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [subdomainOverride, setSubdomainOverride] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const apex = apexDomain();
  const suggested = useMemo(() => slugifyMerchantName(cafeName || "cafe"), [cafeName]);
  const subdomain = (subdomainOverride || suggested).toLowerCase();
  const passwordIssues = validatePasswordStrength(ownerPassword);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/merchant/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          cafeName,
          currency,
          ownerName,
          ownerEmail,
          ownerPassword,
          subdomain,
        }),
      });
      const json = (await response.json()) as {
        error?: string;
        merchant?: { dashboardPath: string; portalUrl: string; subdomain: string };
      };
      if (!response.ok) throw new Error(json.error ?? "Signup failed");
      router.push(json.merchant?.dashboardPath ?? "/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="w-full max-w-lg">
        <header className="zenith-surface mb-6 px-8 py-6 text-center">
          <span className="font-display text-headline-sm font-bold text-primary">iRewards</span>
          <p className="mt-2 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Open your cafe portal
          </p>
        </header>

        <form onSubmit={(e) => void handleSubmit(e)} className="zenith-surface flex flex-col gap-4 p-8">
          <label className="block">
            <span className="font-display text-eyebrow uppercase text-on-surface-variant">Cafe name</span>
            <input
              className="mt-2 w-full border border-surface-container-highest px-3 py-2"
              value={cafeName}
              onChange={(e) => setCafeName(e.target.value)}
              required
              minLength={2}
            />
          </label>

          <label className="block">
            <span className="font-display text-eyebrow uppercase text-on-surface-variant">
              Subdomain (auto)
            </span>
            <div className="mt-2 flex items-center gap-2">
              <input
                className="w-full border border-surface-container-highest px-3 py-2 font-mono text-label-mono"
                value={subdomainOverride || suggested}
                onChange={(e) => setSubdomainOverride(e.target.value.toLowerCase())}
                pattern="[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?"
              />
              <span className="shrink-0 text-body-md text-on-surface-variant">.{apex}</span>
            </div>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Your storefront: https://{subdomain}.{apex}
            </p>
          </label>

          <label className="block">
            <span className="font-display text-eyebrow uppercase text-on-surface-variant">Currency</span>
            <select
              className="mt-2 w-full border border-surface-container-highest px-3 py-2"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "MYR" | "SGD")}
            >
              <option value="MYR">Malaysia (MYR)</option>
              <option value="SGD">Singapore (SGD)</option>
            </select>
          </label>

          <label className="block">
            <span className="font-display text-eyebrow uppercase text-on-surface-variant">Your name</span>
            <input
              className="mt-2 w-full border border-surface-container-highest px-3 py-2"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="font-display text-eyebrow uppercase text-on-surface-variant">Work email</span>
            <input
              type="email"
              className="mt-2 w-full border border-surface-container-highest px-3 py-2"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="font-display text-eyebrow uppercase text-on-surface-variant">
              Owner password
            </span>
            <input
              type="password"
              className="mt-2 w-full border border-surface-container-highest px-3 py-2"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              required
              minLength={12}
              autoComplete="new-password"
            />
            {ownerPassword && passwordIssues.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-body-md text-on-surface-variant">
                {passwordIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
          </label>

          {error && (
            <p className="text-body-md text-red-700" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || passwordIssues.length > 0}
            className="bg-primary py-3 font-display text-headline-sm text-on-primary disabled:opacity-60"
          >
            {loading ? "Provisioning…" : "Create cafe portal"}
          </button>

          <p className="text-center text-body-md text-on-surface-variant">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
