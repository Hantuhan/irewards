"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { merchantApi } from "@/lib/merchant/fetch";

type AccountSummary = {
  connected: boolean;
  wabaId: string | null;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  status: "connected" | "disconnected" | "invalid" | null;
  lastError: string | null;
  connectedAt: string | null;
};

type NumberHealth = {
  qualityRating: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
  messagingLimit: string | null;
  displayPhoneNumber: string | null;
};

type StatusResponse = {
  account: AccountSummary;
  numberHealth: NumberHealth;
  appId: string | null;
  configId: string | null;
  devMode: boolean;
};

/** What Meta's signup dialog posts back once the merchant picks a number. */
type EmbeddedSignupPayload = {
  type?: string;
  /** "FINISH" variants mean a real selection; "CANCEL" means they backed out. */
  event?: string;
  data?: { waba_id?: string; phone_number_id?: string; business_id?: string };
};

declare global {
  interface Window {
    FB?: {
      init: (options: Record<string, unknown>) => void;
      login: (
        callback: (response: { authResponse?: { code?: string } }) => void,
        options: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const GRAPH_VERSION = "v21.0";

/**
 * Whether a postMessage really came from Meta.
 *
 * Compares the parsed hostname, because a suffix test on the raw origin also
 * accepts `https://notfacebook.com` — and this message is what tells us which
 * WABA and number to bind the merchant's token to.
 */
function isMetaOrigin(origin: string): boolean {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "https:") return false;
    return hostname === "facebook.com" || hostname.endsWith(".facebook.com");
  } catch {
    return false;
  }
}

/**
 * Connecting the merchant's own WhatsApp Business Account.
 *
 * Their account, their Meta bill, and their quality rating — so one store
 * sending badly can no longer get a shared number restricted for everybody.
 */
export function WhatsAppSettingsPanel({ merchantSlug }: { merchantSlug: string }) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** The dialog reports the chosen WABA by postMessage, before the code arrives. */
  const signupSelection = useRef<{
    wabaId?: string;
    phoneNumberId?: string;
    businessId?: string;
  }>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await merchantApi<StatusResponse>(`/api/merchant/${merchantSlug}/whatsapp`);
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load WhatsApp status");
    } finally {
      setLoading(false);
    }
  }, [merchantSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  // Meta posts the selected WABA and number into the opener window.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!isMetaOrigin(event.origin)) return;
      try {
        const payload =
          typeof event.data === "string"
            ? (JSON.parse(event.data) as EmbeddedSignupPayload)
            : (event.data as EmbeddedSignupPayload);
        if (payload?.type !== "WA_EMBEDDED_SIGNUP") return;
        // A cancel carries no selection; taking its fields would leave a
        // half-filled ref that the next attempt then reads as a real choice.
        if (payload.event && !payload.event.startsWith("FINISH")) return;

        if (payload.data?.waba_id) signupSelection.current.wabaId = payload.data.waba_id;
        if (payload.data?.phone_number_id) {
          signupSelection.current.phoneNumberId = payload.data.phone_number_id;
        }
        if (payload.data?.business_id) {
          signupSelection.current.businessId = payload.data.business_id;
        }
      } catch {
        /* Not a message we care about. */
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const loadFacebookSdk = useCallback((appId: string) => {
    return new Promise<void>((resolve, reject) => {
      if (window.FB) return resolve();
      const existing = document.getElementById("facebook-jssdk");
      if (existing) return resolve();

      window.fbAsyncInit = () => {
        window.FB?.init({ appId, cookie: true, xfbml: false, version: GRAPH_VERSION });
        resolve();
      };
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = `https://connect.facebook.net/en_US/sdk.js`;
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.onerror = () => reject(new Error("Could not load the Facebook sign-up dialog."));
      document.body.appendChild(script);
    });
  }, []);

  async function connect() {
    if (!status?.appId || !status.configId) {
      setError(
        "WhatsApp sign-up is not configured on this server yet. Ask your installer to set META_APP_ID and META_EMBEDDED_SIGNUP_CONFIG_ID.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    signupSelection.current = {};

    try {
      await loadFacebookSdk(status.appId);

      const code = await new Promise<string | null>((resolve) => {
        window.FB?.login(
          (response) => resolve(response.authResponse?.code ?? null),
          {
            config_id: status.configId,
            response_type: "code",
            override_default_response_type: true,
            // Embedded Signup v4: `extras` is deliberately empty. Permissions
            // and product setup moved into the Facebook Login for Business
            // configuration that META_EMBEDDED_SIGNUP_CONFIG_ID points at.
            // The old `sessionInfoVersion: "3"` shape is v2, which Meta
            // deprecates on 15 October 2026.
            extras: {},
          },
        );
      });

      if (!code) {
        setError("Sign-up was cancelled before it finished. Nothing has changed.");
        return;
      }

      const { wabaId, phoneNumberId, businessId } = signupSelection.current;
      if (!wabaId || !phoneNumberId) {
        setError(
          "Sign-up finished but Meta did not say which number was chosen. Try connecting again.",
        );
        return;
      }

      // Meta gives the code a 30-second window, so this exchange goes straight
      // out rather than waiting on anything else.
      await merchantApi(`/api/merchant/${merchantSlug}/whatsapp`, {
        method: "POST",
        body: JSON.stringify({ code, wabaId, phoneNumberId, businessId }),
      });
      setNotice("WhatsApp connected. Your campaigns will now send from your own number.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect WhatsApp");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await merchantApi(`/api/merchant/${merchantSlug}/whatsapp`, { method: "DELETE" });
      setNotice("WhatsApp disconnected. Automated messages will stop until you reconnect.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect WhatsApp");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="p-6 text-body-md text-on-surface-variant">Loading WhatsApp status…</p>;
  }

  const account = status?.account;
  const connected = account?.connected === true;
  const health = status?.numberHealth;

  return (
    <div className="flex flex-col gap-5 p-6">
      <header>
        <h2 className="font-display text-headline-sm text-on-surface">WhatsApp Business</h2>
        <p className="mt-1 max-w-prose text-body-md text-on-surface-variant">
          Connect your own WhatsApp Business account so member messages come from your number.
          Meta bills you directly for messages, and your sending reputation stays yours.
        </p>
      </header>

      {status?.devMode && (
        <p className="border border-dashed border-surface-container-highest px-3 py-2 text-[12px] text-on-surface-variant">
          Developer mode: messages are written to the server log instead of being sent.
        </p>
      )}

      <div className="border border-surface-container-highest bg-surface-container-lowest p-4">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              connected ? "bg-emerald-50 text-emerald-700" : "bg-surface-container text-on-surface-variant"
            }`}
          >
            <Icon name={connected ? "check_circle" : "link_off"} className="text-[20px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-on-surface">
              {connected ? "Connected" : "Not connected"}
            </p>
            {connected ? (
              <p className="mt-0.5 text-[13px] text-on-surface-variant">
                {account?.verifiedName ? `${account.verifiedName} · ` : ""}
                {account?.displayPhoneNumber ?? "Number pending"}
              </p>
            ) : (
              <p className="mt-0.5 text-[13px] text-on-surface-variant">
                Your campaigns cannot send until an account is connected.
              </p>
            )}

            {account?.status === "invalid" && account.lastError && (
              <p className="mt-2 border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                {account.lastError}
              </p>
            )}

            {connected && health && health.qualityRating !== "UNKNOWN" && (
              <p className="mt-2 text-[12px] text-on-surface-variant">
                Meta quality rating:{" "}
                <span
                  className={
                    health.qualityRating === "RED"
                      ? "font-medium text-red-700"
                      : health.qualityRating === "YELLOW"
                        ? "font-medium text-amber-700"
                        : "font-medium text-emerald-700"
                  }
                >
                  {health.qualityRating === "GREEN"
                    ? "Good"
                    : health.qualityRating === "YELLOW"
                      ? "At risk"
                      : "Low"}
                </span>
                {health.messagingLimit
                  ? ` · daily limit ${health.messagingLimit.replace("TIER_", "")}`
                  : ""}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void connect()}
            disabled={busy}
            className="bg-primary px-4 py-2 text-body-md text-on-primary disabled:opacity-50"
          >
            {busy ? "Working…" : connected ? "Reconnect" : "Connect WhatsApp"}
          </button>
          {connected && (
            <button
              type="button"
              onClick={() => void disconnect()}
              disabled={busy}
              className="border border-surface-container-highest px-4 py-2 text-body-md disabled:opacity-50"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {notice && <p className="text-body-md text-emerald-700">{notice}</p>}
      {error && <p className="text-body-md text-red-700">{error}</p>}

      <div className="text-[12px] leading-relaxed text-on-surface-variant">
        <p className="font-medium text-on-surface">What you will need</p>
        <ul className="mt-1 list-disc pl-5">
          <li>A Facebook account that manages your business.</li>
          <li>Your business registration details, for Meta&apos;s verification.</li>
          <li>
            <strong>A phone number that is not already on WhatsApp.</strong> If your shop number is
            in use on the normal WhatsApp app, you will need a different one.
          </li>
        </ul>
      </div>
    </div>
  );
}
