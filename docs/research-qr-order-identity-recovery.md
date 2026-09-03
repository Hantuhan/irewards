# QR table ordering & loyalty: first visit vs returning identity (cookies cleared)

Research date: 2026-09-03  
Scope: How restaurant/cafe QR table-order and loyalty products handle first-visit entry and returning-member recognition when browser cookies/session storage are gone.  
Method: Primary sources only (vendor help centers, product docs, official product pages, first-party merchant blogs). Marketing claims treated skeptically; concrete UX/help language preferred.

---

## 1. Common patterns

| Pattern | What it means in practice | Where it shows up |
| --- | --- | --- |
| **Menu-first guest** | Scan → browse menu → identity/payment later | Oddle Shop (browse then checkout OTP); HungryHungry FAQ (scan → visual menu); ChowNow product blog (scan → browse/order/pay, contact at checkout); Toast marketing/overview (“scan to browse”) though **Tabs** config asks name+phone *before* menu |
| **Phone gate (early)** | Name/phone (sometimes OTP) before or at start of ordering | me&u (SMS verify mobile on first order); Flipdish (SMS login default before pay); Toast Tabs (name+phone then menu); Rewardly table QR (signed-out → quick login first) |
| **SMS OTP hard login** | Phone + one-time code creates/restores authenticated session | Toast Accounts; me&u guest verify; Flipdish default pay; Oddle Pass phone login; Punchh Advanced Auth; Paytronix OAuth OTP; Square Online customer accounts (challenge code); Square Loyalty status page (“Request Loyalty Code”) |
| **WhatsApp OTP / deep link** | Auth or membership via WhatsApp instead of SMS | **Not** documented as the default for Toast / Square / me&u / Flipdish / Oddle table/online order. SEA loyalty/marketing products *claim* WhatsApp join/engagement; Meta WhatsApp API supports Authentication (OTP) templates generally, but that is platform capability, not a named cafe QR product’s documented guest UX |
| **Cookie / short session memory** | Browser cookie or short “remember me” window; dies on clear/private browsing | me&u: verified session cookie **365 days**; HungryHungry: remember details **24 hours**; private/incognito explicitly breaks me&u recognition |
| **Phone soft-login** | Enter phone (often no OTP) to attach earn/redeem; weaker proof than OTP | Square Loyalty POS/online: enter phone to enroll/check in; community + staff docs describe phone recognition at Online checkout; Thanx check-in: phone, email, or QR |
| **Post-order / post-pay join** | Order completes; loyalty enroll or CRM opt-in after | Square: enroll during checkout *or* invitation email after eligible purchase; Thanx card-linked: digital checkout enrolls/links card; Toast: “Complete your account for faster checkout next time” on Start tab / Checkout |
| **Out-of-browser identity** | SMS deep link to open tab; wallet pass; loyalty QR; card-linked | Toast: SMS link back to tab; Square Loyalty: Apple Wallet pass / contactless check-in; Thanx: check-in QR or card-linked (US); Punchh: single-scan / receipt barcode check-in |

**Cleared-cookie implication (industry consensus from help docs):** cookies only delay re-identification. Durable recovery is almost always **phone → OTP (or loyalty status SMS code)**, or **non-browser** identifiers (wallet pass, payment card link, staff phone lookup, loyalty QR). Soft phone entry without OTP is common for *earn* but weaker for *secure redeem / saved cards*.

---

## 2. Named examples (scan / order / pay / return)

### Toast Mobile Order & Pay / Tabs

| Stage | Behavior |
| --- | --- |
| **Scan** | Table QR identifies table. **Tabs:** after scan, guest enters **name + phone**, then views menu; SMS link to tab. Hybrid Tabs: scan printed guest QR → name/phone → SMS link. Overview marketing: scan to browse/order/pay. |
| **Order** | Add items; tabs fire after pre-auth (if enabled) or continuously. Group order: contact info to start/join. |
| **Pay** | Card / Apple Pay; optional Toast Account. |
| **Return / cookies gone** | Returning guests **Log in** with **phone + OTP** to use saved payment. Without login, re-enter details. Open tab continuity also via **SMS link** (not cookie-dependent). |

