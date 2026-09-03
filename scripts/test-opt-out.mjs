#!/usr/bin/env node
/**
 * Opt-out recognition cases.
 *
 * Missing an opt-out means we keep messaging someone who asked us to stop,
 * they block the number, and Meta's quality rating falls — so the real module
 * is compiled and exercised here rather than approximated.
 * Run: npm run test:optout
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "irewards-optout-"));
execFileSync(
  "npx",
  [
    "tsc",
    "src/lib/whatsapp/opt-out.ts",
    "--outDir",
    outDir,
    "--module",
    "es2022",
    "--target",
    "es2022",
    // The module has no imports; the app's ambient @types are irrelevant here.
    "--skipLibCheck",
  ],
  { stdio: "inherit" },
);
const { isOptOutMessage } = await import(path.join(outDir, "opt-out.js"));

/** [message, should opt the member out] */
const cases = [
  // Plain STOP, however it is typed.
  ["STOP", true],
  ["stop", true],
  ["Stop.", true],
  ["STOP!!", true],
  ["  stop  ", true],
  // Meta's opt-out button arrives as its label, not as "STOP".
  ["Stop promotions", true],
  ["Stop Promotions", true],
  ["Stop promo", true],
  // What people actually type.
  ["unsubscribe", true],
  ["Unsubscribe please", true],
  ["opt out", true],
  ["remove me", true],
  ["stop sending me messages", true],
  // Malay.
  ["BERHENTI", true],
  ["berhenti.", true],
  ["jangan hantar", true],
  // Chinese.
  ["退订", true],
  ["取消订阅", true],
  // Not opt-outs: the join flow and normal conversation must still work.
  ["JOIN-ABC123", false],
  ["5", false],
  ["Hi, are you open today?", false],
  ["", false],
  ["   ", false],
  ["Please don't stop making the kaya toast, it is the best in town", false],
  ["I could not stop thinking about your coffee all week honestly", false],
];

let failed = 0;
for (const [text, expected] of cases) {
  const actual = isOptOutMessage(text);
  if (actual !== expected) {
    failed += 1;
    console.error(`FAIL ${JSON.stringify(text)} → ${actual}, expected ${expected}`);
  }
}

fs.rmSync(outDir, { recursive: true, force: true });

if (failed > 0) {
  console.error(`\n${failed} of ${cases.length} opt-out cases failed`);
  process.exit(1);
}
console.log(`opt-out: ${cases.length} cases passed`);
