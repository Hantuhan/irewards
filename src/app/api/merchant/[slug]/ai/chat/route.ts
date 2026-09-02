import { NextResponse } from "next/server";
import { z } from "zod";
import { chatWithMerchantAgent } from "@/lib/ai/merchant-agent";
import { isDeepseekConfigured } from "@/lib/ai/deepseek";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(16)
    .optional(),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!verifyMerchantAccess(request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = bodySchema.parse(await request.json());
    const result = await chatWithMerchantAgent({
      merchantSlug: slug,
      message: body.message,
      history: body.history,
    });

    return NextResponse.json({
      reply: result.reply,
      source: result.source,
      pendingAction: result.pendingAction,
      deepseekConfigured: isDeepseekConfigured(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
