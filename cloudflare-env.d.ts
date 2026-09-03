/* Generated for Hyperdrive + OpenNext. Run: npm run cf:typegen */
interface CloudflareEnv {
  HYPERDRIVE: Hyperdrive;
  ASSETS: Fetcher;
  WORKER_SELF_REFERENCE: Fetcher;
  NEXT_PUBLIC_APEX_DOMAIN: string;
}

interface Hyperdrive {
  connectionString: string;
}
