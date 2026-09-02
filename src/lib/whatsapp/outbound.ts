import { graphFetch, getMetaConfig, isWhatsAppDevMode, toMetaPhone } from "@/lib/meta/client";

type SendResult = { id: string };

type MetaSendResponse = {
  messages?: { id: string }[];
};

async function postMessage(payload: Record<string, unknown>): Promise<SendResult> {
  const { phoneNumberId } = getMetaConfig();
  const result = await graphFetch<MetaSendResponse>(`${phoneNumberId}/messages`, {
    method: "POST",
    body: { messaging_product: "whatsapp", recipient_type: "individual", ...payload },
  });
  return { id: result.messages?.[0]?.id ?? "unknown" };
}

/**
 * Free-form text. Meta only delivers these inside the 24-hour customer
 * service window (i.e. as a reply to something the member sent). Anything
 * business-initiated must go through `sendWhatsAppTemplateMessage`.
 */
export async function sendWhatsAppMessage(toPhone: string, body: string): Promise<SendResult> {
  if (isWhatsAppDevMode()) {
    console.info("[whatsapp:dev] text →", toPhone, body);
    return { id: "dev-message" };
  }

  return postMessage({
    to: toMetaPhone(toPhone),
    type: "text",
    text: { preview_url: false, body },
  });
}

export type TemplateSend = {
  name: string;
  language: string;
  /** Values for {{1}}, {{2}}… in order. */
  bodyParams: string[];
  headerImageUrl?: string | null;
};

/** Sends a Meta-approved template. This is the only way to message members outside the 24h window. */
export async function sendWhatsAppTemplateMessage(
  toPhone: string,
  template: TemplateSend,
): Promise<SendResult> {
  if (isWhatsAppDevMode()) {
    console.info(
      "[whatsapp:dev] template →",
      toPhone,
      template.name,
      template.bodyParams,
      template.headerImageUrl ?? "",
    );
    return { id: "dev-template-message" };
  }

  const components: Record<string, unknown>[] = [];
  if (template.headerImageUrl) {
    components.push({
      type: "header",
      parameters: [{ type: "image", image: { link: template.headerImageUrl } }],
    });
  }
  if (template.bodyParams.length > 0) {
    components.push({
      type: "body",
      parameters: template.bodyParams.map((text) => ({ type: "text", text })),
    });
  }

  return postMessage({
    to: toMetaPhone(toPhone),
    type: "template",
    template: {
      name: template.name,
      language: { code: template.language },
      ...(components.length > 0 && { components }),
    },
  });
}

/**
 * SMS sending is paused. Kept as a stub so older imports still resolve; callers
 * should use WhatsApp instead.
 */
export async function sendSmsMessage(_toPhone: string, _body: string): Promise<SendResult> {
  throw new Error("SMS is paused — use WhatsApp campaigns instead");
}
