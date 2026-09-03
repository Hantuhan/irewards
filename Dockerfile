FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/insforge/migrations ./insforge/migrations
COPY --from=builder /app/scripts/wait-for-http.sh ./scripts/wait-for-http.sh
COPY --from=builder /app/scripts/migrate-remote.sh ./scripts/migrate-remote.sh
COPY --from=builder /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN mkdir -p public/uploads && chown -R nextjs:nodejs public/uploads scripts insforge
RUN apk add --no-cache curl postgresql-client
RUN chmod +x scripts/*.sh
USER nextjs
EXPOSE 8080
ENV HOSTNAME=0.0.0.0
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD sh -c 'curl -fsS "http://127.0.0.1:${PORT:-8080}/api/health" || exit 1'
ENTRYPOINT ["sh", "scripts/docker-entrypoint.sh"]
