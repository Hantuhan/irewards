import { NextResponse } from "next/server";
import { updateCustomer } from "@/lib/db/repository";
import { findTemplateByMetaId } from "@/lib/db/whatsapp-template-repository";
import { adminDb } from "@/lib/db/admin";
import { parseJoinMessage } from "@/lib/loyalty/join-token";
import { fromMetaPhone, shouldSkipMetaVerify, verifyMetaSignature } from "@/lib/meta/client";
import { getMerchantIdByPhoneNumberId } from "@/lib/db/whatsapp-account-repository";
import { JoinError, processWhatsAppJoin } from "@/lib/services/loyalty-join";
import { isOptOutMessage } from "@/lib/whatsapp/opt-out";
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
  /** Identifies which of our merchants' numbers this event arrived on. */
  metadata?: { display_phone_number?: string; phone_number_id?: string };
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
  /** `entry[].id` is the WABA id the event belongs to. */
  entry?: { id?: string; changes?: { field?: string; value?: ChangeValue }[] }[];
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
        // Which merchant this concerns is decided by the number the event
        // arrived on, never by the sender's phone — one person can be a member
        // at several cafes, so their number identifies nobody.
        const merchantId = await resolveMerchantId(value);

        if (change.field === "message_template_status_update") {
          await handleTemplateStatus(value);
        } else if (change.field === "message_template_quality_update") {
          await handleTemplateQuality(value);
        } else if (change.field === "phone_number_quality_update") {
          await applyPhoneQualityEvent(value, {
            merchantId,
            phoneNumberId: value.metadata?.phone_number_id ?? null,
          });
        } else if (change.field === "messages" || value.messages) {
          for (const message of value.messages ?? []) {
            await handleInbound(message, value, merchantId);
          }
        }
      } catch (error) {
        console.error("Meta webhook handler error:", change.field, error);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

/**
 * The merchant whose connected number this event arrived on. Null when the
 * event came in on the platform number (a pilot merchant sending from ours),
 * in which case the handlers fall back to matching on the member's phone.
 */
async function resolveMerchantId(value: ChangeValue): Promise<string | null> {
  const phoneNumberId = value.metadata?.phone_number_id;
  if (!phoneNumberId) return null;
  return getMerchantIdByPhoneNumberId(phoneNumberId).catch(() => null);
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

async function handleInbound(
  message: InboundMessage,
  value: ChangeValue,
  merchantId: string | null,
) {
  const phone = fromMetaPhone(message.from);
  if (!phone) return;

  const text = messageText(message);
  const externalUserId = value.contacts?.find((c) => c.wa_id === message.from)?.wa_id ?? message.from;

  // Whoever we reply as has to be the number they wrote to. Without a
  // connected merchant we have nothing to send from, so the event is recorded
  // and left unanswered rather than replied to from the wrong store.
  const replyFrom = merchantId;
  const reply = async (body: string) => {
    if (!replyFrom) return;
    await sendWhatsAppMessage(replyFrom, phone, body);
  };

  if (isOptOutMessage(text)) {
    await handleMarketingOptOut(phone, merchantId);
    await reply("You have been unsubscribed from marketing messages.");
    return;
  }

  // Review nudge replies: 5 = happy (Google link), 1–4 = private feedback.
  const rating = text.match(/^[1-5]$/)?.[0];
  if (rating) {
    await handleReviewReply(phone, Number(rating), merchantId);
    return;
  }

  const joinToken = parseJoinMessage(text);
  if (!joinToken) {
    if (text) {
      await reply(
        "Send JOIN-{token} from your receipt to join iRewards and claim points. Reply STOP to opt out of marketing.",
      );
    }
    return;
  }

  try {
    const result = await processWhatsAppJoin({ token: joinToken, phone, externalUserId });
    // The join token names the store, so reply from that one even if the
    // message arrived on the platform number.
    const joinMerchantId = result.customer.merchant_id ?? replyFrom;
    const congratulations = `You're in iRewards! Level: ${result.tierName}. +${result.pointsAwarded} point${
      result.pointsAwarded === 1 ? "" : "s"
    } added. Balance: ${result.customer.points_balance}. See you next time!`;
    if (joinMerchantId) await sendWhatsAppMessage(joinMerchantId, phone, congratulations);
  } catch (error) {
    if (error instanceof JoinError) {
      await reply(error.message);
      return;
    }
    console.error("WhatsApp join error:", error);
    await reply("Something went wrong. Please ask staff for help.");
  }
}

/**
 * A reply to a review nudge. Scoped to the store whose number was messaged —
 * without that, one reply would file feedback against every cafe the member
 * belongs to.
 */
async function handleReviewReply(phone: string, rating: number, merchantId: string | null) {
  let query = adminDb()
    .from("customers")
    .select("id, merchant_id, display_name")
    .eq("phone", phone)
    .eq("is_member", true);
  if (merchantId) query = query.eq("merchant_id", merchantId);

  const { data } = await query.limit(5);

  const customers = (data ?? []) as { id: string; merchant_id: string; display_name: string | null }[];
  if (customers.length === 0) {
    if (merchantId) {
      await sendWhatsAppMessage(
        merchantId,
        phone,
        "Thanks for the reply. Join iRewards after your next visit to unlock member perks.",
      );
    }
    return;
  }

  const { recordMemberFeedback } = await import("@/lib/db/member-feedback-repository");

  for (const customer of customers) {
    await recordMemberFeedback({
      merchantId: customer.merchant_id,
      customerId: customer.id,
      rating,
      note: rating <= 4 ? `Private feedback rating ${rating}` : null,
    }).catch((err) => console.error("Failed to store member feedback:", err));

    if (rating === 5) {
      const { data: merchant } = await adminDb()
        .from("merchants")
        .select("name, google_url")
        .eq("id", customer.merchant_id)
        .maybeSingle();
      const row = merchant as { name?: string; google_url?: string | null } | null;
      const link = row?.google_url?.trim();
      await sendWhatsAppMessage(
        customer.merchant_id,
        phone,
        link
          ? `Thanks so much! If you have 20 seconds, a Google review helps us a lot:\n${link}`
          : `Thanks so much for dining with ${row?.name ?? "us"}! We're glad you enjoyed it.`,
      );
    } else {
      await sendWhatsAppMessage(
        customer.merchant_id,
        phone,
        "Thanks for telling us — a manager will follow up privately. We appreciate your honesty.",
      );
    }
  }
}

/**
 * Opting out applies to the store whose number they messaged. Unsubscribing
 * someone from every cafe they belong to because they told one to stop would
 * quietly destroy the other merchants' lists.
 */
async function handleMarketingOptOut(phone: string, merchantId: string | null) {
  let query = adminDb().from("customers").select("id").eq("phone", phone);
  if (merchantId) query = query.eq("merchant_id", merchantId);

  const { data } = await query.limit(20);

  for (const row of data ?? []) {
    await updateCustomer((row as { id: string }).id, { marketing_opt_out: true });
  }
}
