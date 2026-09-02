# Table 4 Pilot Scorecard

**Goal:** Prove one café makes more money with iRewards — not prove the app works.

**Duration:** 8 weeks (Week 0 setup → Weeks 1–6 measure → Week 7–8 decide)

**Beachhead:** Founder's brother's café. Start with **Table 4** (isolated), expand to all tables when scan→order ≥ 50%.

**Price to validate:** RM 199/outlet/month (merchant pays Meta WhatsApp separately).

---

## Week 0 — Setup (before counting)

- [ ] QR stand on Table 4 (`/m/{slug}/table/4`)
- [ ] Table tent: *"Scan to order · Join for points after you pay"*
- [ ] Staff briefed: don't take table orders that can go through QR
- [ ] Google Sheet or dashboard export ready (see tracking below)
- [ ] Baseline captured: last 4 weekends AOV, orders/table, peak-hour wait time

**Pilot mode OK:** Manual WhatsApp replies + static DuitNow if prod stack isn't live yet. Measure the **loop**, not the automation polish.

---

## What to track (every service day)

| Field | How |
|-------|-----|
| Date / session (lunch / dinner) | Sheet row per table session |
| Table # | 4 first, then all |
| Scanned QR? (Y/N) | Staff observation or unique QR hits |
| Order completed via iRewards? (Y/N) | Paid order in system |
| Order total (RM) | Receipt / dashboard |
| Second round via QR? (Y/N) | Mid-meal add-on without flagging staff |
| Paid at counter instead? (bail-out Y/N) | Customer gave up on QR |
| WhatsApp join after pay? (Y/N) | Join token used |
| Upsell accepted? (Y/N) | Cart suggestion taken |
| Notes | Confusion, bugs, complaints |

**Weekly rollup:** total sessions, scan→order %, AOV, bail-out %, WA join %, second-round count, extra RM vs baseline.

---

## Weekly targets

| Week | Focus | Pass signal |
|------|-------|-------------|
| **1** | Table 4 only, founders on floor | ≥ 30% scan→order, learn friction |
| **2** | Fix top 3 blockers | ≥ 40% scan→order |
| **3** | Table 4 stable | ≥ 50% scan→order, bail-out < 20% |
| **4** | All tables live | AOV ≥ baseline + 5% |
| **5** | WhatsApp join pushed at thank-you | WA join ≥ 20% of paid orders |
| **6** | Full loop (voucher → return) | ≥ 1 voucher redeemed OR clear return visit from member |
| **7** | Reduce founder hand-holding | Metrics hold without you on floor every shift |
| **8** | **Go / no-go** | See decision gate below |

---

## North-star metrics (8-week gate)

| Metric | Target | Why |
|--------|--------|-----|
| **Scan → order completed** | ≥ **50%** | Product is usable without staff rescue |
| **AOV vs baseline** | ≥ **+10%** | Upsell / second rounds work |
| **Counter bail-outs** | < **20%** | Diners aren't rejecting the flow |
| **WhatsApp join (post-pay)** | ≥ **20%** | Retention loop has fuel |
| **Voucher redeemed in 14 days** | ≥ **1** | Proves comeback, not just signup |
| **Extra revenue (Table 4 vs before)** | ≥ **RM 500/mo** equivalent | Pays for RM 199 with margin |

**ROI line for sales:** *"Table 4 added RM X this month. iRewards costs RM 199."*

---

## Revenue math (keep it simple)

```
Extra RM/month  =  (iRewards AOV − baseline AOV) × iRewards orders
                 +  second-round orders attributed to QR
                 +  voucher-driven return visits (tag in sheet)

Worth it if:     Extra RM ≥ RM 400/month  (2× subscription — cushion for churn)
Strong yes if:  Extra RM ≥ RM 800/month  (4× — easy sell to stranger cafés)
```

---

## Go / no-go (end of Week 8)

### ✅ GO — pursue first paying non-family café

All true:

- Scan→order ≥ 50% on all tables for 2 consecutive weeks
- AOV up ≥ 10% OR second-round orders clearly attributable to QR
- WA join ≥ 15% (20% stretch)
- At least one return visit tied to voucher/member
- Owner says: *"I'd pay for this"*

**Next step:** RM 149–199 to first outside café. Case study one-pager with real numbers.

### 🟡 PIVOT — problem is real, packaging isn't

- Diners use QR but won't join WhatsApp → double down on ordering/upsell, soften loyalty pitch
- Join works but ordering friction high → fix UX before scaling
- One daypart works (lunch not dinner) → narrow positioning

**Next step:** 2 more weeks on one variable. Don't add features blindly.

### ❌ STOP — don't scale yet

Any true:

- Scan→order stuck < 35% after fixes
- Bail-outs > 30%
- AOV flat or down vs baseline
- Owner won't ask staff to push it
- You can't attribute **any** extra RM

**Next step:** Honest post-mortem. Consider narrower wedge (ordering only, or loyalty only for existing POS).

---

## Roles

| Who | Does what |
|-----|-----------|
| **On-floor founder** | Watch bail-outs, help stuck diners, log sheet |
| **Tech founder** | Fix blockers within 48h, don't build v2 features |
| **Café owner** | Enforce "table orders via QR" during pilot hours |
| **Staff** | One line: *"Scan the QR to order — join for points after you pay"* |

---

## What NOT to do during pilot

- Don't add Meta Embedded Signup, Supabase migration, or new tabs
- Don't pitch 10 cafés before Week 8 gate
- Don't discount below RM 149 without data
- Don't count vanity metrics (scans alone, app installs)

---

## One sentence for co-founders

> **"If Table 4 doesn't add ≥ RM 500/month equivalent by Week 8, we don't sell. If it does, we have a business."**
