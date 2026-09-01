import { getTwilioClient, getTwilioWhatsAppFrom } from "@/lib/twilio/client";

export async function sendWhatsAppMessage(toPhone: string, body: string) {
  if (process.env.TWILIO_SKIP_SEND === "true" || process.env.PAYMENT_PROVIDER === "dev") {
    console.info("[twilio:dev] WhatsApp →", toPhone, body);
    return { sid: "dev-message" };
  }

  const client = getTwilioClient();
  const from = getTwilioWhatsAppFrom();
  const to = toPhone.startsWith("whatsapp:") ? toPhone : `whatsapp:${toPhone}`;

  return client.messages.create({ from, to, body });
}

export async function sendSmsMessage(toPhone: string, body: string) {
  if (process.env.TWILIO_SKIP_SEND === "true" || process.env.PAYMENT_PROVIDER === "dev") {
    console.info("[twilio:dev] SMS →", toPhone, body);
    return { sid: "dev-sms" };
  }

  const client = getTwilioClient();
  const from = process.env.TWILIO_SMS_FROM;
  if (!from) throw new Error("Missing TWILIO_SMS_FROM");

  return client.messages.create({ from, to: toPhone, body });
}
