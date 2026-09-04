#!/usr/bin/env node
/**
 * Builds a believable demo cafe.
 *
 * The dashboard reads well or badly entirely on the shape of its data. Four
 * days of orders and five customers called "Redeem Smoke" make Reports,
 * Customers and Campaigns look broken when they are not — a week-on-week
 * comparison has nothing to compare, and a 30-day churn rule has nobody to
 * find. So this generates ninety days of trading with members at every tier,
 * including the ones the automation rules exist to catch: someone who has
 * drifted away, someone with a birthday coming, someone who joined yesterday.
 *
 * Emits SQL on stdout. `scripts/demo-seed.sh` pipes it at the right database.
 * Scoped to the demo-cafe tenant throughout — every statement is keyed off
 * that slug, so it can never touch a real merchant's data.
 *
 * Deterministic: the same seed produces the same cafe every run, so a
 * screenshot or a walkthrough stays true after a re-seed.
 */

const SLUG = "demo-cafe";
const DAYS = 90;
const RNG_SEED = 20260904;

/** mulberry32 — small, fast, and stable across Node versions. */
function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = makeRng(RNG_SEED);
const pick = (list) => list[Math.floor(rng() * list.length)];
const between = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const chance = (p) => rng() < p;

const q = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);

// --- Menu, priced as seeded. Grouped by when a cafe actually sells them. ---
const MENU = {
  coffee: [
    ["cafe-latte", 1200], ["caffe-americano", 1000], ["long-black", 1200],
    ["einspanner", 1600], ["spanish-latte", 1600], ["v60-pour-over", 1500],
    ["kopi-o", 480], ["flat-white", 1350],
  ],
  tea: [["chamomile-tea", 1300], ["earl-grey-tea", 1400]],
  cold: [
    ["coca-cola", 850], ["watermelon-juice", 1350],
    ["iced-lemon-tea", 1200], ["mineral-water", 800],
  ],
  breakfast: [["eggs-benedict", 2400], ["avocado-toast", 2200], ["big-breakfast", 3200]],
  mains: [
    ["fish-and-chips", 2800], ["chilean-seabass", 5800], ["lamb-shank", 4800], ["pho-bo", 2450],
  ],
  pastaPizza: [
    ["mac-and-cheese", 2200], ["beef-lasagna", 2600], ["truffle-spaghetti", 2600],
    ["carbonara", 2800], ["margherita-pizza", 2800],
  ],
  soupsSalads: [
    ["oxtail-soup", 3400], ["caesar-salad", 1850], ["garden-salad", 1650],
    ["pumpkin-soup", 1600], ["wild-mushroom-soup", 1650],
  ],
  local: [["hokkien-mee", 1750], ["roti-jala", 1850], ["char-kway-teow", 1850]],
  sides: [["buffalo-wings", 1950], ["truffle-fries", 1600]],
  desserts: [
    ["tiramisu", 1800], ["almond-croissant", 1450], ["italian-gelato", 1600],
    ["vanilla-pistachio-gelato", 1600], ["basque-burnt-cheesecake", 1650],
  ],
};

/**
 * What someone orders depends on when they walk in. A basket of lamb shank at
 * 8am is the kind of detail that makes a demo feel generated.
 */
function basketFor(hour) {
  const items = [];
  if (hour < 11) {
    items.push(pick(MENU.coffee));
    if (chance(0.55)) items.push(pick([...MENU.breakfast, ...MENU.desserts]));
  } else if (hour < 15) {
    items.push(pick([...MENU.mains, ...MENU.pastaPizza, ...MENU.local, ...MENU.soupsSalads]));
    if (chance(0.6)) items.push(pick([...MENU.cold, ...MENU.coffee]));
    if (chance(0.25)) items.push(pick(MENU.sides));
  } else {
    items.push(pick([...MENU.coffee, ...MENU.tea, ...MENU.cold]));
    if (chance(0.45)) items.push(pick(MENU.desserts));
    if (chance(0.15)) items.push(pick([...MENU.pastaPizza, ...MENU.local]));
  }
  return items.map(([slug, price]) => ({ slug, price, qty: chance(0.12) ? 2 : 1 }));
}

