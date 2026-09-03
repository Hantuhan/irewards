import { NextResponse } from "next/server";
import { z } from "zod";
import { importCatalogTemplate } from "@/lib/db/catalog-import";
import { getMerchantBySlug } from "@/lib/db/repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";
import { getCatalogTemplate, listCatalogTemplates } from "@/lib/menu/catalog-templates";

type RouteContext = { params: Promise<{ slug: string }> };

const bodySchema = z.object({ templateId: z.string().min(1) });

/** List importable catalog templates. */
export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  if (!(await verifyMerchantAccess(request, slug))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ templates: listCatalogTemplates() });
}

/** Import a catalog template (categories, products, photos, modifiers, pairings). */
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
    const body = bodySchema.parse(await request.json());
    const template = getCatalogTemplate(body.templateId);
    if (!template) {
      return NextResponse.json({ error: "Unknown catalog template" }, { status: 404 });
    }
    const result = await importCatalogTemplate(merchant.id, template);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import catalog";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
