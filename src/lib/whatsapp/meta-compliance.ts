/**
 * Meta WhatsApp template compliance — the deterministic half of the harness.
 *
 * Pure, no I/O, safe on both client and server. The same report drives the
 * live checklist in the template editor, the Review step, AI-generated copy
 * (which gets one repair pass), and `submitCampaignTemplate`, which refuses to
 * send anything with a blocker to Meta. Rules follow Meta's published template
 * guidelines and the WhatsApp Business / Commerce policies; "warn" items are
 * not hard rejections but are the usual reasons a review drags or a template
 * gets low quality ratings after approval.
 *
 * Every issue is written for a cafe owner: `message` says what is wrong in
 * plain words, `hint` says exactly what to change.
 */

export type ComplianceSeverity = "block" | "warn";

export type ComplianceIssue = {
  code: string;
  severity: ComplianceSeverity;
  /** What is wrong, in plain words. */
  message: string;
  /** What to change. */
  hint?: string;
};

export type ComplianceReport = {
  ok: boolean;
  blockers: ComplianceIssue[];
  warnings: ComplianceIssue[];
};

export type ComplianceButton = {
  type: "quick_reply" | "url" | "phone";
  label: string;
  value: string;
};

export type ComplianceInput = {
  body: string;
  headerType?: "none" | "text" | "image";
  headerText?: string;
  footer?: string;
  /** The template's own opt-out toggle; when true "Reply STOP to opt out." is appended at send time. */
  includeOptOut?: boolean;
  buttons?: ComplianceButton[];
  /** Used to detect whether the copy identifies the sender. */
  merchantName?: string;
};

/* -------------------------------------------------------------------------- */
/* Limits (Meta Business Management API)                                       */
/* -------------------------------------------------------------------------- */

export const META_BODY_LIMIT = 1024;
export const META_HEADER_TEXT_LIMIT = 60;
export const META_FOOTER_LIMIT = 60;
export const META_BUTTON_LABEL_LIMIT = 25;
export const META_MAX_BUTTONS = 3;
/** Above this, quality ratings drop — members skim, then block. */
export const RECOMMENDED_BODY_LIMIT = 320;

const KNOWN_TOKENS = ["merchant", "name", "code"];
const ANY_TOKEN = /\{\{?\s*([a-z0-9_]+)\s*\}?\}/gi;
const KNOWN_TOKEN = /\{(merchant|name|code)\}/gi;

const URL_SHORTENERS =
  /\b(bit\.ly|tinyurl\.com|goo\.gl|t\.co|ow\.ly|is\.gd|buff\.ly|cutt\.ly|rebrand\.ly|s\.id|tiny\.cc|shorturl\.at|rb\.gy|lnkd\.in|wa\.link)\b/i;

/** WhatsApp Business / Commerce policy — Meta rejects marketing for these outright. */
const PROHIBITED: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(casino|gambling|betting|lottery|jackpot|4d|toto|slot machine|poker)\b/i, label: "gambling or lottery" },
  { pattern: /\b(cigarette|cigarettes|tobacco|vape|vaping|e-cig|shisha|hookah)\b/i, label: "tobacco or vaping" },
  { pattern: /\b(weed|cannabis|marijuana|cbd|thc|kratom|ketum|cocaine|ecstasy)\b/i, label: "drugs" },
  { pattern: /\b(firearm|firearms|gun|guns|ammunition|explosives)\b/i, label: "weapons" },
  { pattern: /\b(escort|xxx|porn|sex toys?|adult content)\b/i, label: "adult content" },
];

/** Restricted rather than banned, but reviewers routinely reject cafe promos built around them. */
const RESTRICTED: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(beer|wine|liquor|whisky|whiskey|vodka|cocktail|cocktails|happy hour|alcohol)\b/i, label: "alcohol" },
  { pattern: /\b(cure|cures|treat(?:s|ment)?|lose weight|weight loss|detox|slimming|medicine|prescription)\b/i, label: "health or medical claims" },
  { pattern: /\b(loan|loans|credit card|forex|crypto|bitcoin|investment)\b/i, label: "loans, cards or investments" },
];

/** Asking for these violates policy and PDPA in one go. */
const SENSITIVE_REQUESTS =
  /\b(ic number|nric|mykad|passport (?:no|number)|bank account|account number|card number|cvv|otp|one[- ]time password|password|pin number)\b/i;

