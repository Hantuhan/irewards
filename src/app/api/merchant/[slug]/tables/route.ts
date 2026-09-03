import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  createVenueTable,
  deleteVenueTable,
  listVenueTables,
} from "@/lib/db/merchant-repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

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

    const tables = await listVenueTables(merchant.id);
    return NextResponse.json({
      tables: tables.map((t) => ({ id: t.id, tableNumber: t.table_number })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load tables";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const postSchema = z.object({ tableNumber: z.string().min(1) });

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = postSchema.parse(await request.json());
    const table = await createVenueTable(merchant.id, body.tableNumber);
    return NextResponse.json({
      id: table.id,
      tableNumber: table.table_number,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create table";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const deleteSchema = z.object({ tableId: z.string().uuid() });

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = deleteSchema.parse(await request.json());
    await deleteVenueTable(merchant.id, body.tableId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete table";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
