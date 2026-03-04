# Stage 1: Install dependencies + build
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY src/ ./src/

# Build client + server
RUN npm run build:client && npx tsc -p tsconfig.server.json

# Prune dev dependencies
RUN npm prune --omit=dev

# Stage 2: Production runtime
FROM node:20-alpine

WORKDIR /app

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S trainbot -u 1001 -G nodejs

# Copy production node_modules (with native better-sqlite3)
COPY --from=builder /app/node_modules ./node_modules

# Copy built artifacts
COPY --from=builder /app/dist ./dist

# Copy migration SQL files (read by migrator at runtime)
COPY src/server/infrastructure/database/migrations ./dist/server/infrastructure/database/migrations

# Copy entrypoint
COPY docker/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

# Create data directory
RUN mkdir -p /data/logs && chown -R trainbot:nodejs /data /app

ENV NODE_ENV=production
ENV TZ=Asia/Seoul
ENV DB_PATH=/data/trainbot.db
ENV LOG_DIR=/data/logs
ENV PORT=3000

EXPOSE 3000

VOLUME ["/data"]

USER trainbot

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
