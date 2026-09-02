export type DefaultLegalPolicyContext = {
  merchantName: string;
  currency: "MYR" | "SGD";
  storeEmail?: string | null;
};

function pdpaLabel(currency: "MYR" | "SGD"): string {
  return currency === "MYR"
    ? "Personal Data Protection Act 2010 (Malaysia)"
    : "Personal Data Protection Act 2012 (Singapore)";
}

function contactLine(ctx: DefaultLegalPolicyContext): string {
  const email = ctx.storeEmail?.trim();
  if (email) {
    return `Email us at ${email}`;
  }
  return "Email us at the store contact address listed in Settings → Social";
}

export function defaultRefundPolicy(ctx: DefaultLegalPolicyContext): string {
  const contact = contactLine(ctx);
  return `${ctx.merchantName} — Refund Policy

Last updated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}

We want every visit to be a good experience. This policy applies to orders placed through our table QR storefront and paid in ${ctx.currency}.

Refunds and replacements
• Prepared food and beverages that have already been served are generally not refundable.
• If an item was incorrect, missing, or not prepared to a reasonable standard, tell us within 7 days with your receipt or order reference.
• Approved refunds are returned via the original payment method in ${ctx.currency}.
• We may offer a replacement instead of a refund where appropriate.

How to request a refund
• Speak to our staff during your visit, or
• ${contact} with your receipt number, order date, and a brief description of the issue.

We aim to respond within 3–5 business days.`;
}

export function defaultPrivacyPolicy(ctx: DefaultLegalPolicyContext): string {
  const contact = contactLine(ctx);
  const pdpa = pdpaLabel(ctx.currency);
  const region = ctx.currency === "MYR" ? "Malaysia" : "Singapore";

  return `${ctx.merchantName} — Privacy Policy

Last updated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}

We respect your privacy. This notice explains how we collect, use, and protect personal data when you dine with us, order via our table QR storefront, join iRewards on WhatsApp, or receive messages from us. We process data in line with the ${pdpa} and applicable laws in ${region}.

What we collect
• Order details: items ordered, table number, payment status, and transaction amounts (${ctx.currency}).
• Contact details: mobile number when you join iRewards on WhatsApp; email address if you provide it or if we send store communications by email.
• Loyalty data: membership status, points balance, tier level, and reward redemptions.
• Campaign and messaging data: delivery status, opt-in/opt-out preferences, and message engagement where available.

How we use your data
• To prepare and fulfil your orders.
• To operate the iRewards loyalty programme (points, tiers, vouchers).
• To send service messages related to your order or membership.
• To send marketing campaigns and offers by WhatsApp and/or email where you have agreed or where permitted by law.
• To improve our menu, service, and storefront experience.
• To meet legal, tax, and accounting obligations.

We do not sell your personal data to third parties.

WhatsApp, email, and campaigns
• WhatsApp: used for optional loyalty enrolment after payment, order-related updates, review nudges, and promotional campaigns you can opt into.
• Email: used for store enquiries, campaign messages, and account-related notices when you have provided your email address.
• You may opt out of marketing at any time:
  – WhatsApp: reply STOP (or as instructed in the message).
  – Email: use the unsubscribe link in a campaign email, or ${contact.toLowerCase()} with the subject "Unsubscribe".

Your rights under the PDPA
You may request to:
• Access the personal data we hold about you;
• Correct inaccurate or incomplete data;
• Withdraw consent for marketing (we will stop future promotional messages);
• Request deletion of your data where we are not required to retain it by law.

To make a PDPA request or data cleanup request, ${contact.toLowerCase()} with the subject "PDPA Request". Include your name, phone number or email used with us, and what you would like us to do. We will verify your identity and respond within the timeframe required by law (typically within 21 days).

Data retention
We keep order and transaction records as needed for operations, disputes, and legal requirements. Marketing contact details are removed or suppressed when you opt out. Loyalty data is retained while your membership is active and for a reasonable period afterwards unless you request deletion.

Security
We use reasonable technical and organisational measures to protect your data. Payment processing is handled by our payment partners; we do not store full card details on our systems.

Changes to this policy
We may update this notice from time to time. The latest version will be published on our storefront legal page.

Questions
${contact} for any privacy or data-protection questions.`;
}

export function resolveLegalPolicyDefaults(ctx: DefaultLegalPolicyContext): {
  refundPolicy: string;
  privacyPolicy: string;
} {
  return {
    refundPolicy: defaultRefundPolicy(ctx),
    privacyPolicy: defaultPrivacyPolicy(ctx),
  };
}
