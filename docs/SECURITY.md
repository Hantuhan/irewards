# Security Checklist

## Before pilot

- [ ] Points awarded only after payment verified (webhook or manual sheet for pilot)
- [ ] Join token single-use, expires in 30 minutes
- [ ] First join bonus once per phone per merchant
- [ ] Meta webhook signature validation enabled (`META_APP_SECRET`, `META_SKIP_VERIFY` unset)

## Before second merchant

- [ ] Payment provider HMAC verification implemented
- [ ] No points/join logic callable from client
- [ ] Redeem points requires verified member session
- [ ] STOP opt-out on outbound WhatsApp
- [ ] PDPA notice on storefront footer

## Identity

- Primary: `phone` from the Meta webhook `messages[].from` (signed webhook)
- Secondary: `external_user_id` (BSUID) for WhatsApp username rollout

Never trust phone numbers from URL params or form input alone.
