/**
 * Recognising "stop messaging me".
 *
 * Pure, no I/O. Matching only the exact string "STOP" meant that "Stop.",
 * "stop promo", "unsubscribe" and Meta's own opt-out button (which arrives as
 * the button's label, not as "STOP") all fell through to the help text — so we
 * kept messaging someone who had asked us to stop, and they blocked the number
 * instead. Blocks are what sink a WhatsApp quality rating.
 *
 * Deliberately generous: a false positive costs one unwanted unsubscribe that
 * the member can undo by messaging again, a false negative costs the number.
 */

/** English, Malay and Chinese ways members actually opt out. */
const OPT_OUT_TERMS = [
  "stop",
  "stopall",
  "stop promo",
  "stop promotions",
  "stop promotion",
  "stop marketing",
  "stop messages",
  "stop sending",
  "unsub",
  "unsubscribe",
  "opt out",
  "optout",
  "remove me",
  "no more",
  // Malay
  "berhenti",
  "henti",
  "jangan hantar",
  "batal langganan",
  // Chinese
  "退订",
  "退訂",
  "停止",
  "取消订阅",
  "取消訂閱",
];

/** Longer than this and it is a sentence to a human, not a keyword. */
const MAX_OPT_OUT_LENGTH = 40;

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    // Strip punctuation and emoji, collapse whitespace: "STOP!!" and "Stop." both land on "stop".
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True when this inbound message is a request to stop marketing messages.
 * Handles free text and Meta's opt-out button label alike.
 */
export function isOptOutMessage(text: string): boolean {
  const normalized = normalize(text);
  if (!normalized || normalized.length > MAX_OPT_OUT_LENGTH) return false;

  for (const term of OPT_OUT_TERMS) {
    if (normalized === term) return true;
    // "stop promo now", "unsubscribe please" — a keyword opening a short message.
    if (normalized.startsWith(`${term} `)) return true;
  }

  // CJK terms carry no spaces, so match them anywhere in a short message.
  return OPT_OUT_TERMS.some((term) => /[一-鿿]/.test(term) && normalized.includes(term));
}

export { OPT_OUT_TERMS, MAX_OPT_OUT_LENGTH };
