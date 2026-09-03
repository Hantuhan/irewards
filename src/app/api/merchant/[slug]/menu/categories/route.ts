import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import { createMenuCategory, deleteMenuCategory } from "@/lib/db/merchant-repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

const categorySchema = z.object({
  label: z.string().min(1).max(80),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
});

const categoriesBatchSchema = z.object({
  categories: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        slug: z
          .string()
          .trim()
          .min(1)
          .max(48)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
          .optional(),
      }),
    )
    .min(1)
    .max(20),
});

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

    const json = await request.json();
    const batch = categoriesBatchSchema.safeParse(json);
    if (batch.success) {
      const created = [];
      for (const item of batch.data.categories) {
        created.push(await createMenuCategory(merchant.id, item));
      }
      return NextResponse.json({
        categories: created.map((c) => ({
          slug: c.slug,
          label: c.label,
          sortOrder: c.sort_order,
        })),
      });
    }

    const body = categorySchema.parse(json);
    const category = await createMenuCategory(merchant.id, body);

    return NextResponse.json({
      slug: category.slug,
      label: category.label,
      sortOrder: category.sort_order,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create category";
    const status =
      message.toLowerCase().includes("already") || message.toLowerCase().includes("required")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

const deleteCategorySchema = z.object({
  slug: z.string().min(1).max(80),
});

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { slug: merchantSlug } = await context.params;
    if (!(await verifyMerchantAccess(request, merchantSlug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(merchantSlug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = deleteCategorySchema.parse(await request.json());
    const result = await deleteMenuCategory(merchant.id, body.slug);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete category";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
