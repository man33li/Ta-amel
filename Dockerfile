# Stage 1: install dependencies (includes native build tools for better-sqlite3)
FROM node:22-bookworm-slim AS deps
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: build the Next.js app
FROM node:22-bookworm-slim AS builder
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: runtime image
FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV MINDFORGE_DATA_DIR=/data
WORKDIR /app

# Copy the standalone Next.js server and its bundled node_modules.
# better-sqlite3 is a native addon loaded at runtime via require(); the standalone
# bundler traces JS imports but does not copy .node binaries. We therefore copy
# node_modules from the deps stage so the native addon is always present.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/migrations ./migrations

VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/auth/session || exit 1

CMD ["node", "server.js"]
