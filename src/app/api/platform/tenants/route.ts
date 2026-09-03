import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformSessionFromRequest } from "@/lib/platform/session";
import {
  listAllTenants,
  setTenantRetention,
  setTenantSuspended,
} from "@/lib/tenancy/provision";

export async function GET(request: Request) {
  if (!getPlatformSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const tenants = await listAllTenants();
    return NextResponse.json({ tenants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list tenants";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const patchSchema = z
  .object({
    merchantId: z.string().uuid(),
    retentionEnabled: z.boolean().optional(),
    suspended: z.boolean().optional(),
  })
  .refine(
    (b) => b.retentionEnabled !== undefined || b.suspended !== undefined,
    { message: "Provide retentionEnabled and/or suspended" },
  );

export async function PATCH(request: Request) {
  if (!getPlatformSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = patchSchema.parse(await request.json());
    if (body.retentionEnabled !== undefined) {
      await setTenantRetention(body.merchantId, body.retentionEnabled);
    }
    if (body.suspended !== undefined) {
      await setTenantSuspended(body.merchantId, body.suspended);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update tenant";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
