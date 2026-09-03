# SaaS deployment (Zeabur + Supabase)

Multi-tenant MY/SG F&B SaaS on **Zeabur Docker** with **Supabase Postgres**.

> **Primary deploy guide:** [ZEABUR.md](./ZEABUR.md)

## Summary

- Apex domain: **irewards.store** (`cafe1.irewards.store`)
- Merchant signup auto-provisions slug/subdomain, owner, tables 1–5, default reward levels
- Platform admin at `/platform`
- Multi-staff roles: owner / manager / staff

| Surface | URL |
|---------|-----|
| Marketing / login | `https://irewards.store` |
| Merchant storefront | `https://{subdomain}.irewards.store` |
| Merchant dashboard | `https://{subdomain}.irewards.store/dashboard` |

## Stack

| Layer | Service |
|-------|---------|
| App | Zeabur — `Dockerfile` → Next.js standalone |
| Database | Supabase Postgres |
| App queries | `adminDb()` → Supabase PostgREST |
| Local dev | InsForge Docker (`npm run insforge:setup`) |

## Quick deploy

```bash
cp .env.zeabur.example .env.zeabur
# fill Supabase + secrets
source .env.zeabur && npm run zeabur:setup
# then deploy via Zeabur dashboard (Git → Dockerfile)
```

## Optional: Cloudflare Workers

`wrangler.jsonc` and OpenNext scripts remain for experimentation but are not the production path.
