"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MerchantAuthShell } from "@/components/merchant/MerchantAuthShell";
import { Icon } from "@/components/ui/Icon";
import {
  PASSWORD_REQUIREMENTS,
  passwordRequirementStatus,
  validatePasswordStrength,
} from "@/lib/auth/password-policy";
import { apexDomain } from "@/lib/tenancy/host";
import { normalizeSubdomainInput, slugifyMerchantName } from "@/lib/tenancy/slug";
import {
  manusInsetPanelClass,
  manusInputClass,
  manusLabelClass,
  manusPanelClass,
  manusPrimaryButtonClass,
  manusSectionTitleClass,
} from "@/lib/ui/manus";

function signupFieldErrors(input: {
  cafeName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}): string[] {
  const errors: string[] = [];
  if (input.cafeName.trim().length < 2) errors.push("Cafe name must be at least 2 characters");
  if (input.ownerName.trim().length < 1) errors.push("Enter your name");
  if (!input.ownerEmail.trim()) errors.push("Enter your work email");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.ownerEmail.trim())) {
    errors.push("Enter a valid email address");
  }
  if (!input.ownerPassword) errors.push("Choose an owner password");
  else errors.push(...validatePasswordStrength(input.ownerPassword));
  return errors;
}

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
  const [touched, setTouched] = useState(false);

  const apex = apexDomain();
  const suggested = useMemo(() => slugifyMerchantName(cafeName || "cafe"), [cafeName]);
  const subdomain = normalizeSubdomainInput(subdomainOverride || suggested, cafeName || "cafe");
  const passwordStatus = passwordRequirementStatus(ownerPassword);
  const validationErrors = signupFieldErrors({
    cafeName,
    ownerName,
    ownerEmail,
    ownerPassword,
  });
  const readyToSubmit = validationErrors.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    const errors = signupFieldErrors({
      cafeName,
      ownerName,
      ownerEmail,
      ownerPassword,
    });
    if (errors.length > 0) {
      setError(errors.join(" · "));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/merchant/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          cafeName: cafeName.trim(),
          currency,
          ownerName: ownerName.trim(),
          ownerEmail: ownerEmail.trim(),
          ownerPassword,
          subdomain,
        }),
      });
      const json = (await response.json()) as {
        error?: string;
        merchant?: { dashboardPath: string; portalUrl: string; subdomain: string };
      };
      if (!response.ok) {
        const message = json.error ?? "Signup failed";
        if (message.toLowerCase().includes("already registered")) {
          throw new Error(`${message}. Try signing in instead.`);
        }
        throw new Error(message);
      }
      if (!json.merchant?.dashboardPath) throw new Error("Signup succeeded but cafe was missing");
      router.push(`${json.merchant.dashboardPath}/rewards?setup=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MerchantAuthShell
      wide
      eyebrow="iRewards · B2B SaaS"
      title="Open your cafe portal"
      description="Table storefront, loyalty, and WhatsApp retention — each cafe gets its own subdomain and merchant dashboard."
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className={`flex flex-col gap-6 p-8 ${manusPanelClass}`}
        noValidate
      >
        <section className="flex flex-col gap-4">
          <h2 className={manusSectionTitleClass}>Your cafe</h2>

          <label className="block">
            <span className={manusLabelClass}>Cafe name</span>
            <input
              className={manusInputClass}
              value={cafeName}
              onChange={(e) => setCafeName(e.target.value)}
              placeholder="e.g. Kedai Kopi Senja"
              autoComplete="organization"
            />
          </label>

          <label className="block">
            <span className={manusLabelClass}>Subdomain</span>
            <div className="mt-2 flex items-center gap-2">
              <input
                className={`${manusInputClass} mt-0 font-mono text-label-mono`}
                value={subdomainOverride || suggested}
                onChange={(e) => setSubdomainOverride(slugifyMerchantName(e.target.value))}
                aria-describedby="subdomain-hint"
              />
              <span className="shrink-0 font-mono text-label-mono text-on-surface-variant">
                .{apex}
              </span>
            </div>
            <p id="subdomain-hint" className="mt-2 font-mono text-[11px] text-on-surface-variant">
              Storefront → https://{subdomain}.{apex}
            </p>
          </label>

          <label className="block">
            <span className={manusLabelClass}>Currency</span>
            <select
              className={manusInputClass}
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "MYR" | "SGD")}
            >
              <option value="MYR">Malaysia (MYR)</option>
              <option value="SGD">Singapore (SGD)</option>
            </select>
          </label>
        </section>

        <div className="h-px bg-surface-container-highest" aria-hidden />

        <section className="flex flex-col gap-4">
          <h2 className={manusSectionTitleClass}>Owner account</h2>

          <label className="block">
            <span className={manusLabelClass}>Your name</span>
            <input
              className={manusInputClass}
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              autoComplete="name"
            />
          </label>

          <label className="block">
            <span className={manusLabelClass}>Work email</span>
            <input
              type="email"
              className={manusInputClass}
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className={manusLabelClass}>Owner password</span>
            <input
              type="password"
              className={manusInputClass}
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              autoComplete="new-password"
            />
            <div className={`mt-3 p-4 ${manusInsetPanelClass}`}>
              <p className={manusLabelClass}>Password requirements</p>
              <ul className="mt-2 space-y-1.5" aria-live="polite">
                {PASSWORD_REQUIREMENTS.map((rule) => {
                  const met = passwordStatus[rule.id];
                  return (
                    <li
                      key={rule.id}
                      className={`flex items-start gap-2 text-[12px] leading-snug ${
                        met ? "text-[#1a3d2e]" : "text-on-surface-variant"
                      }`}
                    >
                      <Icon
                        name={met ? "check_circle" : "radio_button_unchecked"}
                        className={`mt-px text-[14px] ${met ? "text-[#1a3d2e]" : ""}`}
                      />
                      <span>{rule.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </label>
        </section>

        {error && (
          <p
            className="border border-red-200 bg-red-50 px-4 py-3 text-body-md text-red-800"
            role="alert"
          >
            {error}
          </p>
        )}

        {touched && !readyToSubmit && !error && (
          <p className="border border-[#8a6d1f]/30 bg-[#8a6d1f]/10 px-4 py-3 text-body-md text-[#5c4a14]">
            Complete all fields and the password checklist, then click Create cafe portal.
          </p>
        )}

        <button type="submit" disabled={loading} className={manusPrimaryButtonClass}>
          <Icon name="storefront" />
          {loading ? "Provisioning…" : "Create cafe portal"}
        </button>

        <p className="text-center text-body-md text-on-surface-variant">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#1a3d2e] underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </form>
    </MerchantAuthShell>
  );
}
