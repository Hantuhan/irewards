"use client";

import { useCallback, useEffect, useState } from "react";

export type MemberProfile = {
  id: string;
  points: number;
  tierPoints: number;
  usualOrder: { name: string; quantity: number }[] | null;
  favoriteItem: string | null;
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

  const bindSession = useCallback(
    async (customerId: string, merchantSlug: string) => {
      await fetch("/api/customer/session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, merchantSlug }),
      });
      await refresh();
    },
    [refresh],
  );

  return { member, loading, refresh, bindSession };
}