const SPAM_PHRASES =
  /\b(act now|free money|guaranteed|you have been selected|you've been selected|winner|congratulations you|100% free|risk[- ]free|click here|limited time only|don't miss out|last chance|urgent)\b/i;

/** Rough signal that copy is mostly Malay or Chinese while the template is registered as English. */
const MALAY_WORDS =
  /\b(anda|kami|terima kasih|sila|jom|percuma|diskaun|hari ini|untuk|dengan|dapatkan|tawaran|kedai|makan|minum)\b/gi;
const CJK = /[㐀-鿿]/;

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

function emojiCount(text: string): number {
  return countMatches(text, /\p{Extended_Pictographic}/gu);
}

/* -------------------------------------------------------------------------- */
/* Lint                                                                        */
/* -------------------------------------------------------------------------- */

export function lintWhatsAppTemplate(input: ComplianceInput): ComplianceReport {
  const blockers: ComplianceIssue[] = [];
  const warnings: ComplianceIssue[] = [];
  const block = (code: string, message: string, hint?: string) =>
    blockers.push({ code, severity: "block", message, hint });
  const warn = (code: string, message: string, hint?: string) =>
    warnings.push({ code, severity: "warn", message, hint });

  const body = input.body ?? "";
  const trimmed = body.trim();
  const headerText = input.headerType === "text" ? (input.headerText ?? "").trim() : "";
  const footer = (input.footer ?? "").trim();
  const buttons = input.buttons ?? [];
  const everything = [headerText, trimmed, footer].filter(Boolean).join("\n");

  /* --- structure ---------------------------------------------------------- */

  if (!trimmed) {
    block("empty_body", "Your message is empty.", "Write the message members will receive.");
    return { ok: false, blockers, warnings };
  }
  if (trimmed.length > META_BODY_LIMIT) {
    block(
      "body_too_long",
      `Your message is too long (${trimmed.length} characters — Meta's limit is ${META_BODY_LIMIT}).`,
      "Shorten it: one offer, one line on how to claim it.",
    );
  } else if (trimmed.length > RECOMMENDED_BODY_LIMIT) {
    warn(
      "body_long",
      `Your message is on the long side (${trimmed.length} characters).`,
      `Under ${RECOMMENDED_BODY_LIMIT} characters gets read more and blocked less.`,
    );
  }
  if (headerText.length > META_HEADER_TEXT_LIMIT) {
    block(
      "header_too_long",
      `The header is too long (max ${META_HEADER_TEXT_LIMIT} characters).`,
      "Keep it to a few words, e.g. “Weekend special”.",
    );
  }
  if (footer.length > META_FOOTER_LIMIT) {
    block("footer_too_long", `The footer is too long (max ${META_FOOTER_LIMIT} characters).`, "Shorten the footer.");
  }
  if (buttons.length > META_MAX_BUTTONS) {
    block("too_many_buttons", `Too many buttons — Meta allows up to ${META_MAX_BUTTONS}.`, "Remove a button.");
  }
  for (const button of buttons) {
    const label = button.label.trim();
    if (!label) {
      block("button_label_missing", "A button has no label.", "Give every button a short label like “View menu”.");
    } else if (label.length > META_BUTTON_LABEL_LIMIT) {
      block(
        "button_label_long",
        `The “${label}” button label is too long (max ${META_BUTTON_LABEL_LIMIT} characters).`,
        "Shorten the label.",
      );
    }
    if (button.type === "url") {
      if (!/^https:\/\//i.test(button.value.trim())) {
        block(
          "button_url",
          `The “${label || "Visit website"}” button needs a full web address starting with https://`,
          "Paste the whole address, e.g. https://yourcafe.com/menu",
        );
      } else if (URL_SHORTENERS.test(button.value)) {
        block(
          "button_shortener",
          `The “${label}” button uses a shortened link (bit.ly, tinyurl…), which Meta rejects.`,
          "Paste the full web address instead.",
        );
      }
    }
    if (button.type === "phone" && !/^\+?[0-9][0-9 \-()]{6,}$/.test(button.value.trim())) {
      block(
        "button_phone",
        `The “${label || "Call us"}” button needs a phone number with country code.`,
        "For example +60123456789.",
      );
    }
  }

  /* --- placeholders ------------------------------------------------------- */

  const unknownTokens = new Set<string>();
  for (const match of body.matchAll(ANY_TOKEN)) {
    const raw = match[0];
    const token = match[1].toLowerCase();
    if (raw.startsWith("{{") || !KNOWN_TOKENS.includes(token)) unknownTokens.add(raw);
  }
  if (unknownTokens.size > 0) {
    block(
      "unknown_placeholder",
      `${[...unknownTokens].join(", ")} isn't a placeholder we can fill in — members would see it exactly like that.`,
      "Use only {merchant}, {name} and {code}, or write the words out in full.",
    );
  }

  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const floating = lines.some((line) => /^(\{(merchant|name|code)\}[\s,.!]*)+$/i.test(line));
  if (floating) {
    block(
      "floating_variable",
      "A line has only a placeholder and no words (for example just “{name}”).",
      "Put words around it, e.g. “Hi {name},” — Meta rejects placeholders on their own.",
    );
  }
  const variableCount = countMatches(trimmed, KNOWN_TOKEN);
  const textOnly = trimmed.replace(KNOWN_TOKEN, "").replace(/\s+/g, " ").trim();
  if (variableCount > 0 && textOnly.length < 20) {
    block(
      "variable_heavy",
      "Your message is almost all placeholders with hardly any words.",
      "Add a sentence about the offer and how to use it, e.g. “Show this message for 20% off your next coffee.”",
    );
  } else if (variableCount >= 2 && textOnly.length < 50) {
    warn(
      "variable_heavy",
      "Your message is short for the number of placeholders in it.",
      "A few more words about the offer help Meta's reviewer see what it is.",
    );
  }
  if (/\{(merchant|name|code)\}[\s.!?]*$/i.test(trimmed) && !input.includeOptOut && !/stop|opt.?out|unsubscribe/i.test(everything)) {
    warn("ends_with_variable", "Your message ends on a placeholder.", "Finish with your own words, e.g. “…see you soon!”");
  }

  /* --- links -------------------------------------------------------------- */

  if (URL_SHORTENERS.test(everything)) {
    block(
      "url_shortener",
      "Your message has a shortened link (bit.ly, tinyurl…), which Meta rejects.",
      "Paste the full web address instead.",
    );
  }
  if (/https?:\/\/\S+/i.test(trimmed) && !/https:\/\//i.test(trimmed)) {
    warn("http_link", "Your link starts with http:// instead of https://.", "Use the https:// version so Meta trusts it.");
  }

  /* --- policy ------------------------------------------------------------- */

  for (const rule of PROHIBITED) {
    if (rule.pattern.test(everything)) {
      block(
        "prohibited_content",
        `Your message mentions ${rule.label}, which WhatsApp doesn't allow in marketing messages.`,
        "Remove it — Meta will reject the template otherwise.",
      );
    }
  }
  for (const rule of RESTRICTED) {
    if (rule.pattern.test(everything)) {
      warn(
        "restricted_content",
        `Your message mentions ${rule.label}. Meta often rejects promotions built around this.`,
        "Lead with food, drinks or the reward instead.",
      );
    }
  }
  if (SENSITIVE_REQUESTS.test(everything)) {
    block(
      "sensitive_data_request",
      "Your message asks members for personal details (IC, bank, card, password or OTP).",
      "Remove the request — these must never be collected over WhatsApp.",
    );
  }

  /* --- opt-out (PDPA + marketing category) ---------------------------------- */

  const hasOptOutText = /\bstop\b|opt.?out|unsubscribe/i.test(everything);
  if (!input.includeOptOut && !hasOptOutText) {
    block(
      "missing_opt_out",
      "Your message gives members no way to opt out.",
      "Switch on “Include opt-out line” in the message step — it adds “Reply STOP to opt out.” for you.",
    );
  }

  /* --- quality ------------------------------------------------------------ */

  const shouting = (trimmed.match(/\b[A-Z]{4,}\b/g) ?? []).filter((w) => !["STOP", "PDPA", "RM", "SGD"].includes(w));
  if (shouting.length >= 3) {
    warn("all_caps", "Several words are in ALL CAPS.", "Write them normally — capitals look like spam to Meta and to members.");
  }
  if (countMatches(trimmed, /!/g) >= 3) {
    warn("exclamation", "Quite a few exclamation marks.", "One is plenty — more reads as pushy.");
  }
  if (emojiCount(trimmed) > 4) {
    warn("emoji_heavy", "More than four emoji.", "Keep one or two so the message looks professional.");
  }
  if (SPAM_PHRASES.test(everything)) {
    warn(
      "spam_phrase",
      "Contains phrases spam filters dislike (“act now”, “guaranteed”, “click here”…).",
      "Say plainly what the offer is instead.",
    );
  }
  const merchantNamed =
    /\{merchant\}/i.test(everything) ||
    (!!input.merchantName?.trim() && everything.toLowerCase().includes(input.merchantName.trim().toLowerCase()));
  if (!merchantNamed) {
    warn(
      "no_sender_identity",
      "The message never says it's from your cafe.",
      "Add {merchant}, e.g. “Hi {name}, {merchant} here!” — so members recognise you.",
    );
  }
  if (CJK.test(trimmed) || countMatches(trimmed, MALAY_WORDS) >= 4) {
    warn(
      "language_mismatch",
      "Most of the message isn't in English, but the template is registered as English.",
      "Keep the main sentences in English for now; a few local words are fine.",
    );
  }

  return { ok: blockers.length === 0, blockers, warnings };
}

