"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { MerchantAuthShell } from "@/components/merchant/MerchantAuthShell";
import { Icon } from "@/components/ui/Icon";
import {
  manusInputClass,
  manusLabelClass,
  manusPanelClass,
  manusPrimaryButtonClass,
} from "@/lib/ui/manus";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/merchant/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const json = (await response.json()) as {
        error?: string;
        merchant?: { slug: string };
      };
      if (!response.ok) throw new Error(json.error ?? "Login failed");
      const dest =
        next && next.startsWith("/dashboard/")
          ? next
          : `/dashboard/${json.merchant?.slug ?? ""}`;
      if (!json.merchant?.slug && !next?.startsWith("/dashboard/")) {
        throw new Error("Login succeeded but merchant was missing");
      }
      router.push(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MerchantAuthShell
      eyebrow="iRewards · Merchant"
      title="Sign in"
      description="Access your cafe dashboard — menus, orders, loyalty, and campaigns."
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className={`flex flex-col gap-4 p-8 ${manusPanelClass}`}
      >
        <label className="block">
          <span className={manusLabelClass}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            className={manusInputClass}
            required
          />
        </label>
        <label className="block">
          <span className={manusLabelClass}>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className={manusInputClass}
            required
          />
        </label>

        {error && (
          <p
            className="border border-red-200 bg-red-50 px-4 py-3 text-body-md text-red-800"
            role="alert"
          >
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className={manusPrimaryButtonClass}>
          <Icon name="login" />
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-body-md text-on-surface-variant">
          <Link href="/signup" className="font-medium text-[#1a3d2e] underline underline-offset-2">
            Create a cafe portal
          </Link>
        </p>
      </form>
    </MerchantAuthShell>
  );
}
