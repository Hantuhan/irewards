import { NextResponse } from "next/server";
import { updateCustomer } from "@/lib/db/repository";
import { findTemplateByMetaId } from "@/lib/db/whatsapp-template-repository";
import { createInsforgeAdmin } from "@/lib/insforge/client";
import { parseJoinMessage } from "@/lib/loyalty/join-token";
import { fromMetaPhone, shouldSkipMetaVerify, verifyMetaSignature } from "@/lib/meta/client";
import { JoinError, processWhatsAppJoin } from "@/lib/services/loyalty-join";
import { sendWhatsAppMessage } from "@/lib/whatsapp/outbound";
import { applyPhoneQualityEvent } from "@/lib/whatsapp/number-health";
import { applyTemplateStatusEvent, recordTemplateQuality } from "@/lib/whatsapp/templates";

/**
 * Meta WhatsApp webhook.
 *
 * Subscribe the app to the `messages`, `message_template_status_update`,
 * `message_template_quality_update` and `phone_number_quality_update`
 * fields on the WABA. Meta retries on non-2xx, so handler errors are logged
 * and swallowed once the signature has been accepted.
 */

/** Verification handshake when the callback URL is saved in the Meta app. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

type InboundMessage = {
  from: string;
  id: string;
  type: string;
  text?: { body?: string };
  button?: { text?: string; payload?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
};

type ChangeValue = {
  messaging_product?: string;
  contacts?: { wa_id?: string; profile?: { name?: string } }[];
  messages?: InboundMessage[];
  // message_template_status_update / message_template_quality_update
  event?: string;
  message_template_id?: number | string;
  message_template_name?: string;
  message_template_language?: string;
  reason?: string | null;
  previous_quality_score?: string;
  new_quality_score?: string;
  // phone_number_quality_update
  display_phone_number?: string;
  current_limit?: string;
};

type WebhookBody = {
  object?: string;
  entry?: { changes?: { field?: string; value?: ChangeValue }[] }[];
};

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!shouldSkipMetaVerify()) {
    const valid = await verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"));
    if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      try {
        if (change.field === "message_template_status_update") {
          await handleTemplateStatus(value);
        } else if (change.field === "message_template_quality_update") {
          await handleTemplateQuality(value);
        } else if (change.field === "phone_number_quality_update") {
          await applyPhoneQualityEvent(value);
        } else if (change.field === "messages" || value.messages) {
          for (const message of value.messages ?? []) await handleInbound(message, value);
        }
      } catch (error) {
        console.error("Meta webhook handler error:", change.field, error);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

async function handleTemplateStatus(value: ChangeValue) {
  if (!value.event) return;
  const row = await findTemplateByMetaId(
    value.message_template_id != null ? String(value.message_template_id) : null,
    value.message_template_name
      ? { name: value.message_template_name, language: value.message_template_language ?? "en" }
      : undefined,
  );
  if (!row) {
    console.warn("Template status for unknown template:", value.message_template_name, value.event);
    return;
  }
  await applyTemplateStatusEvent(row, { event: value.event, reason: value.reason ?? null });
}

async function handleTemplateQuality(value: ChangeValue) {
  if (!value.new_quality_score) return;
  const row = await findTemplateByMetaId(
    value.message_template_id != null ? String(value.message_template_id) : null,
    value.message_template_name
      ? { name: value.message_template_name, language: value.message_template_language ?? "en" }
      : undefined,
  );
  if (!row) return;
  await recordTemplateQuality(row, value.new_quality_score);
}

function messageText(message: InboundMessage): string {
  return (
    message.text?.body ??
    message.button?.text ??
    message.interactive?.button_reply?.title ??
    message.interactive?.list_reply?.title ??
    ""
  ).trim();
}

async function handleInbound(message: InboundMessage, value: ChangeValue) {
  const phone = fromMetaPhone(message.from);
  if (!phone) return;

  const text = messageText(message);
  const externalUserId = value.contacts?.find((c) => c.wa_id === message.from)?.wa_id ?? message.from;

  if (text.toUpperCase() === "STOP") {
    await handleMarketingOptOut(phone);
    await sendWhatsAppMessage(phone, "You have been unsubscribed from marketing messages.");
    return;
  }

  // Review nudge replies: 5 = happy (Google link), 1–4 = private feedback.
  const rating = text.match(/^[1-5]$/)?.[0];
  if (rating) {
    await handleReviewReply(phone, Number(rating));
    return;
  }

  const joinToken = parseJoinMessage(text);
  if (!joinToken) {
    if (text) {
      await sendWhatsAppMessage(
        phone,
        "Send JOIN-{token} from your receipt to join iRewards and claim points. Reply STOP to opt out of marketing.",
      );
    }
    return;
  }

  try {
    const result = await processWhatsAppJoin({ token: joinToken, phone, externalUserId });
    await sendWhatsAppMessage(
      phone,
      `You're in iRewards! Level: ${result.tierName}. +${result.pointsAwarded} point${
        result.pointsAwarded === 1 ? "" : "s"
      } added. Balance: ${result.customer.points_balance}. See you next time!`,
    );
  } catch (error) {
    if (error instanceof JoinError) {
      await sendWhatsAppMessage(phone, error.message);
      return;
    }
    console.error("WhatsApp join error:", error);
    await sendWhatsAppMessage(phone, "Something went wrong. Please ask staff for help.");
  }
}

async function handleReviewReply(phone: string, rating: number) {
  const admin = createInsforgeAdmin();
  const { data } = await admin.database
    .from("customers")
    .select("id, merchant_id, display_name")
    .eq("phone", phone)
    .eq("is_member", true)
    .limit(5);

  const customers = (data ?? []) as { id: string; merchant_id: string; display_name: string | null }[];
  if (customers.length === 0) {
    await sendWhatsAppMessage(phone, "Thanks for the reply. Join iRewards after your next visit to unlock member perks.");
    return;
  }

  for (const customer of customers) {
    if (rating === 5) {
      const { data: merchant } = await admin.database
        .from("merchants")
        .select("name, google_url")
        .eq("id", customer.merchant_id)
        .maybeSingle();
      const row = merchant as { name?: string; google_url?: string | null } | null;
      const link = row?.google_url?.trim();
      await sendWhatsAppMessage(
        phone,
        link
          ? `Thanks so much! If you have 20 seconds, a Google review helps us a lot:\n${link}`
          : `Thanks so much for dining with ${row?.name ?? "us"}! We're glad you enjoyed it.`,
      );
    } else {
      await sendWhatsAppMessage(
        phone,
        "Thanks for telling us — a manager will follow up privately. We appreciate your honesty.",
      );
      console.info("[review:complaint]", {
        customerId: customer.id,
        merchantId: customer.merchant_id,
        rating,
        name: customer.display_name,
      });
    }
  }
}

async function handleMarketingOptOut(phone: string) {
  const admin = createInsforgeAdmin();
  const { data } = await admin.database.from("customers").select("id").eq("phone", phone).limit(20);

  for (const row of data ?? []) {
    await updateCustomer((row as { id: string }).id, { marketing_opt_out: true });
  }
}
