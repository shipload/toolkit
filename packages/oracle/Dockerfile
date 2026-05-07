FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS install
RUN apt-get update && apt-get install -y --no-install-recommends make && rm -rf /var/lib/apt/lists/*
COPY package.json bun.lock tsconfig.base.json ./
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/cli/package.json ./packages/cli/
COPY packages/item-renderer/package.json ./packages/item-renderer/
COPY packages/image-renderer/package.json ./packages/image-renderer/
COPY packages/oracle/package.json ./packages/oracle/
RUN bun install --frozen-lockfile --ignore-scripts

FROM install AS source
COPY . .
RUN cd packages/sdk && bun run build
WORKDIR /app/packages/oracle

FROM source AS release
ENV NODE_ENV=production
USER bun
ENTRYPOINT ["bun", "run", "src/index.ts"]
