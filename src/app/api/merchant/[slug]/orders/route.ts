import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  listMerchantOrders,
  updateOrderKitchenStatus,
} from "@/lib/db/merchant-repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";
import type { KitchenStatus } from "@/lib/db/types";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!verifyMerchantAccess(request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const kitchen = url.searchParams.get("kitchen") as KitchenStatus | "active" | null;

    const orders = await listMerchantOrders(
      merchant.id,
      kitchen ?? undefined,
    );

    return NextResponse.json({
      orders: orders.map((order) => ({
        id: order.id,
        tableNumber: order.table_number,
        customerDisplay: order.customer_display,
        kitchenStatus: order.kitchen_status,
        paidAt: order.paid_at,
        totalCents: order.total_cents,
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
        })),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load orders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const patchSchema = z.object({
  orderId: z.string().uuid(),
  kitchenStatus: z.enum(["new", "preparing", "ready", "served"]),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!verifyMerchantAccess(request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = patchSchema.parse(await request.json());
    const order = await updateOrderKitchenStatus(
      merchant.id,
      body.orderId,
      body.kitchenStatus,
    );

    return NextResponse.json({
      id: order.id,
      kitchenStatus: order.kitchen_status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