/** One line per blocker, ready for an error banner. */
export function describeBlockers(report: ComplianceReport): string {
  return report.blockers.map((b) => `• ${b.message}${b.hint ? ` ${b.hint}` : ""}`).join("\n");
}

/* -------------------------------------------------------------------------- */
/* Auto-fix                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Mechanical fixes that never change meaning: whitespace, the opt-out toggle,
 * a stray "Reply STOP" line that the toggle would duplicate. Returns what
 * changed so the UI can say so.
 */
export function autoFixWhatsAppTemplate<T extends ComplianceInput>(input: T): { fixed: T; applied: string[] } {
  const applied: string[] = [];
  let body = input.body ?? "";

  const collapsed = body.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (collapsed !== body) {
    body = collapsed;
    applied.push("Tidied spacing");
  }

  const strippedStop = body.replace(/\s*(?:reply\s+)?stop\s+to\s+(?:opt.?out|unsubscribe)\.?\s*$/i, "").trim();
  if (strippedStop !== body && strippedStop.length > 0) {
    body = strippedStop;
    applied.push("Moved the opt-out line to the template toggle");
  }

  const includeOptOut = true;
  if (input.includeOptOut === false) applied.push("Turned on the opt-out line");

  return { fixed: { ...input, body, includeOptOut }, applied };
}