Sources: [Guest Experience](https://support.toasttab.com/en/article/Guest-Experience-for-Toast-Mobile-Order-Pay), [Tabs & Pre-Auth setup](https://support.toasttab.com/en/article/Setting-Up-Tabs-Pre-Authorization-for-Toast-Mobile-Order-Pay), [Hybrid Tabs](https://support.toasttab.com/en/article/Hybrid-Tabs-Beta-Awareness), [FAQ](https://support.toasttab.com/en/article/Toast-Mobile-Order-and-Pay-FAQs).

### me&u (formerly Mr Yum) Order & Pay

| Stage | Behavior |
| --- | --- |
| **Scan** | Table-embedded QR → dine-in menu (table number in QR). |
| **Order / identity** | **First order:** enter mobile → **SMS code** → “verified”. Explicit: **no email/password for venue guests**. |
| **Pay** | Order & pay on phone; optional Velocity account link for points (AU). |
| **Return / cookies gone** | Session stored in **cookies for 365 days**. Private browsing / Code Scanner / cookies blocked → **cannot remember session**; product **asks for mobile again**. Help does not spell “OTP every return after cookie clear,” but first-time path is SMS verify and security rationale is “we cannot recognise your session.” |

Sources: [Why always ask for mobile](https://help.meandu.com/hc/en-us/articles/6539839881743-Why-does-me-u-always-ask-for-my-mobile-number-when-I-scan-the-QR-code), [Dine-in ordering type](https://help.meandu.com/hc/en-us/articles/6539978330895-What-is-the-dine-in-ordering-type), [Velocity for guests](https://help.meandu.com/hc/en-us/articles/14389835091855-Earn-and-Pay-with-Velocity-Points-For-Guests).

### Flipdish QR Order & Pay

| Stage | Behavior |
| --- | --- |
| **Scan** | Table-specific QR can pre-fill table number. |
| **Order / pay** | **Default:** login with **SMS verification code** required to pay. Optional **Guest Checkout** (support-enabled): pay without SMS; phone entered but **not stored**; hurts loyalty/data. |
| **Return / cookies gone** | Default path re-authenticates via **SMS**; guest path has no durable identity. |

Sources: [Using Guest Checkout](https://help.flipdish.com/en/articles/9585248-using-guest-checkout), [Table Ordering FAQ](https://help.flipdish.com/en/articles/9585439-table-ordering-and-qr-code-faq), [Improve QROP experience](https://www.flipdish.com/resources/blog/how-to-improve-the-table-ordering-experience-for-your-customers).

### Oddle Shop / Oddle Pass (SG/APAC online; useful analogue)

| Stage | Behavior |
| --- | --- |
| **Scan / land** | Branded webstore; **menu browse first**. |
| **Checkout** | Contact fields; login to **Oddle Pass** with **quick OTP**; autofill name/phone/address. Phone login: 6-digit OTP, **120s** validity, resend after 2 min; email/password fallback. |
| **Return / cookies gone** | Re-login with **phone OTP** (network account across Oddle restaurants). |

Sources: [What customers see](https://www.oddle.me/docs/new-guests/shop/what-your-customers-see), [Oddle Pass help](https://help.oddle.me/en/articles/4118295-oddle-pass-your-seamless-login-experience).

### Square Online + Square Loyalty

| Stage | Behavior |
| --- | --- |
| **Order** | Online: name/email/phone at checkout; optional **Customer Accounts** (phone challenge code required to create account). |
| **Loyalty** | **Phone** is the loyalty key. Enroll/check in by entering phone at checkout or POS; welcome **SMS** with status link. Status page: phone → **Request Loyalty Code** (SMS) → Sign In. Optional **Apple Wallet loyalty pass** → tap reader to check in (browser-independent). Post-purchase **email invite** to claim points if not enrolled at checkout. |
| **Return / cookies gone** | Soft path: re-enter **same phone** at checkout. Stronger: SMS loyalty code or wallet pass. Card linked to loyalty can auto-suggest redeem. |

Sources: [Customer enroll / redeem](https://square.site/help/us/en/article/5347-how-customers-redeem-their-rewards), [Enroll on POS](https://square.site/help/us/en/article/6469-enroll-to-square-loyalty-using-square-point-of-sale), [Customer accounts](https://square.site/help/us/en/article/7802-customer-accounts-for-square-online), [Apply rewards](https://squareup.com/help/us/en/article/8411-apply-loyalty-rewards-to-a-sale). Online phone recognition also described by Square staff in [Community](https://community.squareup.com/t5/Online-Store/Are-customers-able-to-earn-loyalty-points-by-shopping-in-my/m-p/161370) (useful but secondary to Help Center).

### HungryHungry

| Stage | Behavior |
| --- | --- |
| **Scan** | QR → visual menu → customise order (menu-first in staff FAQ). |
| **Pay** | Cards / Apple Pay / Google Pay; tabs with pre-auth. |
| **Return** | **Remember details 24 hours**; longer if guest **creates an account** and logs in again. Cookie-clear → expect re-entry / login (not fully specified beyond 24h + account). |

Sources: [FAQ for venue staff](https://help.hungryhungry.com/faq-for-venue-staff), [Greet & Seat script](https://help.hungryhungry.com/greet-seat-script) (staff script: remembers payment details up to 24h).

### ChowNow QR Code Ordering

| Stage | Behavior |
| --- | --- |
| **Scan → pay** | Scan table QR → browse, order, pay on phone (no app). |
| **Identity** | **Name, email, phone captured at checkout** into marketing DB. First-party blog; light on OTP/cookies. |

Source: [QR Code Ordering for Restaurants](https://get.chownow.com/blog/restaurant-qr-code/) (merchant blog — treat as product description, not deep auth spec).

### Punchh (PAR) — loyalty on ordering apps

| Stage | Behavior |
| --- | --- |
| **Before pay** | Sign up / look up user; **Send OTP** (email or SMS) → **Verify OTP** → access token; attach identity to order; query redemptions. |
| **After pay** | Check-in via receipt barcode/QR. Mobile can generate **single-scan code** for POS. |
| **Cookies gone** | Session tokens gone → **re-run OTP** (default OTP expiry **10 minutes** per FAQs). |

Sources: [Mobile / website / agency integrations](https://developers.partech.com/docs/dev-portal-developer-resources/getting-started/mobile-app-website-agency), [Punchh FAQs (OTP expiry)](https://developers.partech.com/docs/dev-portal-developer-resources/punchh-api-and-product-faqs).

### Paytronix

| Stage | Behavior |
| --- | --- |
| **Auth** | OAuth: username/password, **mobile + SMS OTP**, user-field grant, or refresh token. |
| **Cookies gone** | Access tokens short-lived; without refresh token in storage → **re-auth** (OTP or password). |

Source: [OAuth Service](https://developers.paytronix.com/pxs_api_reference/oauth.html).

### Thanx

| Stage | Behavior |
| --- | --- |
| **Card-linked (US)** | Digital checkout tokenizes card → automatic earn in-store; no phone each visit. |
| **Check-in (intl-capable)** | At checkout: **phone, email, or QR**; POS identifies guest. Mobile ordering: Get Check-In Code for display QR. |
| **Cookies gone** | Card-linked survives browser wipe; check-in requires re-enter phone/email or show QR. |

Source: [Loyalty Models](https://docs.thanx.com/overview/loyalty-models), [POS/kiosk guide](https://docs.thanx.com/overview/guides/pos-kiosk).

### SevenRooms

CRM/reservations: guest profile via booking + POS sync (e.g. Lightspeed). **Not** a documented browser-cookie recovery model for anonymous table-QR order; identity is reservation/POS-linked.

Sources: [SevenRooms guest experience](https://sevenrooms.com/power-guest-experience/), [Lightspeed integration](https://o-series-support.lightspeedhq.com/hc/en-us/articles/31329259118107-Setting-up-the-SevenRooms-integration).

### Doshii

Integration middleware: dine-in order APIs take `consumer.name` / `consumer.phone`; table check-in. **Partner apps** own guest UX/auth — Doshii does not define cookie recovery.

Source: [Implementing in-venue ordering](https://support.doshii.com/developer-support/hc/en-us/articles/900000842583-implementing-doshii-in-venue-ordering).

### SEA / MY: StoreHub, POSMarket, Rewardly

| Product | Concrete identity notes | Confidence |
| --- | --- | --- |
| **StoreHub QR Order & Pay** | Scan → order/pay; marketing claims data capture + SMS promos. **No** public help article found on OTP vs cookies. | Low (marketing page) — [storehub.com/qr-order-pay](https://www.storehub.com/qr-order-pay) |
| **POSMarket (MY)** | Menu-first QR order; optional **mobile number login** + member discount “where configured.” | Medium (vendor product page, not deep help) — [posmarket.com.my/qr-ordering.php](https://www.posmarket.com.my/qr-ordering.php) |
| **Rewardly (SG-oriented loyalty + table QR)** | Table QR → dine-in; **signed-out → quick login first**. Guest vs member: member = **OTP**; guest = phone/email session. Loyalty pay requires member. Vend pay: **OTP before pay**. | High (docs) — [Online ordering](https://support.rewardly.app/customer-app/online-ordering) |

**iPay88 table order:** No durable primary guest-flow doc found in this pass describing first-visit vs cookie-cleared return; omit rather than invent.

**Synkaa / PEKO / similar WhatsApp loyalty:** Product sites claim WhatsApp/Telegram join without app. Heavy marketing; **insufficient primary UX/help detail** on OTP-after-cookie-clear vs deep-link membership for this report.

---

## 3. How identity is recovered after cleared browser

| Recovery method | How it works | Evidence strength |
| --- | --- | --- |
| **Phone + SMS OTP** | Re-enter mobile; code restores account/session/saved pay | Toast Accounts; me&u first verify; Flipdish default; Oddle Pass; Punchh; Paytronix; Square customer accounts; Rewardly |
| **Phone soft lookup (no OTP)** | Same number → loyalty points/rewards UI | Square Loyalty earn/redeem at POS/Online; Thanx check-in phone |
| **SMS loyalty / status code** | “Request code” to open loyalty status page | Square Loyalty status page |
| **SMS deep link to open check** | Texted URL reopens tab without relying on cookie | Toast Tabs / Hybrid Tabs |
| **Loyalty / check-in QR** | App or wallet shows code scanned at POS/kiosk | Thanx Get Check-In Code; Punchh single-scan; Square Wallet pass (NFC, not QR) |
| **Account email + password** | Fallback when OTP fails | Oddle Pass; Paytronix username/password |
| **Card-linked loyalty** | Paying with enrolled card re-attaches identity | Thanx card-linked (US); Square linked card redeem |
| **WhatsApp deep link / click-to-chat** | Opens chat with prefilled text; user-initiated session | General WhatsApp Business patterns (not Toast/me&u/Flipdish help). Useful for **membership channel**, not proven as table-order session restore in major QR products |
| **WhatsApp Authentication OTP** | Meta conversation type for OTP delivery | Platform capability ([industry API guides](https://gurusup.com/blog/whatsapp-business-api-guide)); **not** cited in Toast/Square/me&u guest help as their channel |

**What clearing cookies does *not* erase:** server-side loyalty account keyed by phone; SMS links already sent; wallet passes; card tokens on card networks (card-linked).

---

## 4. Pros/cons for a Malaysia/Singapore cafe: menu-first order + WhatsApp membership **after** payment

Assumption: guests scan → see menu immediately → order/pay with minimal friction → **after** paid order, invite WhatsApp membership (click-to-chat / opt-in), and later visits must still recognize members when browser cookies are cleared.

### Pros

- **Matches high-conversion ordering pattern.** Oddle documents menu-first then OTP at checkout; HungryHungry/ChowNow/POSMarket describe scan-to-menu. Delaying identity until after pay (or after first successful pay) maximizes first-order completion vs Flipdish-style mandatory SMS before pay or me&u SMS-before-verified-order.
- **Phone still becomes the durable key.** Square/Toast/Punchh/Paytronix/Thanx all treat **mobile** as the portable ID once you need return recognition — same number works after cookie wipe.
- **WhatsApp as membership channel fits SEA usage,** even if global QR leaders use **SMS** for auth. Post-pay “Join on WhatsApp” is a **user-initiated** service conversation (cheaper/simpler opt-in than cold marketing templates) and survives browser clear because membership lives in WhatsApp + your CRM, not cookies.
- **Post-pay join reduces cart abandonment** vs early phone gate (me&u’s own help shows how painful re-verify feels when cookies fail). Aligns with Square’s post-purchase claim-points email pattern.
- **Cleared-cookie return path can be dual:** (1) soft phone at next checkout for points, (2) WhatsApp deep link / “show this QR in chat” for staff or self-serve redeem — analogous to Thanx/Punchh out-of-browser check-in.

### Cons / risks

- **First return after cookie clear will not “just know” them.** Industry help (especially me&u) is explicit: no cookie → re-ask identity. Menu-first alone does not solve return recognition.
- **WhatsApp ≠ automatic browser session restore.** Major table-order products document **SMS OTP**, not WhatsApp OTP, for restoring saved cards or loyalty sessions. If you only message “you’re a member” on WhatsApp but never bind phone→OTP (or wallet/QR) into the ordering webapp, the next QR scan still looks like a guest.
- **Earn without OTP is soft and abuse-prone.** Square-style phone entry is frictionless for earn; redeeming high-value rewards usually wants OTP or staff/POS confirmation (Punchh/Paytronix/Rewardly lean OTP for privileged actions).
- **PDPA / consent timing.** Capturing phone only post-pay + WhatsApp opt-in is cleaner UX but you must still get lawful marketing consent; Meta requires explicit WhatsApp opt-in for business-initiated messages.
- **SMS fallback still needed.** Flipdish documents poor signal as a real failure mode; WhatsApp OTP/Auth templates need Business API setup and approved templates — operational cost vs Twilio/SMS.
- **Spouse/shared-phone collisions.** Square community notes one phone ↔ one loyalty account; same risk in MY/SG family cafes.
- **Don’t rely on marketing-only SEA vendors** (StoreHub/Synkaa/PEKO pages) for auth design — their public materials do not specify cookie-clear recovery with the rigor of me&u/Flipdish/Toast/Oddle help.

### Practical design takeaway (evidence-based)

1. **Visit 1:** Menu-first → pay → capture phone at checkout (order ops) → **optional** WhatsApp join CTA after payment (membership).  
2. **Same device, cookies kept:** short or long session cookie (HungryHungry 24h / me&u 365d) for convenience only.  
3. **Cookies cleared / private browse:** treat as anonymous until **phone re-entry**; for membership privileges use **OTP (SMS or WhatsApp Auth)** or **WhatsApp-held membership QR / deep link**, not cookie hope.  
4. **Separate concerns:** ordering completion (menu-first) vs loyalty assurance (OTP or out-of-browser proof) — this split is what Oddle/Toast/Square already do in different flavors.

---

## 5. Source index (URLs cited)

| Claim area | URL |
| --- | --- |
| Toast guest / account OTP / SMS tab | https://support.toasttab.com/en/article/Guest-Experience-for-Toast-Mobile-Order-Pay |
| Toast Tabs: phone then menu; SMS reorder | https://support.toasttab.com/en/article/Setting-Up-Tabs-Pre-Authorization-for-Toast-Mobile-Order-Pay |
| Toast Hybrid Tabs phone + SMS | https://support.toasttab.com/en/article/Hybrid-Tabs-Beta-Awareness |
| Toast FAQ | https://support.toasttab.com/en/article/Toast-Mobile-Order-and-Pay-FAQs |
| me&u mobile verify + 365-day cookies / private browsing | https://help.meandu.com/hc/en-us/articles/6539839881743-Why-does-me-u-always-ask-for-my-mobile-number-when-I-scan-the-QR-code |
| me&u dine-in QR | https://help.meandu.com/hc/en-us/articles/6539978330895-What-is-the-dine-in-ordering-type |
| Flipdish SMS default + guest checkout | https://help.flipdish.com/en/articles/9585248-using-guest-checkout |
| Flipdish table QR FAQ | https://help.flipdish.com/en/articles/9585439-table-ordering-and-qr-code-faq |
| Flipdish QROP blog (SMS / guest) | https://www.flipdish.com/resources/blog/how-to-improve-the-table-ordering-experience-for-your-customers |
| Oddle menu-first + Pass OTP checkout | https://www.oddle.me/docs/new-guests/shop/what-your-customers-see |
| Oddle Pass phone OTP details | https://help.oddle.me/en/articles/4118295-oddle-pass-your-seamless-login-experience |
| Square Loyalty phone / SMS status / wallet | https://square.site/help/us/en/article/5347-how-customers-redeem-their-rewards |
| Square Loyalty POS enroll | https://square.site/help/us/en/article/6469-enroll-to-square-loyalty-using-square-point-of-sale |
| Square Online customer accounts + phone challenge | https://square.site/help/us/en/article/7802-customer-accounts-for-square-online |
| HungryHungry 24h remember + menu-first QR | https://help.hungryhungry.com/faq-for-venue-staff |
| HungryHungry staff script (24h pay details) | https://help.hungryhungry.com/greet-seat-script |
| ChowNow QR + checkout data capture | https://get.chownow.com/blog/restaurant-qr-code/ |
| Punchh OTP + order attach | https://developers.partech.com/docs/dev-portal-developer-resources/getting-started/mobile-app-website-agency |
| Punchh OTP expiry | https://developers.partech.com/docs/dev-portal-developer-resources/punchh-api-and-product-faqs |
| Paytronix OTP OAuth | https://developers.paytronix.com/pxs_api_reference/oauth.html |
| Thanx card-linked vs check-in | https://docs.thanx.com/overview/loyalty-models |
| Thanx POS phone/email/QR | https://docs.thanx.com/overview/guides/pos-kiosk |
| Doshii dine-in consumer.phone | https://support.doshii.com/developer-support/hc/en-us/articles/900000842583-implementing-doshii-in-venue-ordering |
| Rewardly table QR + OTP member login | https://support.rewardly.app/customer-app/online-ordering |
| POSMarket MY member mobile login | https://www.posmarket.com.my/qr-ordering.php |
| StoreHub QR (marketing) | https://www.storehub.com/qr-order-pay |
| SevenRooms (CRM, not QR auth) | https://sevenrooms.com/power-guest-experience/ |

---

## Gaps / skepticism notes

- **WhatsApp OTP as table-order login** is under-documented among category leaders; treat SEA marketing claims as hypothesis until product help spells scan → order → return UX.
- **iPay88 table order**, **StoreHub**, **Synkaa**, **PEKO**: insufficient primary guest-auth detail for cookie-clear recovery.
- Toast **marketing** (“scan to browse”) vs Tabs **help** (name+phone then menu) — config-dependent; don’t flatten into one UX.
- Square Online loyalty phone recognition is confirmed in Help for POS/status and in Square staff Community posts for Online; prefer Help Center for enrollment mechanics.
