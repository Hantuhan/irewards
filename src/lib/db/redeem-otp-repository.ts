import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { adminDb } from "@/lib/db/admin";

export type RedeemOtpRow = {
  id: string;
  merchant_id: string;
  customer_id: string;
  phone: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_REQUESTS_PER_HOUR = 5;

function otpPepper() {
  const value =
    process.env.MEMBER_SESSION_SECRET ??
    process.env.MERCHANT_SESSION_SECRET ??
    (process.env.NODE_ENV === "production" ? "" : "irewards-dev-member-session");
  if (!value) {
    throw new Error("MEMBER_SESSION_SECRET (or MERCHANT_SESSION_SECRET) is required in production");
  }
  return `${value}:redeem-otp`;
}

export function hashRedeemOtpCode(code: string): string {
  return createHmac("sha256", otpPepper()).update(code.trim()).digest("hex");
}

export function generateRedeemOtpCode(): string {
  return String(randomInt(0, 10_000)).padStart(4, "0");
}

function codesEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export async function countRecentRedeemOtps(
  customerId: string,
  sinceIso: string,
): Promise<number> {
  const { count, error } = await adminDb()
    .from("redeem_otps")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .gte("created_at", sinceIso);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function createRedeemOtp(input: {
  merchantId: string;
  customerId: string;
  phone: string;
  code: string;
}): Promise<RedeemOtpRow> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = await countRecentRedeemOtps(input.customerId, since);
  if (recent >= MAX_REQUESTS_PER_HOUR) {
    throw new Error("Too many verification codes requested. Try again later.");
  }

  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  const { data, error } = await adminDb()
    .from("redeem_otps")
    .insert([
      {
        merchant_id: input.merchantId,
        customer_id: input.customerId,
        phone: input.phone,
        code_hash: hashRedeemOtpCode(input.code),
        expires_at: expiresAt,
      },
    ])
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as RedeemOtpRow;
}

export async function getLatestOpenRedeemOtp(
  customerId: string,
): Promise<RedeemOtpRow | null> {
  const { data, error } = await adminDb()
    .from("redeem_otps")
    .select("*")
    .eq("customer_id", customerId)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as RedeemOtpRow | null;
}

export async function verifyAndConsumeRedeemOtp(input: {
  customerId: string;
  code: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await getLatestOpenRedeemOtp(input.customerId);
  if (!row) {
    return { ok: false, error: "No verification code found. Request a new one." };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "That code expired. Request a new one." };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many attempts. Request a new code." };
  }

  const match = codesEqual(row.code_hash, hashRedeemOtpCode(input.code));
  if (!match) {
    await adminDb()
      .from("redeem_otps")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);
    return { ok: false, error: "Incorrect code. Try again." };
  }

  const { data, error } = await adminDb()
    .from("redeem_otps")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    return { ok: false, error: "That code was already used. Request a new one." };
  }
  return { ok: true };
}

export { OTP_TTL_MS, MAX_ATTEMPTS, MAX_REQUESTS_PER_HOUR };
