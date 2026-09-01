import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  getActiveMenuForStorefront,
  listMenuCategories,
  listMenuItems,
  upsertMenuItem,
} from "@/lib/db/merchant-repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

const weekdayEnum = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);

const weeklyScheduleSchema = z
  .record(weekdayEnum, z.array(z.object({ start: z.string(), end: z.string() })))
  .nullable()
  .optional();

const itemSchema = z.object({
  slug: z.string().min(1),
  categorySlug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  priceCents: z.number().int().min(0),
  active: z.boolean(),
  imageUrl: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  availabilityMode: z.enum(["always", "weekly", "date_range"]).optional(),
  availabilityWeekly: weeklyScheduleSchema,
  availableFrom: z.string().nullable().optional(),
  availableUntil: z.string().nullable().optional(),
});

function merchantTimezone(merchant: { timezone?: string | null }) {
  return merchant.timezone ?? "Asia/Kuala_Lumpur";
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const format = url.searchParams.get("format");

    if (format === "storefront") {
      const menu = await getActiveMenuForStorefront(merchant.id, merchantTimezone(merchant));
      return NextResponse.json({ categories: menu });
    }

    const [categories, items] = await Promise.all([
      listMenuCategories(merchant.id),
      listMenuItems(merchant.id),
    ]);

    const categorySlugById = new Map(categories.map((c) => [c.id, c.slug]));

    return NextResponse.json({
      categories: categories.map((c) => ({
        slug: c.slug,
        label: c.label,
        sortOrder: c.sort_order,
      })),
      items: items.map((item) => ({
        slug: item.slug,
        categorySlug: categorySlugById.get(item.category_id) ?? "",
        name: item.name,
        description: item.description,
        priceCents: item.price_cents,
        active: item.active,
        imageUrl: item.image_url,
        tags: item.tags ?? [],
        availabilityMode: item.availability_mode ?? "always",
        availabilityWeekly: item.availability_weekly,
        availableFrom: item.available_from,
        availableUntil: item.available_until,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load menu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!verifyMerchantAccess(request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = itemSchema.parse(await request.json());
    const item = await upsertMenuItem(merchant.id, body);

    return NextResponse.json({
      slug: item.slug,
      name: item.name,
      priceCents: item.price_cents,
      active: item.active,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save menu item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
