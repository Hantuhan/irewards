# SaaS deployment (Zeabur + InsForge)

> **Deploy guide:** [ZEABUR.md](./ZEABUR.md)

- **Compute:** Zeabur Docker (`Dockerfile` + optional `zeabur-template.yaml`)
- **Data:** InsForge (postgres + postgrest + API) — same stack as local dev
- **Domain:** `irewards.store` / `*.irewards.store`

Supabase and Cloudflare Workers remain optional alternate paths (`DATABASE_PROVIDER=supabase`, `wrangler.jsonc`).
