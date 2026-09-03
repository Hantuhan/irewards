import { NextResponse } from "next/server";
import { z } from "zod";
import { composeCampaign, type ComposerTurn } from "@/lib/ai/campaign-composer";
import { isDeepseekConfigured } from "@/lib/ai/deepseek";
import { getMerchantBySlug, getRewardLevels } from "@/lib/db/repository";
import { mapRewardLevel } from "@/lib/loyalty/reward-level-map";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * POST { message, history } → the planner's next turn: clarifying questions,
 * a ready plan, or a refusal. Stateless — the client replays the transcript.
 * Nothing is persisted; the plan is opened in the wizard as an unsaved draft.
 */

const turnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(6000),
  plan: z.unknown().optional().nullable(),
  questions: z.array(z.unknown()).optional(),
});

const bodySchema = z.object({
  message: z.string().min(1).max(1500),
  history: z.array(turnSchema).max(12).default([]),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) return NextResponse.json({ error: "Merchant not found" }, { status: 404 });

    const body = bodySchema.parse(await request.json());
    const levels = await getRewardLevels(merchant.id).catch(() => []);

    const result = await composeCampaign({
      message: body.message,
      history: body.history as ComposerTurn[],
      context: {
        merchantName: merchant.name,
        currency: merchant.currency === "SGD" ? "SGD" : "MYR",
        tierNames: levels.map((level) => mapRewardLevel(level).name).filter(Boolean),
      },
    });

    return NextResponse.json({ ...result, deepseekConfigured: isDeepseekConfigured() });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Describe the campaign in a few words." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Campaign planner failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
