/**
 * Resolve a Postgres connection string for Hyperdrive (Workers) or env (Node/Docker).
 */

export type HyperdriveLike = { connectionString: string };

export async function resolveWorkerOrEnvDatabaseUrl(): Promise<{
  connectionString: string;
  source: "hyperdrive" | "env";
}> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const hyperdrive = (ctx?.env as { HYPERDRIVE?: HyperdriveLike } | undefined)?.HYPERDRIVE;
    if (hyperdrive?.connectionString) {
      return { connectionString: hyperdrive.connectionString, source: "hyperdrive" };
    }
  } catch {
    // Not running under OpenNext / Workers — fall through to env.
  }

  const url =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.INSFORGE_DATABASE_URL;
  if (!url) {
    throw new Error(
      "Set DATABASE_URL (Supabase direct / Hyperdrive) or INSFORGE_DATABASE_URL for local Postgres",
    );
  }
  return { connectionString: url, source: "env" };
}
