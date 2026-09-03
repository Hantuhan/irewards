import { NextResponse } from "next/server";
import { z } from "zod";
import { advisePointsProgram } from "@/lib/ai/points-intelligence";
import { getMerchantBySlug, getRewardLevels } from "@/lib/db/repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";
import { mapRewardLevel } from "@/lib/loyalty/reward-level-map";

type RouteContext = { params: Promise<{ slug: string }> };

const bodySchema = z.object({
  prompt: z.string().max(500).optional(),
  mode: z.enum(["default", "higher", "lower"]).optional(),
  pointsPerRinggit: z.number().positive(),
  pointsRedeemCentsPerPoint: z.number().int().positive(),
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

    const body = bodySchema.parse(await request.json());
    const levels = await getRewardLevels(merchant.id);
    const mapped = levels.map((l) => mapRewardLevel(l));

    const result = await advisePointsProgram({
      merchantName: merchant.name,
      levels: mapped,
      settings: {
        pointsPerRinggit: body.pointsPerRinggit,
        pointsRedeemCentsPerPoint: body.pointsRedeemCentsPerPoint,
      },
      userPrompt: body.prompt,
      mode: body.mode,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI advice failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