// --- Members. Each exists to make a specific part of the dashboard true. ---
/**
 * `priorPoints` is what a member earned before the ninety days rendered here.
 *
 * Without it the tier ladder is a lie in a demo: at 0.15 points per ringgit,
 * Platinum's 1,000 lifetime points is about RM6,700 of coffee, which nobody
 * reaches inside a ninety-day window. A cafe that has been trading for two
 * years does have those regulars, so their history starts before the window
 * and is carried in as an opening balance rather than invented per order.
 */
const MEMBERS = [
  { key: "aisyah", name: "Aisyah Rahman", phone: "+60122840193", weight: 0.16, joinedDaysAgo: 615, lastVisitDaysAgo: 1, birthday: [9, 22], priorPoints: 1180, note: "Platinum — two years of the weekly flat white" },
  { key: "wei", name: "Wei Jun Tan", phone: "+60163049271", weight: 0.14, joinedDaysAgo: 430, lastVisitDaysAgo: 2, birthday: [3, 8], priorPoints: 520 },
  { key: "priya", name: "Priya Nair", phone: "+60195522840", weight: 0.11, joinedDaysAgo: 300, lastVisitDaysAgo: 4, birthday: [9, 29], priorPoints: 340, note: "Birthday this month — the birthday perk has a target" },
  { key: "haziq", name: "Haziq Ismail", phone: "+60138871204", weight: 0.10, joinedDaysAgo: 260, lastVisitDaysAgo: 3, birthday: [11, 2], priorPoints: 190 },
  { key: "mei", name: "Mei Ling Chong", phone: "+60177293641", weight: 0.09, joinedDaysAgo: 180, lastVisitDaysAgo: 6, birthday: [1, 17], priorPoints: 95 },
  { key: "daniel", name: "Daniel Lim", phone: "+60111884027", weight: 0.07, joinedDaysAgo: 52, lastVisitDaysAgo: 9, birthday: [6, 30], priorPoints: 40 },
  { key: "nurul", name: "Nurul Huda", phone: "+60194471820", weight: 0.06, joinedDaysAgo: 45, lastVisitDaysAgo: 12, birthday: [4, 11], priorPoints: 30, optOut: true, note: "Opted out of marketing — proves the campaign audience respects it" },
  { key: "arjun", name: "Arjun Menon", phone: "+60126630914", weight: 0.05, joinedDaysAgo: 240, lastVisitDaysAgo: 47, birthday: [8, 5], priorPoints: 210, note: "Churned — 47 days quiet, so the win-back rule has someone to find" },
  { key: "sofia", name: "Sofia Abdullah", phone: "+60148802256", weight: 0.04, joinedDaysAgo: 150, lastVisitDaysAgo: 39, birthday: [12, 19], priorPoints: 120, note: "Drifting — 39 days, just past the churn threshold" },
  { key: "farah", name: "Farah Zulkifli", phone: "+60172204885", weight: 0.03, joinedDaysAgo: 2, lastVisitDaysAgo: 1, birthday: [5, 26], priorPoints: 0, note: "Joined this week — a Starter, so the whole ladder is visible at once" },
];

const TIERS = [
  { min: 1000, mult: 2.0, name: "Platinum" },
  { min: 400, mult: 1.5, name: "Gold" },
  { min: 150, mult: 1.25, name: "Silver" },
  { min: 50, mult: 1.1, name: "Bronze" },
  { min: 0, mult: 1.0, name: "Starter" },
];
const tierFor = (lifetime) => TIERS.find((t) => lifetime >= t.min);

const POINTS_PER_RINGGIT = 0.15;
const dayMs = 86400000;

/**
 * Timestamps are written with an explicit +08:00 rather than built from the
 * machine's clock. The demo has to show a Malaysian cafe's morning and lunch
 * rush wherever the seed is run from; `setHours` on a laptop in another
 * timezone would slide the whole rush across the hourly chart.
 *
 * The anchor is a fixed calendar date, so re-seeding does not quietly redraw
 * the history around today.
 */
