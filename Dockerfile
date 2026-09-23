FROM node:22-slim AS build
RUN corepack enable && corepack prepare pnpm@11.19.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server apps/server
COPY apps/mobile/package.json apps/mobile/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages packages
COPY tsconfig.json tsconfig.build.json biome.json ./
RUN pnpm install --frozen-lockfile
RUN pnpm build:server

FROM node:22-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends docker.io curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/packages ./packages
RUN mkdir -p .openmuse && chown -R 1000:1000 /app
EXPOSE 8787
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/apps/server/src/index.js"]
