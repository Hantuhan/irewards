"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

type Mode = "guest" | "member";

type SimMember = {
  id: string;
  displayName: string | null;
  points: number;
  phone: string | null;
};

type DemoDinerSimProps = {
  shopHref: string;
  rewardsHref: string;
  cartHref: string;
  profileHref: string;
};

export function DemoDinerSim({
  shopHref,
  rewardsHref,
  cartHref,
  profileHref,
}: DemoDinerSimProps) {
  const [mode, setMode] = useState<Mode>("guest");
  const [busy, setBusy] = useState(false);
  const [member, setMember] = useState<SimMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/customer/session", { credentials: "include" });
      const data = (await res.json()) as { member: SimMember | null };
      if (data.member) {
        setMember(data.member);
        setMode("member");
      } else {
        setMember(null);
        setMode("guest");
      }
    } catch {
      setMember(null);
      setMode("guest");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  async function applyMode(next: Mode) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/diner-session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next, merchantSlug: "demo-cafe" }),
      });
      const data = (await res.json()) as {
        error?: string;
        mode?: Mode;
        member?: SimMember | null;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to switch");
      setMode(data.mode ?? next);
      setMember(data.member ?? null);
      if (next === "guest") {
        try {
          localStorage.removeItem("irewards-member:demo-cafe");
        } catch {
          /* ignore */
        }
      } else if (data.member?.id) {
        try {
          localStorage.setItem("irewards-member:demo-cafe", data.member.id);
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch");
    } finally {
      setBusy(false);
    }
  }

  const pages = [
    { href: shopHref, label: "Shop", icon: "storefront", hint: mode === "guest" ? "Banner + guest menu" : "Welcome + points" },
    { href: rewardsHref, label: "iRewards", icon: "confirmation_number", hint: "Rewards tab" },
    { href: cartHref, label: "Cart", icon: "shopping_bag", hint: "Checkout / redeem" },
    { href: profileHref, label: "Profile", icon: "person", hint: "Account" },
  ] as const;

  return (
    <div className="mt-6 border-t border-surface-container-highest pt-6">
      <h3 className="font-display text-[15px] font-semibold text-primary">
        Simulate diner login
      </h3>
      <p className="mt-1 text-[13px] text-on-surface-variant">
        Switch the browser member session before opening storefront pages.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={busy || !ready}
          onClick={() => void applyMode("guest")}
          className={`flex flex-col items-start gap-1 border px-4 py-3 text-left transition-colors disabled:opacity-50 ${
            mode === "guest"
              ? "border-primary bg-primary text-on-primary"
              : "border-surface-container-highest hover:border-primary"
          }`}
        >
          <span className="flex items-center gap-2 font-display text-headline-sm">
            <Icon name="person_off" />
            Guest
          </span>
          <span
            className={`text-[12px] ${mode === "guest" ? "text-white/75" : "text-on-surface-variant"}`}
          >
            No session — storefront banner chrome
          </span>
        </button>
        <button
          type="button"
          disabled={busy || !ready}
          onClick={() => void applyMode("member")}
          className={`flex flex-col items-start gap-1 border px-4 py-3 text-left transition-colors disabled:opacity-50 ${
            mode === "member"
              ? "border-primary bg-primary text-on-primary"
              : "border-surface-container-highest hover:border-primary"
          }`}
        >
          <span className="flex items-center gap-2 font-display text-headline-sm">
            <Icon name="verified_user" />
            Member (Alex)
          </span>
          <span
            className={`text-[12px] ${mode === "member" ? "text-white/75" : "text-on-surface-variant"}`}
          >
            Soft-login demo member — loyalty chrome
          </span>
        </button>
      </div>

      <p className="mt-3 font-mono text-[11px] text-on-surface-variant">
        {busy
          ? "Updating session…"
          : mode === "member" && member
            ? `Active: ${member.displayName ?? "Member"} · ${member.points} pts · ${member.phone ?? ""}`
            : "Active: Guest (signed out)"}
      </p>
      {error && <p className="mt-1 text-[12px] text-red-700">{error}</p>}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {pages.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="flex items-center gap-3 border border-surface-container-highest px-4 py-3 hover:border-primary"
          >
            <Icon name={page.icon} />
            <span className="min-w-0 flex-1">
              <span className="block font-display text-headline-sm">{page.label}</span>
              <span className="block text-[11px] text-on-surface-variant">{page.hint}</span>
            </span>
            <Icon name="arrow_forward" className="text-[18px] text-on-surface-variant" />
          </Link>
        ))}
      </div>
    </div>
  );
}
