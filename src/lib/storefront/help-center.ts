/**
 * Diner-facing Help Center copy — how to use the table storefront & iRewards.
 */

export function helpCenterPath(merchantSlug: string) {
  return `/m/${merchantSlug}/help`;
}

export function buildHelpCenterContent(merchantName: string): string {
  const cafe = merchantName.trim() || "this cafe";

  return `${cafe} — Help Center

How to use the table storefront and iRewards.

Order at the table

- Scan the QR code on your table — no app download needed.
- The menu opens for your table. Browse categories and tap an item for details.
- Use + to add items. Customise drinks or dishes when options appear.
- Open Cart to review quantities, remove items, or add a suggested treat.
- Tap Checkout, choose payment (e.g. DuitNow / card / e-wallet), and pay.
- Your order goes to the kitchen. Keep this phone handy for updates.

Guest vs member

- Anyone can order and pay as a guest — no signup required to eat.
- After payment, you can join ${cafe} iRewards on WhatsApp (optional) to earn points and stamps.
- Returning members: on the menu, use “Member? Enter mobile” with the WhatsApp number you joined with to load points and Your Usual.

Rewards

- Points: earn on paid orders when you are a member. Balance and value show on the Shop tab when recognised.
- Stamps: collect toward a free treat when the cafe runs a stamp card. Progress appears on Shop and Rewards.
- Rewards tab: see your stamp card, vouchers, and tier perks.
- Redeem points at checkout only after a WhatsApp verification code when asked.

Tabs at the bottom

- Shop — menu, welcome, Your Usual, quick add.
- Rewards — points, stamps, vouchers.
- Cart — your order, pairings, pay.
- Profile — account, notifications, legal docs, this Help Center.

Languages

- Switch EN / 中文 / BM from the language control on Shop when the cafe enables them.

Need more help?

- Ask your server at ${cafe}.
- Reply to an iRewards WhatsApp message from the cafe for membership help.
- See Privacy Policy and Refund Policy under Profile → Support & Legal.`;
}