const TZ_OFFSET = "+08:00";
const ANCHOR = Date.UTC(2026, 8, 4); // 2026-09-04, read as a Kuala Lumpur date.
const pad = (n) => String(n).padStart(2, "0");

function calendarDay(daysAgo) {
  return new Date(ANCHOR - daysAgo * dayMs);
}

function isoAt(daysAgo, hour, minute) {
  const d = calendarDay(daysAgo);
  const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return `${date}T${pad(hour)}:${pad(minute)}:${pad(Math.floor(rng() * 60))}${TZ_OFFSET}`;
}

/** Malaysian cafe rhythm: weekends busier, a morning and a lunch peak. */
function ordersForDay(daysAgo) {
  const dow = calendarDay(daysAgo).getUTCDay();
  const weekend = dow === 0 || dow === 6;
  return between(weekend ? 6 : 3, weekend ? 11 : 7);
}

/**
 * Opening hours are contiguous on purpose. An hourly chart with a clean zero
 * in the middle of the day reads as generated data, not a quiet hour.
 */
function hourForOrder() {
  const r = rng();
  if (r < 0.34) return between(8, 10);
  if (r < 0.68) return between(11, 14);
  if (r < 0.92) return between(15, 17);
  return between(18, 20);
}

// --- Generate ---
const state = new Map(
  MEMBERS.map((m) => [
    m.key,
    { ...m, lifetime: m.priorPoints, balance: m.priorPoints, orders: 0, spendCents: 0 },
  ]),
);
const orders = [];

for (let daysAgo = DAYS; daysAgo >= 0; daysAgo--) {
  for (let i = 0; i < ordersForDay(daysAgo); i++) {
    const hour = hourForOrder();
    const items = basketFor(hour);
    const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);

    // Who is ordering: a member whose account already existed, or a walk-in.
    let member = null;
    if (chance(0.47)) {
      const roll = rng();
      let acc = 0;
      for (const m of MEMBERS) {
        acc += m.weight;
        if (roll <= acc) {
          const s = state.get(m.key);
          const joined = s.joinedDaysAgo >= daysAgo;
          const stillAround = daysAgo >= s.lastVisitDaysAgo;
          if (joined && stillAround) member = s;
          break;
        }
      }
    }

    const tier = member ? tierFor(member.lifetime) : null;
    const discountCents = member ? Math.round((subtotal * discountPct(tier.name)) / 100) : 0;
    const taxCents = 0;
    const total = Math.max(0, subtotal - discountCents + taxCents);

    // A handful go wrong, because a demo with a perfect ledger is not a demo.
    const status = chance(0.018) ? (chance(0.5) ? "refunded" : "cancelled") : "paid";
    const paid = status === "paid" || status === "refunded";

    let pointsEarned = 0;
    if (member && paid) {
      pointsEarned = Math.max(1, Math.round((total / 100) * POINTS_PER_RINGGIT * tier.mult));
      member.lifetime += pointsEarned;
      member.balance += pointsEarned;
      member.orders += 1;
      member.spendCents += total;
    }

    orders.push({
      createdAt: isoAt(daysAgo, hour, between(0, 59)),
      memberKey: member?.key ?? null,
      items, subtotalCents: subtotal, discountCents, taxCents, totalCents: total,
      status,
      serviceType: chance(0.28) ? "takeaway" : "dine_in",
      pointsEarned,
      refundedCents: status === "refunded" ? total : 0,
    });
  }
}

/**
 * Nobody becomes a member without paying for something first, so a member with
 * no orders is a state the real system cannot produce. The random walk above
 * can leave a low-weight newcomer with none, so they get their joining order
 * explicitly rather than appearing in the demo as an impossible row.
 */
