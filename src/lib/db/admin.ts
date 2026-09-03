/**
 * Unified admin database access for local InsForge and production Supabase.
 *
 * Local dev (default): InsForge PostgREST via @insforge/sdk
 * Production (Zeabur): Supabase PostgREST via @supabase/supabase-js
 *
 * Direct SQL (migrations, health): src/lib/db/sql.ts + Hyperdrive → Supabase :5432
 */
import { createInsforgeAdmin } from "@/lib/insforge/client";
import { createSupabaseAdmin } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminDatabase = SupabaseClient;

export type DatabaseProvider = "insforge" | "supabase";

export function resolveDatabaseProvider(): DatabaseProvider {
  const explicit = process.env.DATABASE_PROVIDER?.toLowerCase();
  if (explicit === "supabase" || explicit === "insforge") {
    return explicit;
  }
  if (
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return "supabase";
  }
  return "insforge";
}

/** PostgREST admin client — `.from("table")` for reads/writes. */
export function adminDb(): AdminDatabase {
  if (resolveDatabaseProvider() === "supabase") {
    return createSupabaseAdmin();
  }
  return createInsforgeAdmin().database as unknown as AdminDatabase;
}