/* -------------------------------------------------------------------------- */
/* Prompt copy                                                                 */
/* -------------------------------------------------------------------------- */

/** The same rules in prose, for the model. Keep in sync with lintWhatsAppTemplate. */
export const META_TEMPLATE_RULES_FOR_MODEL = `
## Meta WhatsApp template rules (mandatory — copy is linted after you write it)
- Body ≤ ${RECOMMENDED_BODY_LIMIT} characters (hard limit ${META_BODY_LIMIT}). Header text ≤ ${META_HEADER_TEXT_LIMIT}, footer ≤ ${META_FOOTER_LIMIT}, at most ${META_MAX_BUTTONS} buttons with labels ≤ ${META_BUTTON_LABEL_LIMIT} characters.
- Placeholders allowed: {merchant}, {name}, {code} only. Never write {{1}} or invent tokens like {discount}.
- Never put a placeholder alone on its own line, never start the message with one, and do not end on one. Surround placeholders with real words — at least two full sentences of your own.
- Always include {merchant} so the member knows who is writing.
- No link shorteners (bit.ly, tinyurl…). Links must be full https:// URLs.
- Do NOT write "Reply STOP to opt out" yourself — the template adds it automatically (includeOptOut is always true).
- Never ask for IC/NRIC, passport, bank, card, OTP or password details.
- No gambling, tobacco/vape, drugs, weapons or adult content. Avoid building the offer around alcohol, medical claims or financial products.
- Plain, warm, specific copy. No ALL-CAPS words, at most one exclamation mark, at most two emoji, no spam phrases ("act now", "guaranteed", "click here", "limited time only").
- Write in English (the template language is en). A light local touch ("lah", "jom") is fine inside an English sentence.
- Say what the offer is and how to use it (e.g. "show this message" or "use code {code} at checkout").
`.trim();
