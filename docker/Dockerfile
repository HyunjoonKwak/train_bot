# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY src/ ./src/

# Build client
RUN npm run build:client

# Build server
RUN npx tsc -p tsconfig.server.json

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artifacts
COPY --from=builder /app/dist ./dist

# Copy migration SQL files
COPY src/server/infrastructure/database/migrations ./dist/server/infrastructure/database/migrations

# Create data directory
RUN mkdir -p /data/logs

ENV NODE_ENV=production
ENV TZ=Asia/Seoul
ENV DB_PATH=/data/trainbot.db
ENV LOG_DIR=/data/logs
ENV PORT=3000

EXPOSE 3000

VOLUME ["/data"]

CMD ["node", "dist/server/index.js"]
