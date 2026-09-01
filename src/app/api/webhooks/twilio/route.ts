import { NextResponse } from "next/server";
import {
  parseWhatsAppPhone,
  validateTwilioRequest,
} from "@/lib/twilio/client";
import { parseJoinMessage } from "@/lib/loyalty/join-token";
import { JoinError, processWhatsAppJoin } from "@/lib/services/loyalty-join";
import { updateCustomer } from "@/lib/db/repository";
import { createInsforgeAdmin } from "@/lib/insforge/client";

function shouldSkipTwilioVerify() {
  return (
    process.env.TWILIO_SKIP_VERIFY === "true" ||
    process.env.PAYMENT_PROVIDER === "dev"
  );
}

export async function POST(request: Request) {
  const form = await request.formData();
  const params = Object.fromEntries(
    Array.from(form.entries()).map(([k, v]) => [k, String(v)]),
  );

  const signature = request.headers.get("x-twilio-signature");
  const url = request.url;

  if (!shouldSkipTwilioVerify() && !validateTwilioRequest(signature, url, params)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const from = params.From ?? "";
  const body = params.Body ?? "";
  const phone = parseWhatsAppPhone(from);
  const externalUserId = params.ExternalUserId ?? params.WaId ?? null;
  const joinToken = parseJoinMessage(body);

  if (body.trim().toUpperCase() === "STOP") {
    await handleMarketingOptOut(phone);
    return twimlMessage("You have been unsubscribed from marketing messages.");
  }

  if (!joinToken) {
    return twimlMessage(
      "Send JOIN-{token} from your receipt to join iRewards and claim points.",
    );
  }

  try {
    const result = await processWhatsAppJoin({
      token: joinToken,
      phone,
      externalUserId,
    });

    return twimlMessage(
      `You're in iRewards! Level: ${result.tierName}. +${result.pointsAwarded} point${result.pointsAwarded === 1 ? "" : "s"} added. Balance: ${result.customer.points_balance}. See you next time!`,
    );
  } catch (error) {
    if (error instanceof JoinError) {
      return twimlMessage(error.message);
    }
    console.error("Twilio join error:", error);
    return twimlMessage("Something went wrong. Please ask staff for help.");
  }
}

function twimlMessage(body: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(body)}</Message></Response>`;
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function handleMarketingOptOut(phone: string) {
  const admin = createInsforgeAdmin();
  const { data } = await admin.database
    .from("customers")
    .select("id")
    .eq("phone", phone)
    .limit(20);

  for (const row of data ?? []) {
    await updateCustomer((row as { id: string }).id, { marketing_opt_out: true });
  }
}