for (const m of MEMBERS) {
  const st = state.get(m.key);
  if (st.orders > 0) continue;

  const hour = between(9, 16);
  const items = basketFor(hour);
  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const tier = tierFor(st.lifetime);
  const discountCents = Math.round((subtotal * discountPct(tier.name)) / 100);
  const total = Math.max(0, subtotal - discountCents);
  const pointsEarned = Math.max(1, Math.round((total / 100) * POINTS_PER_RINGGIT * tier.mult));

  st.lifetime += pointsEarned;
  st.balance += pointsEarned;
  st.orders += 1;
  st.spendCents += total;

  orders.push({
    createdAt: isoAt(m.lastVisitDaysAgo, hour, between(0, 59)),
    memberKey: m.key,
    items, subtotalCents: subtotal, discountCents, taxCents: 0, totalCents: total,
    status: "paid",
    serviceType: chance(0.28) ? "takeaway" : "dine_in",
    pointsEarned,
    refundedCents: 0,
  });
}

// Chronological, because the seed reads better as a story than as a shuffle.
orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

function discountPct(tierName) {
  return { Platinum: 15, Gold: 12, Silver: 8, Bronze: 5, Starter: 0 }[tierName] ?? 0;
}

// A few members spend points, so a balance is not just everything ever earned.
// Sized against what they hold, so nobody ends on a suspicious zero.
for (const key of ["aisyah", "wei", "mei", "haziq"]) {
  const st = state.get(key);
  const spend = Math.round((st.balance * between(25, 45)) / 100 / 10) * 10;
  if (spend > 0) {
    st.balance -= spend;
    st.redeemed = spend;
  }
}

// --- Emit SQL ---
const out = [];
const say = (s) => out.push(s);

say(`-- Generated by scripts/demo-seed.mjs — do not edit by hand.`);
say(`-- Deterministic: seed ${RNG_SEED}, ${DAYS} days, ${orders.length} orders.`);
say(`begin;`);
say(``);
say(`create temporary table _m on commit drop as`);
say(`  select id from merchants where slug = ${q(SLUG)};`);
say(``);
say(`do $$ begin`);
say(`  if not exists (select 1 from _m) then`);
say(`    raise exception 'No merchant with slug ${SLUG} — nothing to seed.';`);
say(`  end if;`);
say(`end $$;`);
say(``);

say(`-- Clear this tenant's trading history. Children first; every statement`);
say(`-- is fenced to demo-cafe, so no other merchant can be reached from here.`);
const demoCustomers = `select id from customers where merchant_id in (select id from _m)`;
const demoOrders = `select id from orders where merchant_id in (select id from _m)`;
say(`delete from join_tokens where order_id in (${demoOrders});`);
say(`delete from order_items where order_id in (${demoOrders});`);
say(`delete from points_ledger where customer_id in (${demoCustomers});`);
say(`delete from stamps_ledger where merchant_id in (select id from _m);`);
say(`delete from customer_stamp_cards where merchant_id in (select id from _m);`);
say(`delete from promo_redemptions where order_id in (${demoOrders});`);
say(`delete from member_feedback where merchant_id in (select id from _m);`);
say(`delete from redeem_otps where merchant_id in (select id from _m);`);
say(`delete from automation_jobs where merchant_id in (select id from _m);`);
say(`delete from campaign_events where campaign_id in (select id from campaigns where merchant_id in (select id from _m));`);
say(`delete from campaign_workflow_runs where campaign_id in (select id from campaigns where merchant_id in (select id from _m));`);
say(`delete from orders where merchant_id in (select id from _m);`);
say(`delete from customers where merchant_id in (select id from _m);`);
say(`delete from campaigns where merchant_id in (select id from _m);`);
say(``);

