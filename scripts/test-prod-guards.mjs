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
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// realpath matters: on macOS os.tmpdir() is a symlink, and require.cache is
// keyed by the resolved path, so the un-resolved prefix would match nothing
// and modules would silently keep state between environments.
const outDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "irewards-guards-")));

// The payments modules import each other, so the whole directory is compiled
// rather than one file. CommonJS output keeps the relative requires resolvable
// by Node, and lets a module be re-evaluated under a different environment by
// dropping it from the require cache.
execFileSync(
  "npx",
  [
    "tsc",
    ...fs
      .readdirSync("src/lib/payments")
      .filter((f) => f.endsWith(".ts"))
      .map((f) => path.join("src/lib/payments", f)),
    "--outDir",
    outDir,
    "--module",
    "commonjs",
    "--target",
    "es2022",
    "--moduleResolution",
    "node",
    "--skipLibCheck",
  ],
  { stdio: "inherit" },
);

const require = createRequire(import.meta.url);

/**
 * Silences expected noise: the negative signature tests deliberately drive the
 * code down paths that log, and a passing run should not look like a failing
 * one.
 */
async function quietly(fn) {
  const original = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = original;
  }
}

let failed = 0;
const check = (label, ok) => {
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
};

/** Re-require with a given environment, defeating the module cache. */
async function withEnv(moduleName, env, fn) {
  const previous = {};
  for (const [k, v] of Object.entries(env)) {
    previous[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(outDir)) delete require.cache[key];
  }
  try {
    return await fn(require(path.join(outDir, moduleName)));
  } finally {
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

// Fake payments accept unsigned webhooks and expose an unauthenticated
// "mark this order paid" endpoint. Production must refuse, whatever is set.
await withEnv("mode.js", { PAYMENT_PROVIDER: "dev", NODE_ENV: "production" }, (m) =>
  quietly(() => check("dev payments refused in production", m.isDevPaymentMode() === false)),
);

await withEnv("mode.js", { PAYMENT_PROVIDER: "dev", NODE_ENV: "development" }, (m) => {
  check("dev payments allowed in development", m.isDevPaymentMode() === true);
});

await withEnv("mode.js", { PAYMENT_PROVIDER: "chip", NODE_ENV: "development" }, (m) => {
  check("real provider is never dev mode", m.isDevPaymentMode() === false);
});

await withEnv("mode.js", { PAYMENT_PROVIDER: undefined, NODE_ENV: "production" }, (m) => {
  check("unset provider is not dev mode", m.isDevPaymentMode() === false);
});

// HitPay webhook signatures must fail closed when the salt is missing.
await withEnv("hitpay.js", { PAYMENT_SALT: undefined }, (m) => {
  check("no salt rejects a signature", m.verifyHitPaySignature("{}", "anything") === false);
});

await withEnv("hitpay.js", { PAYMENT_SALT: "test-salt" }, async (m) => {
  const { createHmac } = await import("node:crypto");
  const body = JSON.stringify({ reference_number: "order-1", status: "completed" });
  const good = createHmac("sha256", "test-salt").update(body).digest("hex");
  check("valid signature accepted", m.verifyHitPaySignature(body, good) === true);
  check("wrong signature rejected", m.verifyHitPaySignature(body, "0".repeat(64)) === false);
  check("null signature rejected", m.verifyHitPaySignature(body, null) === false);
  check("tampered body rejected", m.verifyHitPaySignature(body + " ", good) === false);
});

// CHIP signs callbacks with RSA rather than a shared secret, so the failure
// modes are different ones: an unreachable key endpoint, a key that is not a
// key, a signature over a body that has since been edited. Every one of them
// has to end in a rejected payment, not an accepted one.
const { generateKeyPairSync, createSign } = await import("node:crypto");
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();

const chipBody = JSON.stringify({
  id: "purchase-1",
  reference: "order-1",
  status: "paid",
  event_type: "purchase.paid",
  purchase: { total: 2500, currency: "MYR" },
});

function signChip(body) {
  const signer = createSign("sha256");
  signer.update(body);
  signer.end();
  return signer.sign(privateKey).toString("base64");
}

/** Serves the public key the way CHIP does: a JSON-encoded PEM string. */
function stubKeyEndpoint(response) {
  globalThis.fetch = async () => response;
}

const chipEnv = { PAYMENT_API_KEY: "test-key", CHIP_BRAND_ID: "brand-1" };

await withEnv("chip.js", chipEnv, async (m) => {
  stubKeyEndpoint({ ok: true, json: async () => publicPem });
  const good = signChip(chipBody);

  check("chip valid signature accepted", (await m.verifyChipSignature(chipBody, good)) === true);

  await quietly(async () => {
    check(
      "chip tampered body rejected",
      (await m.verifyChipSignature(chipBody.replace("2500", "1"), good)) === false,
    );

    check("chip null signature rejected", (await m.verifyChipSignature(chipBody, null)) === false);

    check(
      "chip garbage signature rejected",
      (await m.verifyChipSignature(chipBody, Buffer.from("nope").toString("base64"))) === false,
    );
  });
});

// A key that cannot be fetched must not become a free pass.
await withEnv("chip.js", chipEnv, async (m) => {
  stubKeyEndpoint({ ok: false, status: 503, json: async () => ({}) });
  await quietly(async () =>
    check(
      "chip unreachable key endpoint rejects",
      (await m.verifyChipSignature(chipBody, signChip(chipBody))) === false,
    ),
  );
});

await withEnv("chip.js", chipEnv, async (m) => {
  stubKeyEndpoint({ ok: true, json: async () => ({ key: publicPem }) });
  await quietly(async () =>
    check(
      "chip malformed key response rejects",
      (await m.verifyChipSignature(chipBody, signChip(chipBody))) === false,
    ),
  );
});

// The shared webhook route must not accept an unsigned body once a real
// provider is configured — the whole point of leaving dev mode.
await withEnv(
  "webhook.js",
  { ...chipEnv, PAYMENT_PROVIDER: "chip", NODE_ENV: "production" },
  async (m) => {
    stubKeyEndpoint({ ok: true, json: async () => publicPem });

    await quietly(async () => {
      check(
        "unsigned webhook rejected in production",
        (await m.verifyAndParseWebhook(chipBody, new Headers())) === null,
      );

      const forged = new Headers({ "x-signature": Buffer.from("forged").toString("base64") });
      check(
        "forged chip signature rejected",
        (await m.verifyAndParseWebhook(chipBody, forged)) === null,
      );
    });

    const signed = new Headers({ "x-signature": signChip(chipBody) });
    const verified = await m.verifyAndParseWebhook(chipBody, signed);
    check("signed chip webhook accepted", verified?.provider === "chip");
    check("signed chip webhook maps to the order", verified?.payload.orderId === "order-1");
    check("signed chip webhook reads the total", verified?.payload.amountCents === 2500);
  },
);

fs.rmSync(outDir, { recursive: true, force: true });

if (failed > 0) {
  console.error(`\n${failed} production guard checks failed`);
  process.exit(1);
}
console.log("production guards: all checks passed");
