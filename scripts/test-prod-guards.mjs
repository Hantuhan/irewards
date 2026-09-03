#!/usr/bin/env node
/**
 * Production safety guards.
 *
 * Each of these is a single environment variable away from costing real money
 * or leaking real data, and each is currently also covered by a manual
 * checklist step. This asserts the code refuses on its own.
 * Run: npm run test:guards
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "irewards-guards-"));
execFileSync(
  "npx",
  [
    "tsc",
    "src/lib/payments/hitpay.ts",
    "--outDir",
    outDir,
    "--module",
    "es2022",
    "--target",
    "es2022",
    "--moduleResolution",
    "bundler",
    "--skipLibCheck",
  ],
  { stdio: "inherit" },
);
const mod = path.join(outDir, "hitpay.js");

let failed = 0;
const check = (label, ok) => {
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
};

/** Re-import with a given environment, defeating the module cache. */
async function withEnv(env, fn) {
  const previous = {};
  for (const [k, v] of Object.entries(env)) {
    previous[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    const fresh = await import(`${mod}?t=${Math.random()}`);
    return await fn(fresh);
  } finally {
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

// Fake payments accept unsigned webhooks and expose an unauthenticated
// "mark this order paid" endpoint. Production must refuse, whatever is set.
await withEnv({ PAYMENT_PROVIDER: "dev", NODE_ENV: "production" }, (m) => {
  check("dev payments refused in production", m.isDevPaymentMode() === false);
});

await withEnv({ PAYMENT_PROVIDER: "dev", NODE_ENV: "development" }, (m) => {
  check("dev payments allowed in development", m.isDevPaymentMode() === true);
});

await withEnv({ PAYMENT_PROVIDER: "hitpay", NODE_ENV: "development" }, (m) => {
  check("real provider is never dev mode", m.isDevPaymentMode() === false);
});

await withEnv({ PAYMENT_PROVIDER: undefined, NODE_ENV: "production" }, (m) => {
  check("unset provider is not dev mode", m.isDevPaymentMode() === false);
});

// Webhook signatures must fail closed when the salt is missing, never open.
await withEnv({ PAYMENT_SALT: undefined }, (m) => {
  check("no salt rejects a signature", m.verifyHitPaySignature("{}", "anything") === false);
});

await withEnv({ PAYMENT_SALT: "test-salt" }, async (m) => {
  const { createHmac } = await import("node:crypto");
  const body = JSON.stringify({ reference_number: "order-1", status: "completed" });
  const good = createHmac("sha256", "test-salt").update(body).digest("hex");
  check("valid signature accepted", m.verifyHitPaySignature(body, good) === true);
  check("wrong signature rejected", m.verifyHitPaySignature(body, "0".repeat(64)) === false);
  check("null signature rejected", m.verifyHitPaySignature(body, null) === false);
  check("tampered body rejected", m.verifyHitPaySignature(body + " ", good) === false);
});

fs.rmSync(outDir, { recursive: true, force: true });

if (failed > 0) {
  console.error(`\n${failed} production guard checks failed`);
  process.exit(1);
}
console.log("production guards: all checks passed");
