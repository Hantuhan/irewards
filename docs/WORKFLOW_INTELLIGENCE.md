# Workflow intelligence — product decisions

Research snapshot for iRewards campaign builder (MY/SG cafes, WhatsApp-first).

## Sources

- [PDPA + WhatsApp marketing (Malaysia)](https://raiontech.io/blog/pdpa-compliance-whatsapp-marketing-malaysia) — explicit opt-in, STOP within hours, audit trail.
- [WhatsApp blasting without bans (MY SMEs)](https://raiontech.io/blog/whatsapp-blasting-guide-malaysia) — promo ~2–4×/month; win-back ~60–90 days; warm new numbers slowly.
- [WhatsApp marketing Singapore](https://payperwa.com/blog/whatsapp-marketing-singapore-guide-2026) — consent, quality rating, festival timing.
- [WhatsApp drip timing](https://chatdaddy.tech/blog/whatsapp-drip-campaign) — ≥48h between nurture touches; ~09:00–19:00 local; pause on reply.
- Klaviyo winback / welcome patterns — delay after trigger; eject if they convert mid-flow; short sequences.
- Braze Canvas — suppress redundant multi-channel touches (we stay single-channel per campaign).

## Decisions we ship

| # | Decision | Why |
|---|----------|-----|
| 1 | Auto-add **Marketing opt-in** + **Has phone** when a Send step is added | PDPA / Meta quality; cafes forget filters |
| 2 | Suggest **usual path** per trigger (Apply once) | Klaviyo-like speed-to-value for non-marketers |
| 3 | Coach waits: ≥1h after 1st visit; ≥24h review nudge; winback ≥30 days | Local blasting guides + drip spacing |
| 4 | Coach **≥48h** between two Send steps | Drip best practice; reduces blocks |
| 5 | Put **Issue voucher before Send** automatically | `{code}` must exist when message renders |
| 6 | At send time: skip if opted out; winback skip if they visited again | Klaviyo “zero orders since flow started” |

Out of scope for this pass: quiet-hours scheduler, cross-campaign smart sending, multi-message drip editor.
