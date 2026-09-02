"use client";

import { useCallback, useEffect, useState } from "react";

export type MemberProfile = {
  id: string;
  points: number;
  tierPoints: number;
  usualOrder: { name: string; quantity: number }[] | null;
  favoriteItem: string | null;
  displayName?: string | null;
  marketingOptOut?: boolean;
};

export function useMemberSession() {
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/customer/session", { credentials: "include" });
      const data = (await res.json()) as { member: MemberProfile | null };
      setMember(data.member);
    } catch {
      setMember(null);
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

  return { member, loading, refresh, bindSessionFromOrder };
}
