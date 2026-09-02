import { NextResponse } from "next/server";
import { z } from "zod";
import { chatWithPointsRoi } from "@/lib/ai/points-roi-intelligence";
import { isDeepseekConfigured } from "@/lib/ai/deepseek";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

const scenarioSchema = z.object({
  avgOrderRm: z.number().min(0),
  visitsPerMemberMonth: z.number().min(0),
  activeMembers: z.number().int().min(0),
  grossMarginPercent: z.number().min(0).max(100),
  redemptionRatePercent: z.number().min(0).max(100),
});

const programSchema = z.object({
  pointsPerRinggit: z.number().positive(),
  centsPerPoint: z.number().positive(),
  currency: z.string(),
  topTierName: z.string(),
  topTierMultiplier: z.number().positive(),
  rules: z.array(z.unknown()),
});

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(12)
    .optional(),
  scenario: scenarioSchema,
  program: programSchema,
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!verifyMerchantAccess(request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = bodySchema.parse(await request.json());
    const result = await chatWithPointsRoi({
      merchantSlug: slug,
      message: body.message,
      history: body.history,
      scenario: body.scenario,
      program: {
        ...body.program,
        rules: body.program.rules as import("@/lib/loyalty/points-rules").PointsRule[],
      },
    });

    return NextResponse.json({
      reply: result.reply,
      source: result.source,
      deepseekConfigured: isDeepseekConfigured(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Points ROI AI failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
