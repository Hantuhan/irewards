#!/usr/bin/env node
/**
 * WhatsApp token encryption round-trip.
 *
 * These ciphertexts hold tokens that can send messages billed to a merchant's
 * own Meta account, so the real module is compiled and exercised rather than
 * approximated.
 * Run: npm run test:crypto
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.WHATSAPP_TOKEN_KEY ||= "test-key-for-round-trip";

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "irewards-crypto-"));
execFileSync(
  "npx",
  [
    "tsc",
    "src/lib/meta/token-crypto.ts",
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
const { encryptToken, decryptToken } = await import(path.join(outDir, "token-crypto.js"));

let failed = 0;
const check = (label, ok) => {
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
};

const secrets = [
  "EAAB" + "x".repeat(200),
  "short",
  "unicode-café-日本語-token",
  "a".repeat(4096),
];

for (const secret of secrets) {
  const cipher = encryptToken(secret);
  check(`round-trips (${secret.slice(0, 12)}…)`, decryptToken(cipher) === secret);
  check(`ciphertext is not the plaintext (${secret.slice(0, 12)}…)`, !cipher.includes(secret));
}

// A fresh IV per call: the same token must never encrypt to the same bytes.
const a = encryptToken("same-token");
const b = encryptToken("same-token");
check("same plaintext yields different ciphertext", a !== b);
check("both still decrypt", decryptToken(a) === "same-token" && decryptToken(b) === "same-token");

// Tampering must fail closed, not return garbage.
const [iv, data, tag] = a.split(".");
const flipped = data.slice(0, -2) + (data.slice(-2) === "AA" ? "AB" : "AA");
check("tampered ciphertext rejected", decryptToken([iv, flipped, tag].join(".")) === null);
check("truncated value rejected", decryptToken("not-a-cipher") === null);
check("empty value rejected", decryptToken("") === null);

fs.rmSync(outDir, { recursive: true, force: true });

if (failed > 0) {
  console.error(`\n${failed} token-crypto checks failed`);
  process.exit(1);
}
console.log("token-crypto: all checks passed");
