import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  createMerchantUser,
  listMerchantUsers,
  setMerchantUserActive,
} from "@/lib/db/merchant-repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";
import { hashPassword, assertPasswordStrength } from "@/lib/merchant/password";
import { getSessionFromRequest } from "@/lib/merchant/session";
import { MAX_MERCHANT_USERS, merchantUserSeats } from "@/lib/merchant/team-limits";

type RouteContext = { params: Promise<{ slug: string }> };

function canManageTeam(role: string | undefined): boolean {
  return role === "owner" || role === "manager";
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const users = await listMerchantUsers(merchant.id);
    const seats = merchantUserSeats(users);
    return NextResponse.json({
      subdomain: merchant.subdomain ?? merchant.slug,
      limit: seats.limit,
      used: seats.used,
      remaining: seats.remaining,
      members: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role ?? "owner",
        active: u.active !== false,
        lastLoginAt: u.last_login_at ?? null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load team";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const inviteSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  name: z.string().trim().min(1).max(80),
  role: z.enum(["manager", "staff"]),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const session = getSessionFromRequest(request);
    if (!canManageTeam(session?.role)) {
      return NextResponse.json({ error: "Only owners and managers can invite staff" }, { status: 403 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const existing = await listMerchantUsers(merchant.id);
    const seats = merchantUserSeats(existing);
    if (seats.remaining <= 0) {
      return NextResponse.json(
        {
          error: `This cafe already has ${MAX_MERCHANT_USERS} users. Deactivate someone to add another.`,
        },
        { status: 400 },
      );
    }

    const body = inviteSchema.parse(await request.json());
    assertPasswordStrength(body.password);
    const user = await createMerchantUser({
      merchantId: merchant.id,
      email: body.email,
      passwordHash: hashPassword(body.password),
      name: body.name,
      role: body.role,
    });

    return NextResponse.json({
      member: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role ?? body.role,
        active: true,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to invite staff";
    const status =
      message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("unique")
        ? 409
        : message.toLowerCase().includes("already has")
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

const patchSchema = z.object({
  userId: z.string().uuid(),
  active: z.boolean(),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const session = getSessionFromRequest(request);
    if (!canManageTeam(session?.role)) {
      return NextResponse.json({ error: "Only owners and managers can update staff" }, { status: 403 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = patchSchema.parse(await request.json());
    if (session?.userId && body.userId === session.userId && body.active === false) {
      return NextResponse.json({ error: "You cannot deactivate yourself" }, { status: 400 });
    }

    await setMerchantUserActive(merchant.id, body.userId, body.active);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update staff";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
