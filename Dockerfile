FROM oven/bun:1.4.4 AS bun

FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN mkdir -p public \
    && bun run build \
    && bun build scripts/migrate.ts --target=node --packages=external --outfile=migrate.mjs

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=1112
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/migrate.mjs ./migrate.mjs
COPY --chmod=755 scripts/container-entrypoint.sh /usr/local/bin/demoweb-entrypoint
USER node
EXPOSE 1112
HEALTHCHECK --interval=10s --timeout=8s --start-period=30s --retries=6 \
    CMD node -e "fetch('http://127.0.0.1:1112/health',{signal:AbortSignal.timeout(6000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/local/bin/demoweb-entrypoint"]