say(`-- Members, one per story the dashboard needs to be able to tell.`);
for (const m of MEMBERS) {
  const s = state.get(m.key);
  const usual = usualFor(m.key);
  if (m.note) say(`-- ${m.name}: ${m.note}`);
  say(
    `insert into customers (merchant_id, phone, is_member, display_name, points_balance, ` +
      `lifetime_points_earned, first_join_bonus_awarded, created_at, last_visit_at, ` +
      `marketing_opt_out, birthday_month, birthday_day, favorite_item_name, usual_order)`,
  );
  say(
    `select id, ${q(m.phone)}, true, ${q(m.name)}, ${s.balance}, ${s.lifetime}, true, ` +
      `${q(isoAt(m.joinedDaysAgo, 10, 15))}, ${q(isoAt(m.lastVisitDaysAgo, 13, 30))}, ` +
      `${m.optOut ? "true" : "false"}, ${m.birthday[0]}, ${m.birthday[1]}, ` +
      `${q(usual[0]?.name ?? null)}, ${q(JSON.stringify(usual))}::jsonb from _m;`,
  );
}
say(``);

// Walk-ins: real cafes have unnamed regulars whose phone was never captured.
say(`-- Walk-ins. A cafe's order history is mostly people it does not know yet.`);
say(`insert into customers (merchant_id, phone, is_member, points_balance, lifetime_points_earned, created_at)`);
say(`select id, null, false, 0, 0, ${q(isoAt(DAYS, 9, 0))} from _m;`);
say(``);

say(`-- ${orders.length} orders across ${DAYS} days.`);
for (const [idx, o] of orders.entries()) {
  const ref = `demo-${String(idx + 1).padStart(4, "0")}`;
  const cust = o.memberKey
    ? `(select id from customers where merchant_id in (select id from _m) and phone = ${q(MEMBERS.find((m) => m.key === o.memberKey).phone)})`
    : `null`;
  const paidAt = o.status === "paid" || o.status === "refunded" ? q(o.createdAt) : "null";
  say(
    `insert into orders (merchant_id, venue_table_id, customer_id, status, subtotal_cents, ` +
      `discount_cents, tax_cents, service_charge_cents, total_cents, payment_ref, payment_provider, ` +
      `paid_at, created_at, kitchen_status, service_type, points_redeemed, refunded_cents, refunded_at)`,
  );
  say(
    `select m.id, (select id from venue_tables where merchant_id = m.id order by table_number limit 1), ` +
      `${cust}, ${q(o.status)}, ${o.subtotalCents}, ${o.discountCents}, ${o.taxCents}, 0, ${o.totalCents}, ` +
      `${q(ref)}, 'chip', ${paidAt}, ${q(o.createdAt)}, ` +
      `${o.status === "paid" ? q("served") : "null"}, ${q(o.serviceType)}, 0, ${o.refundedCents}, ` +
      `${o.status === "refunded" ? q(o.createdAt) : "null"} from _m m;`,
  );
  for (const it of o.items) {
    say(
      `insert into order_items (order_id, menu_item_id, name, quantity, unit_price_cents)` +
        ` select o.id, mi.id, mi.name, ${it.qty}, ${it.price}` +
        ` from orders o join menu_items mi on mi.merchant_id = o.merchant_id and mi.slug = ${q(it.slug)}` +
        ` where o.payment_ref = ${q(ref)};`,
    );
  }
  if (o.pointsEarned > 0) {
    say(
      `insert into points_ledger (customer_id, order_id, delta, reason, created_at)` +
        ` select o.customer_id, o.id, ${o.pointsEarned}, 'order_paid', ${q(o.createdAt)}` +
        ` from orders o where o.payment_ref = ${q(ref)} and o.customer_id is not null;`,
    );
  }
}
say(``);

say(`-- Opening balances, so the ledger reconciles with the lifetime total`);
say(`-- rather than the member page showing points that came from nowhere.`);
for (const m of MEMBERS) {
  if (!m.priorPoints) continue;
  say(
    `insert into points_ledger (customer_id, order_id, delta, reason, created_at)` +
      ` select id, null, ${m.priorPoints}, 'opening_balance', ${q(isoAt(m.joinedDaysAgo, 10, 20))}` +
      ` from customers where merchant_id in (select id from _m) and phone = ${q(m.phone)};`,
  );
}
say(``);

