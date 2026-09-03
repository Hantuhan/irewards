import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  listMerchantOrders,
  remapMerchantOrderKitchenStatuses,
  updateMerchant,
  updateOrderKitchenStatus,
} from "@/lib/db/merchant-repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";
import {
  activeStepIds,
  parseKitchenFlow,
  terminalStepId,
  validateKitchenFlow,
  type KitchenFlow,
  type KitchenFlowStep,
} from "@/lib/kitchen/flow";

type RouteContext = { params: Promise<{ slug: string }> };

const flowStepSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  actionLabel: z.string().optional(),
});

function flowFromMerchant(merchant: NonNullable<Awaited<ReturnType<typeof getMerchantBySlug>>>) {
  return parseKitchenFlow(merchant.kitchen_flow_json);
}

function serializeFlow(flow: KitchenFlow) {
  return flow.map((step) => ({
    id: step.id,
    label: step.label,
    actionLabel: step.actionLabel ?? null,
  }));
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

    const flow = flowFromMerchant(merchant);
    const url = new URL(request.url);
    const kitchen = url.searchParams.get("kitchen") as string | "active" | null;

    const orders = await listMerchantOrders(
      merchant.id,
      kitchen ?? undefined,
      kitchen === "active" ? activeStepIds(flow) : undefined,
    );

    return NextResponse.json({
      kitchenFlow: serializeFlow(flow),
      terminalStepId: terminalStepId(flow),
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
          note: item.note ?? null,
          packedForTakeaway: item.packed_for_takeaway ?? false,
          modifiers: (item.modifiers ?? []).map((mod) => ({
            groupName: mod.groupName,
            optionName: mod.optionName,
          })),
        })),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load orders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const patchOrderSchema = z.object({
  orderId: z.string().uuid(),
  kitchenStatus: z.string().min(1),
});

const patchFlowSchema = z.object({
  kitchenFlow: z.array(flowStepSchema).min(2).max(6),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = await request.json();

    if (body.kitchenFlow) {
      const parsed = patchFlowSchema.parse(body);
      const nextFlow = parsed.kitchenFlow as KitchenFlowStep[];
      const flowError = validateKitchenFlow(nextFlow);
      if (flowError) {
        return NextResponse.json({ error: flowError }, { status: 400 });
      }

      const oldFlow = flowFromMerchant(merchant);
      await updateMerchant(merchant.id, { kitchen_flow_json: nextFlow });
      await remapMerchantOrderKitchenStatuses(merchant.id, oldFlow, nextFlow);

      return NextResponse.json({
        kitchenFlow: serializeFlow(nextFlow),
        terminalStepId: terminalStepId(nextFlow),
      });
    }

    const orderBody = patchOrderSchema.parse(body);
    const flow = flowFromMerchant(merchant);
    const allowedIds = new Set(flow.map((s) => s.id));
    if (!allowedIds.has(orderBody.kitchenStatus)) {
      return NextResponse.json({ error: "Invalid kitchen step for this flow" }, { status: 400 });
    }

    const order = await updateOrderKitchenStatus(
      merchant.id,
      orderBody.orderId,
      orderBody.kitchenStatus,
    );

    return NextResponse.json({
      id: order.id,
      kitchenStatus: order.kitchen_status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
