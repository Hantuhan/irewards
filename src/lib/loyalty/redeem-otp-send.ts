import { isWhatsAppDevMode } from "@/lib/meta/client";
import { findMetaConfigForMerchant } from "@/lib/meta/merchant-config";
import { sendWhatsAppMessage, sendWhatsAppTemplateMessage } from "@/lib/whatsapp/outbound";

/**
 * Sends a 4-digit redeem OTP over WhatsApp.
 * Prefers an approved auth/utility template when META_REDEEM_OTP_TEMPLATE is set;
 * otherwise falls back to free-form text (works inside the 24h window).
 * When Meta is unset or WHATSAPP_SKIP_SEND=true, logs locally (dev).
 */
export async function sendRedeemOtpWhatsApp(input: {
  merchantId: string;
  phone: string;
  code: string;
  merchantName: string;
}): Promise<{ messageId: string; channel: "template" | "text" | "dev" }> {
  // No connected WABA (and no platform fallback) means there is nowhere to
  // send from — log it in dev rather than failing the member's login.
  const configured = (await findMetaConfigForMerchant(input.merchantId)) !== null;
  if (isWhatsAppDevMode() || !configured) {
    console.info(
      `[whatsapp:dev] redeem OTP → ${input.phone} code=${input.code} cafe=${input.merchantName}`,
    );
    return { messageId: "dev-redeem-otp", channel: "dev" };
  }

  const templateName = process.env.META_REDEEM_OTP_TEMPLATE?.trim();
  const templateLang = process.env.META_REDEEM_OTP_TEMPLATE_LANG?.trim() || "en";

  if (templateName) {
    const result = await sendWhatsAppTemplateMessage(input.merchantId, input.phone, {
      name: templateName,
      language: templateLang,
      bodyParams: [input.code, input.merchantName],
    });
    return { messageId: result.id, channel: "template" };
  }

  const body =
    `Your ${input.merchantName} iRewards verification code is: ${input.code}. ` +
    `It expires in 5 minutes. If you did not request this, ignore this message.`;
  const result = await sendWhatsAppMessage(input.merchantId, input.phone, body);
  return { messageId: result.id, channel: "text" };
}