say(`-- Points spent.`);
for (const key of ["aisyah", "wei", "mei", "haziq"]) {
  const s = state.get(key);
  if (!s.redeemed) continue;
  const m = MEMBERS.find((x) => x.key === key);
  say(
    `insert into points_ledger (customer_id, order_id, delta, reason, created_at)` +
      ` select id, null, ${-s.redeemed}, 'points_redeemed', ${q(isoAt(s.lastVisitDaysAgo, 14, 5))}` +
      ` from customers where merchant_id in (select id from _m) and phone = ${q(m.phone)};`,
  );
}
say(``);

say(`-- Stamp cards mid-collection. An empty card demos nothing; a full one`);
say(`-- has already been claimed. Partial progress is what a diner actually sees.`);
const STAMPS = { aisyah: [4, 3], wei: [2, 2], priya: [5, 1], haziq: [1, 1], mei: [3, 0] };
for (const [key, [collected, completed]] of Object.entries(STAMPS)) {
  const m = MEMBERS.find((x) => x.key === key);
  say(
    `insert into customer_stamp_cards (merchant_id, customer_id, stamps_collected, cards_completed, pending_reward, updated_at)` +
      ` select c.merchant_id, c.id, ${collected}, ${completed}, ${key === "priya" ? "true" : "false"}, now()` +
      ` from customers c where c.merchant_id in (select id from _m) and c.phone = ${q(m.phone)};`,
  );
}
say(``);

say(`-- The smoke tests leave the stamp reward named after themselves.`);
say(`update stamp_programs set reward_label = 'Free coffee on us'`);
say(` where merchant_id in (select id from _m);`);
say(``);

say(`-- Campaigns a cafe owner would recognise, replacing the test residue.`);
const CAMPAIGNS = [
  ["Weekend latte boost", "whatsapp", "active", 312, 0.18, "Weekend treat: RM3 off any latte, today and tomorrow only."],
  ["Win back · quiet 30 days", "whatsapp", "active", 41, 0.11, "We miss you! Here is RM5 off your next visit."],
  ["Birthday drink on us", "whatsapp", "active", 18, 0.44, "Happy birthday! Your free birthday drink is waiting."],
  ["New member welcome", "auto", "active", 156, 0.42, "Welcome to iRewards! You have earned 100 points to start."],
  ["Rainy day pastry pairing", "banner", "paused", 88, 0.09, "Any hot coffee + pastry for RM18 while it pours."],
];
for (const [name, channel, status, reach, conv, body] of CAMPAIGNS) {
  say(
    `insert into campaigns (merchant_id, name, channel, status, reach_count, conversion_rate, message_body, created_at)` +
      ` select id, ${q(name)}, ${q(channel)}, ${q(status)}, ${reach}, ${conv}, ${q(body)}, ${q(isoAt(between(20, 70), 11, 0))} from _m;`,
  );
}
say(``);

say(`-- Automated sending looks alive, so the dashboard is not shouting about`);
say(`-- a stopped cron during a demo.`);
say(`insert into system_heartbeats (task, last_run_at, last_result, updated_at)`);
say(`values ('automation_cron', now(), '{"seeded": true}'::jsonb, now())`);
say(`on conflict (task) do update set last_run_at = excluded.last_run_at, updated_at = excluded.updated_at;`);
say(``);
say(`commit;`);

function usualFor(key) {
  const usual = {
    aisyah: [["Velvet Flat White", 1]],
    wei: [["Traditional Hainanese Kopi O", 1], ["Double-Baked Almond Croissant Au Beurre", 1]],
    priya: [["Specialty V60 Pour Over", 1]],
    haziq: [["Signature Penang Duck Egg Char Kway Teow", 1]],
    mei: [["Chamomile Blossom Tea", 1]],
    daniel: [["Caffe Americano", 1]],
    nurul: [["Iced Meyer Lemon Ceylon Tea", 1]],
    arjun: [["Cafe Latte", 1]],
    sofia: [["Spanish Latte", 1]],
    farah: [["Smoked Madagascar Vanilla Cold Foam Einspänner", 1]],
  }[key] ?? [];
  return usual.map(([name, quantity]) => ({ name, quantity }));
}

process.stdout.write(out.join("\n") + "\n");
