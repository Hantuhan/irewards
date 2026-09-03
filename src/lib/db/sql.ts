/**
 * Postgres health / ops SQL. Uses INSFORGE_DATABASE_URL or DATABASE_URL.
 * App queries use the InsForge SDK (adminDb); this is for health checks and
 * one-off ops work.
 */

import { Client } from "pg";

export type SqlClient = Client;

export function resolveDatabaseUrl(override?: string): string {
  if (override) return override;
  const url =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.INSFORGE_DATABASE_URL;
  if (!url) {
    throw new Error(
      "Set DATABASE_URL (Supabase direct) or INSFORGE_DATABASE_URL for local Postgres",
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

export async function sqlHealthcheck(
  connectionString?: string,
): Promise<{ ok: boolean; backend: string }> {
  const url = connectionString ?? resolveDatabaseUrl();
  await withSql(async (client) => client.query("select 1 as ok"), url);

  const backend = /supabase/i.test(url)
    ? "supabase"
    : /127\.0\.0\.1|localhost/i.test(url)
      ? "local-postgres"
      : "postgres";

  return { ok: true, backend };
}
