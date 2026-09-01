"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { merchantApi } from "@/lib/merchant/fetch";

type AutomationAdminShellProps = { merchantSlug: string };

type Rule = { key: string; title: string; description: string; enabled: boolean };

export function AutomationAdminShell({ merchantSlug }: AutomationAdminShellProps) {
  const [rules, setRules] = useState<Rule[]>([]);

  const load = useCallback(async () => {
    const data = await merchantApi<{ rules: Rule[] }>(
      `/api/merchant/${merchantSlug}/automation`,
    );
    setRules(data.rules);
  }, [merchantSlug]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleRule(rule: Rule) {
    await merchantApi(`/api/merchant/${merchantSlug}/automation`, {
      method: "PATCH",
      body: JSON.stringify({ ruleKey: rule.key, enabled: !rule.enabled }),
    });
    await load();
  }

  return (
    <AdminShell merchantSlug={merchantSlug} active="automation" title="Marketing automation" eyebrow="Journey rules">
      <div className="flex flex-col gap-4">
        {rules.map((rule) => (
          <div key={rule.key} className="flex items-start justify-between gap-4 border border-surface-container-highest bg-surface-container-lowest p-6">
            <div>
              <h2 className="font-display text-headline-sm text-primary">{rule.title}</h2>
              <p className="mt-2 max-w-xl text-body-md text-on-surface-variant">{rule.description}</p>
            </div>
            <button
              type="button"
              onClick={() => toggleRule(rule)}
              className={`shrink-0 border px-4 py-2 font-mono text-label-mono uppercase ${
                rule.enabled ? "border-primary bg-primary text-on-primary" : "border-surface-container-highest"
              }`}
            >
              {rule.enabled ? "On" : "Off"}
            </button>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
