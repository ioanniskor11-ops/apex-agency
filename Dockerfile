# ── Apex Agency — Backend Dockerfile ────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install dependencies (layer caching)
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Production stage
FROM node:18-alpine

WORKDIR /app

# Security packages
RUN apk add --no-cache tini curl

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy application code
COPY _src ./_src
COPY _data ./_data
COPY .env.example ./.env.production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Security labels
LABEL org.opencontainers.image.source="https://github.com/apexagency/website"
LABEL org.opencontainers.image.description="Apex Agency Backend API"
LABEL org.opencontainers.image.licenses="MIT"

EXPOSE 3000

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "_src/server/index.js"]
