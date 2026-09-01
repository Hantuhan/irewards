import { NextResponse } from "next/server";
import {
  getActiveJoinTokenForOrder,
  getCustomerById,
  getOrderById,
} from "@/lib/db/repository";
import { buildWhatsAppJoinUrl } from "@/lib/loyalty/join-token";
import { createInsforgeAdmin } from "@/lib/insforge/client";
import { getCustomerTierForMerchant } from "@/lib/services/loyalty-points";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orderId } = await context.params;
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const admin = createInsforgeAdmin();
    const { data: merchant } = await admin.database
      .from("merchants")
      .select("slug, name, whatsapp_number, currency")
      .eq("id", order.merchant_id)
      .single();

    let tableNumber: string | null = null;
    if (order.venue_table_id) {
      const { data: table } = await admin.database
        .from("venue_tables")
        .select("table_number")
        .eq("id", order.venue_table_id)
        .single();
      tableNumber = (table as { table_number: string } | null)?.table_number ?? null;
    }

    const joinToken =
      order.status === "paid" ? await getActiveJoinTokenForOrder(order.id) : null;

    const whatsappJoinUrl =
      joinToken && merchant?.whatsapp_number
        ? buildWhatsAppJoinUrl(merchant.whatsapp_number, joinToken)
        : null;

    let tier = null;
    if (order.customer_id) {
      const customer = await getCustomerById(order.customer_id);
      if (customer?.is_member) {
        const snapshot = await getCustomerTierForMerchant(customer, order.merchant_id);
        tier = {
          levelNumber: snapshot.current.level_number,
          name: snapshot.current.name,
          perkDescription: snapshot.current.perk_description,
          pointsMultiplier: Number(snapshot.current.points_multiplier),
          discountPercent: Number(snapshot.current.discount_percent),
          lifetimePointsEarned: snapshot.lifetimePointsEarned,
          pointsToNextLevel: snapshot.pointsToNextLevel,
          nextLevelName: snapshot.next?.name ?? null,
        };
      }
    }

    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        subtotalCents: order.subtotal_cents,
        discountCents: order.discount_cents,
        totalCents: order.total_cents,
        paidAt: order.paid_at,
        currency: merchant?.currency ?? "MYR",
        customerId: order.customer_id,
      },
      merchant: merchant
        ? { name: merchant.name, slug: merchant.slug }
        : null,
      tableNumber,
      joinToken,
      whatsappJoinUrl,
      tier,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
