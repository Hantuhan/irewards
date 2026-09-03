"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PlatformLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/platform/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "Login failed");
      router.push("/platform");
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
          <span className="font-display text-headline-sm font-bold text-primary">iRewards</span>
          <p className="mt-2 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Platform admin
          </p>
        </header>
        <form onSubmit={(e) => void handleSubmit(e)} className="zenith-surface flex flex-col gap-4 p-8">
          <label className="block">
            <span className="font-display text-eyebrow uppercase text-on-surface-variant">
              Complex admin password
            </span>
            <input
              type="password"
              className="mt-2 w-full border border-surface-container-highest px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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
            className="bg-primary py-3 font-display text-headline-sm text-on-primary disabled:opacity-60"
          >
            {loading ? "Unlocking…" : "Unlock console"}
          </button>
          <p className="text-center text-body-md text-on-surface-variant">
            <Link href="/login" className="underline">
              Merchant login
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
