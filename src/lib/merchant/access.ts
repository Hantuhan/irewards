import { getMerchantBySlug } from "@/lib/db/repository";
import { verifyMerchantAdmin } from "@/lib/merchant/auth";
import { getSessionFromRequest } from "@/lib/merchant/session";

export type MerchantRole = "owner" | "manager" | "staff";

/** Higher wins. Staff is the floor: signed in, day-to-day work only. */
const ROLE_RANK: Record<MerchantRole, number> = { staff: 1, manager: 2, owner: 3 };

/**
 * Merchant dashboard/API gate. Rejects suspended tenants even with a valid session.
 */
export async function verifyMerchantAccess(
  request: Request,
  merchantSlug: string,
): Promise<boolean> {
  const session = getSessionFromRequest(request);
  if (session?.merchantSlug === merchantSlug) {
    try {
      const merchant = await getMerchantBySlug(merchantSlug);
      if (!merchant || merchant.suspended_at) return false;
      return true;
    } catch {
      return false;
    }
  }
  // Opt-in only. This used to switch itself on whenever MERCHANT_SESSION_SECRET
  // was unset, which is the default local setup — so every dashboard route ran
  // with authorization disabled, no smoke test ever exercised the access rules,
  // and anyone pointing a NODE_ENV=development process at real data could read
  // every tenant. It now needs the same explicit flag the admin bypass uses.
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_INSECURE_MERCHANT_ACCESS === "true"
  ) {
    return true;
  }
  return verifyMerchantAdmin(request);
}

/**
 * Access plus a minimum role.
 *
 * `verifyMerchantAccess` only asks "is this your store?", so before this a
 * counter staff account could change the loyalty earn rate, the tax settings
 * or mint a discount code — anything the owner could, bar team management,
 * which had its own check.
 *
 * Reads and day-to-day work are unchanged; this guards the settings that cost
 * money if they move.
 */
export async function verifyMerchantRole(
  request: Request,
  merchantSlug: string,
  minRole: MerchantRole,
): Promise<boolean> {
  if (!(await verifyMerchantAccess(request, merchantSlug))) return false;

  const session = getSessionFromRequest(request);
  // No session means access came from the platform-admin header, which is
  // deliberately above the role system.
  if (!session) return true;

  return ROLE_RANK[session.role] >= ROLE_RANK[minRole];
}

/** Message for a 403 when the role is too low. */
export function roleDeniedMessage(minRole: MerchantRole): string {
  return minRole === "owner"
    ? "Only the account owner can change this. Ask whoever set up the store."
    : "You need manager access to change this. Ask the owner or a manager.";
}
