# Connecting a merchant's WhatsApp

Every merchant sends from their own WhatsApp Business Account (WABA). Meta bills
them directly, and their sending reputation is theirs alone — so one cafe
blasting promos cannot get a shared number restricted for everybody else.

There are two halves to this, and they are done by different people:

| Half | Who does it | How often |
|---|---|---|
| The Meta app, once, so the Connect button works at all | you, the operator | once |
| Connecting their own WhatsApp | each merchant, in Settings → WhatsApp | per merchant |

The merchant half is a five-minute self-service dialog. The operator half is the
part with the paperwork, and none of it can be skipped — until it is done, every
merchant sees *"WhatsApp sign-up is not configured on this server yet."*

---

## Part 1 — Operator setup (once)

### 1. Become a Tech Provider

At [Meta for Developers](https://developers.facebook.com/), create a **Business**
type app and add the **WhatsApp** product. Your Meta Business needs:

- **Business Verification** — Meta checks your company is real. Have your SSM
  registration and a matching utility bill or bank statement ready. This is the
  slow step; budget days, not hours.
- **Advanced Access** for `whatsapp_business_management` and
  `whatsapp_business_messaging`. You cannot onboard a single merchant until both
  are approved.

Until App Review and Access Verification are done you are capped at **10 new
merchants per rolling 7 days**, rising to 200 after. Worth starting early if you
are onboarding a batch.

> Tech Provider means each merchant adds their **own** payment method to their
> WhatsApp account. You are not extending them credit, and you never see their
> Meta bill.

### 2. Create the Embedded Signup configuration

In the App Dashboard: **WhatsApp → Embedded Signup**, then
**Facebook Login for Business → Configurations → Create from template**, using
the *WhatsApp Embedded Signup* template.

Set the configuration to request `whatsapp_business_management` and
`whatsapp_business_messaging`.

Copy the **configuration ID**. That is `META_EMBEDDED_SIGNUP_CONFIG_ID`.

> On Embedded Signup **v4**, permissions and product setup live in this
> configuration rather than in the app's JavaScript. If you are looking at an
> older integration guide that tells you to pass `sessionInfoVersion: "3"`, that
> is v2 — Meta deprecates it on **15 October 2026**.

### 3. Point Meta's webhook at this deployment

App Dashboard → **WhatsApp → Configuration → Webhook**:

| Field | Value |
|---|---|
| Callback URL | `https://<your-domain>/api/webhooks/meta` |
| Verify token | the same string you put in `META_WEBHOOK_VERIFY_TOKEN` |

Subscribe the app to four fields on the WABA:

| Field | What breaks without it |
|---|---|
| `messages` | `JOIN-{token}` sign-ups and STOP opt-outs stop working |
| `message_template_status_update` | templates sit at "pending" forever; no campaign can go live |
| `message_template_quality_update` | a template silently degrading is never surfaced |
| `phone_number_quality_update` | the quality rating in Settings → WhatsApp goes stale |

Each merchant's WABA is subscribed to your app automatically when they connect —
see step 2 in `src/app/api/merchant/[slug]/whatsapp/route.ts`.

### 4. Set the environment

```sh
META_APP_ID=                    # App Dashboard → Settings → Basic
META_APP_SECRET=                # same page; validates X-Hub-Signature-256
META_WEBHOOK_VERIFY_TOKEN=      # any secret string, matching step 3
META_EMBEDDED_SIGNUP_CONFIG_ID= # from step 2
WHATSAPP_TOKEN_KEY=             # encrypts merchant tokens at rest
```

`npm run check:production-env` fails if any of these are missing.

> **`WHATSAPP_TOKEN_KEY` deserves a moment.** Merchant access tokens are
> encrypted with it (AES-256-GCM). If unset it silently falls back to
> `MERCHANT_SESSION_SECRET` — which means rotating a *session* secret would
> orphan every stored token and force all merchants to reconnect, with no
> obvious link between cause and effect.
>
> **If you already have connected merchants and never set this, set it to your
> current `MERCHANT_SESSION_SECRET` value.** Any other value locks them out.

---

## Part 2 — What the merchant does

Send them to **Settings → WhatsApp → Connect WhatsApp**. Meta's dialog handles
the rest; the token goes straight to the server and never touches their browser.

Tell them beforehand what they will need, because the third one surprises people:

1. A Facebook account that manages their business.
2. Business registration details, for Meta's verification.
3. **A phone number that is not already on WhatsApp.** If the shop number is
   live on the ordinary WhatsApp app, they must either delete that account first
   or use a different number. This is the single most common reason a cafe gets
   stuck halfway.

Once connected, Settings → WhatsApp shows the number, the verified business
name, and Meta's quality rating.

---

## Then: campaigns

A WhatsApp campaign will not go live until three things are true, and the
dashboard names whichever one is missing rather than failing silently:

1. **The account is connected** — otherwise the campaign would sit Active and
   send nothing.
2. **Meta approved the message template.** Templates are approved against one
   specific WABA, so approval for one merchant says nothing about another's.
   Submit from the workflow builder; verdicts arrive on the webhook from step 3.
3. **The workflow validates**, and any voucher it issues can be created.

Enforced in `goLiveBlocker` (`src/lib/services/campaign-status.ts`).

---

## The shared pilot number

`WHATSAPP_ALLOW_PLATFORM_FALLBACK=true` lets merchants who have *not* connected
send from the platform WABA in `META_ACCESS_TOKEN` / `META_WABA_ID` /
`META_PHONE_NUMBER_ID`.

It is **off by default**, deliberately. With it on, a merchant who never
connects quietly sends on a number shared with every other such merchant, and
one bad sender takes the quality rating down for all of them — the exact problem
per-merchant accounts exist to solve. The go-live gate also stops warning them,
because from the code's point of view they can send.

Turn it on for a named pilot, then turn it off.

---

## Local development

`WHATSAPP_SKIP_SEND=true` writes messages to the server log instead of calling
Meta, and the WhatsApp settings panel says so. `META_SKIP_VERIFY=true` accepts
unsigned webhooks so you can curl them. Both are refused in production by
`check-production-env.sh`.
