"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard/demo-cafe";

  const [email, setEmail] = useState("owner@demo-cafe.com");
  const [password, setPassword] = useState("demo123");
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
      router.push(
        next.startsWith("/dashboard/")
          ? next
          : `/dashboard/${json.merchant?.slug ?? "demo-cafe"}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="w-full max-w-md">
        <header className="zenith-surface mb-6 px-8 py-6 text-center">
          <span className="font-display text-headline-sm font-bold text-primary">
            iRewards
          </span>
          <p className="mt-2 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Merchant sign in
          </p>
        </header>

        <form onSubmit={handleSubmit} className="zenith-surface flex flex-col gap-4 p-8">
          <label className="block">
            <span className="font-display text-eyebrow uppercase text-on-surface-variant">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full border border-surface-container-highest px-3 py-2"
              required
            />
          </label>
          <label className="block">
            <span className="font-display text-eyebrow uppercase text-on-surface-variant">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full border border-surface-container-highest px-3 py-2"
              required
            />
          </label>

          {error && (
            <p className="text-body-md text-red-700" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-primary py-3 font-display text-headline-sm text-on-primary disabled:opacity-60"
          >
            <Icon name="login" />
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-center text-body-md text-on-surface-variant">
            Demo: owner@demo-cafe.com / demo123
          </p>
        </form>
      </div>
    </main>
  );
}
