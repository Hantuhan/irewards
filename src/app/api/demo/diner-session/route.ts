import { NextResponse } from "next/server";
import { z } from "zod";
import {
  awardPointsToCustomer,
  createMemberCustomer,
  getCustomerByPhone,
  getMerchantBySlug,
  updateCustomer,
} from "@/lib/db/repository";
import { listMenuItems } from "@/lib/db/merchant-repository";
import {
  clearMemberSessionCookieHeader,
  createMemberSessionToken,
  memberSessionCookieHeader,
} from "@/lib/customer/session";
import { clearRedeemAuthCookieHeader } from "@/lib/customer/redeem-session";

const DEMO_PHONE = "+601700000001";
const DEMO_NAME = "Alex";

const schema = z.object({
  mode: z.enum(["guest", "member"]),
  merchantSlug: z.string().min(1).default("demo-cafe"),
});

/**
 * Development-only: simulate diner guest vs returning member on the storefront.
 * Never available when NODE_ENV === "production".
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  try {
    const body = schema.parse(await request.json());
    const merchant = await getMerchantBySlug(body.merchantSlug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    if (body.mode === "guest") {
      const res = NextResponse.json({ ok: true, mode: "guest", member: null });
      res.headers.append("Set-Cookie", clearMemberSessionCookieHeader());
      res.headers.append("Set-Cookie", clearRedeemAuthCookieHeader());
      return res;
    }

    let customer = await getCustomerByPhone(merchant.id, DEMO_PHONE);
    if (!customer?.is_member) {
      if (customer) {
        customer = await updateCustomer(customer.id, {
          is_member: true,
          display_name: DEMO_NAME,
        });
      } else {
        customer = await createMemberCustomer({
          merchantId: merchant.id,
          phone: DEMO_PHONE,
          displayName: DEMO_NAME,
        });
      }
    } else if (!customer.display_name) {
      customer = await updateCustomer(customer.id, { display_name: DEMO_NAME });
    }

    if (customer.points_balance < 100) {
      customer = await awardPointsToCustomer({
        customer,
        orderId: null,
        points: Math.max(100, 1450 - customer.points_balance),
        reason: "demo_sim_seed",
      });
    }

    if (!customer.usual_order || customer.usual_order.length === 0) {
      try {
        const items = await listMenuItems(merchant.id);
        const picks = items.slice(0, 2);
        if (picks.length > 0) {
          customer = await updateCustomer(customer.id, {
            usual_order: picks.map((i) => ({ name: i.name, quantity: 1 })),
            favorite_item_name: picks[0]?.name ?? null,
          });
        }
      } catch {
        /* menu optional for sim */
      }
    }

    const token = createMemberSessionToken({
      customerId: customer.id,
      merchantId: merchant.id,
      merchantSlug: merchant.slug,
    });

    const res = NextResponse.json({
      ok: true,
      mode: "member",
      member: {
        id: customer.id,
        displayName: customer.display_name,
        points: customer.points_balance,
        phone: customer.phone,
      },
    });
    res.headers.append("Set-Cookie", memberSessionCookieHeader(token));
    res.headers.append("Set-Cookie", clearRedeemAuthCookieHeader());
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Demo session failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    modes: ["guest", "member"],
    demoPhone: DEMO_PHONE,
    demoName: DEMO_NAME,
  });
}
