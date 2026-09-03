/**
 * Admin database access — InsForge PostgREST (local dev + Zeabur production).
 */
import { createInsforgeAdmin } from "@/lib/insforge/client";

export type AdminDatabase = ReturnType<typeof createInsforgeAdmin>["database"];

/** PostgREST admin client — `.from("table")` for reads/writes. */
export function adminDb(): AdminDatabase {
  return createInsforgeAdmin().database;
}
