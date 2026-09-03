#!/usr/bin/env node
/**
 * Kitchen allergen detection cases.
 *
 * Safety-critical and easy to break by tweaking a regex, so the patterns are
 * read out of the real source rather than copied here. Needs no server.
 * Run: npm run test:alerts
 */
import fs from "node:fs";
const src = fs.readFileSync("src/lib/kitchen/alerts.ts", "utf8");

function grab(name) {
  const body = src.split("const " + name + ": RegExp[] = [")[1].split("\n];")[0];
  const out = [];
  for (let line of body.split("\n")) {
    line = line.trim();
    if (!line.startsWith("/") || line.startsWith("//")) continue;
    line = line.replace(/,$/, "");
    const end = line.lastIndexOf("/");
    out.push(new RegExp(line.slice(1, end), line.slice(end + 1)));
  }
  return out;
}

const A = grab("ALLERGY_PATTERNS");
const D = grab("DIET_PATTERNS");
console.log(`loaded ${A.length} allergy + ${D.length} diet patterns`);
const cls = (t) => (A.some((r) => r.test(t)) ? "ALLERGY" : D.some((r) => r.test(t)) ? "DIET" : "none");

const cases = [
  ["Severe peanut allergy - separate utensils", "ALLERGY"],
  ["no nuts anywhere", "ALLERGY"],
  ["Gluten-Free Seeded Sourdough", "ALLERGY"],
  ["coeliac, please use a clean board", "ALLERGY"],
  ["lactose intolerant", "ALLERGY"],
  ["dairy free please", "ALLERGY"],
  ["I have an EpiPen", "ALLERGY"],
  ["No Egg (Strict Vegan Prep)", "ALLERGY"],
  ["Halal Prep Style", "DIET"],
  ["Halal prep only, no pork lard", "DIET"],
  ["Vegetarian Prep (No Animal Rennet)", "DIET"],
  ["No Bean Sprouts (Taugeh)", "none"],
  ["Extra Toasted Crunchy Sliced Almonds", "none"],
  ["Double-Baked Almond Croissant Au Beurre", "none"],
  ["Crispy Pork Lard Cracklings", "none"],
  ["Dressing on the side", "none"],
  ["Extra hot, oat foam on top", "none"],
  ["Fresh Farm Whole Milk", "none"],
  ["Extra Blood Cockles (Kerang)", "none"],
];

let bad = 0;
for (const [text, want] of cases) {
  const got = cls(text);
  const ok = got === want;
  if (!ok) bad++;
  console.log(`${ok ? "  ok  " : "  FAIL"} ${got.padEnd(7)} (want ${want.padEnd(7)}) ${text}`);
}
console.log(bad ? `${bad} FAILURES` : `all ${cases.length} cases pass`);
if (bad) process.exit(1);
