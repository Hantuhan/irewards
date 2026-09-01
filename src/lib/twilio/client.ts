import twilio from "twilio";

export function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Missing Twilio environment variables");
  }

  return twilio(accountSid, authToken);
}

export function getTwilioWhatsAppFrom() {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) {
    throw new Error("Missing TWILIO_WHATSAPP_FROM");
  }
  return from;
}

export function validateTwilioRequest(
  signature: string | null,
  url: string,
  params: Record<string, string>,
) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !signature) return false;

  return twilio.validateRequest(authToken, signature, url, params);
}

export function parseWhatsAppPhone(from: string): string {
  return from.replace("whatsapp:", "");
}
