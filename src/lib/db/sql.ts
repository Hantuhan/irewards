/**
 * Postgres access for Cloudflare Workers (Hyperdrive → Supabase) and local Docker.
 *
 * Production (Workers): Hyperdrive binding via getCloudflareContext().
 * Local / Docker / CI: DATABASE_URL | SUPABASE_DB_URL | INSFORGE_DATABASE_URL
 *
 * App repositories still use the InsForge PostgREST SDK until cut over;
 * this module is the Hyperdrive/Supabase seam + ops health checks.
 */

import { Client } from "pg";
import { resolveWorkerOrEnvDatabaseUrl } from "@/lib/db/hyperdrive";

export type SqlClient = Client;

export function resolveDatabaseUrl(override?: string): string {
  if (override) return override;
  const url =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.INSFORGE_DATABASE_URL;
  if (!url) {
    throw new Error(
      "Set DATABASE_URL (Supabase direct / Hyperdrive) or INSFORGE_DATABASE_URL for local Postgres",
    );
  }
  return url;
}

/** Open a short-lived client. Always call client.end() in finally. */
function sslForUrl(connectionString: string): { rejectUnauthorized: false } | undefined {
  if (process.env.DATABASE_SSL === "true") {
    return { rejectUnauthorized: false };
  }
  if (/supabase\.co/i.test(connectionString)) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

export async function openSqlClient(connectionString?: string): Promise<SqlClient> {
  const resolved = connectionString ?? resolveDatabaseUrl();
  const client = new Client({
    connectionString: resolved,
    ssl: sslForUrl(resolved),
  });
  await client.connect();
  return client;
}

export async function withSql<T>(
  fn: (client: SqlClient) => Promise<T>,
  connectionString?: string,
): Promise<T> {
  const client = await openSqlClient(connectionString);
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

/** Prefer Hyperdrive on Workers; otherwise env DATABASE_URL / InsForge. */
export async function withHyperdriveSql<T>(fn: (client: SqlClient) => Promise<T>): Promise<{
  result: T;
  source: "hyperdrive" | "env";
}> {
  const { connectionString, source } = await resolveWorkerOrEnvDatabaseUrl();
  const result = await withSql(fn, connectionString);
  return { result, source };
}

export async function sqlHealthcheck(
  connectionString?: string,
): Promise<{ ok: boolean; backend: string; source: "hyperdrive" | "env" }> {
  if (connectionString) {
    await withSql(async (client) => client.query("select 1 as ok"), connectionString);
    return {
      ok: true,
      source: "env",
      backend: /supabase/i.test(connectionString) ? "supabase" : "postgres",
    };
  }
  const { result, source } = await withHyperdriveSql(async (client) => {
    await client.query("select 1 as ok");
    return true;
  });
  void result;
  const url =
    source === "env"
      ? resolveDatabaseUrl()
      : "hyperdrive";
  const backend =
    source === "hyperdrive"
      ? "hyperdrive"
      : /supabase/i.test(url)
        ? "supabase"
        : /127\.0\.0\.1|localhost/i.test(url)
          ? "local-postgres"
          : "postgres";
  return { ok: true, backend, source };
}
