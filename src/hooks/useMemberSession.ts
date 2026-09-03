"use client";

import { useCallback, useEffect, useState } from "react";

export type MemberProfile = {
  id: string;
  points: number;
  availablePoints?: number;
  reservedPoints?: number;
  tierPoints: number;
  usualOrder: { name: string; quantity: number }[] | null;
  favoriteItem: string | null;
  displayName?: string | null;
  phone?: string | null;
  marketingOptOut?: boolean;
};

export function useMemberSession() {
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [redeemAuthorized, setRedeemAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/customer/session", { credentials: "include" });
      const data = (await res.json()) as {
        member: MemberProfile | null;
        redeemAuthorized?: boolean;
      };
      setMember(data.member);
      setRedeemAuthorized(Boolean(data.redeemAuthorized));
    } catch {
      setMember(null);
      setRedeemAuthorized(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Bind browser cookie from a paid order that already has a member attached. */
  const bindSessionFromOrder = useCallback(
    async (orderId: string, merchantSlug: string) => {
      await fetch("/api/customer/session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, merchantSlug }),
      });
      await refresh();
    },
    [refresh],
  );

  const signOut = useCallback(async (merchantSlug?: string) => {
    await fetch("/api/customer/session", {
      method: "DELETE",
      credentials: "include",
    });
    if (merchantSlug) {
      try {
        localStorage.removeItem(`irewards-member:${merchantSlug}`);
      } catch {
        /* ignore */
      }
    }
    setMember(null);
    setRedeemAuthorized(false);
  }, []);

  return { member, redeemAuthorized, loading, refresh, bindSessionFromOrder, signOut };
}
