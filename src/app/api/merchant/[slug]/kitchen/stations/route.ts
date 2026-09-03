import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listMenuCategories,
  setCategoryStations,
  updateMerchant,
} from "@/lib/db/merchant-repository";
import { getMerchantBySlug } from "@/lib/db/repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";
import {
  MAX_STATIONS,
  parseKitchenStations,
  validateKitchenStations,
} from "@/lib/kitchen/stations";

type RouteContext = { params: Promise<{ slug: string }> };

const bodySchema = z.object({
  stations: z
    .array(z.object({ id: z.string().min(1), label: z.string().min(1) }))
    .max(MAX_STATIONS),
  categoryStations: z
    .array(z.object({ slug: z.string().min(1), stationId: z.string().nullable() }))
    .max(100)
    .optional(),
});

/** Current stations plus how each menu category is routed. */
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

    const categories = await listMenuCategories(merchant.id);
    return NextResponse.json({
      stations: parseKitchenStations(merchant.kitchen_stations_json),
      categories: categories.map((c) => ({
        slug: c.slug,
        label: c.label,
        stationId: c.station_id ?? null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load stations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Save stations and category routing together, so the board never sees a half-applied setup. */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = bodySchema.parse(await request.json());
    const stations = parseKitchenStations(body.stations);
    const invalid = validateKitchenStations(stations);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const known = new Set(stations.map((s) => s.id));
    const assignments = (body.categoryStations ?? []).map((entry) => ({
      slug: entry.slug,
      // Drop routing that points at a station the merchant just deleted.
      stationId: entry.stationId && known.has(entry.stationId) ? entry.stationId : null,
    }));

    await updateMerchant(merchant.id, { kitchen_stations_json: stations });
    if (assignments.length > 0) {
      await setCategoryStations(merchant.id, assignments);
    }

    const categories = await listMenuCategories(merchant.id);
    return NextResponse.json({
      stations,
      categories: categories.map((c) => ({
        slug: c.slug,
        label: c.label,
        stationId: c.station_id ?? null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save stations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
