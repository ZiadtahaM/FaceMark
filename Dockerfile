# FaceMark Backend - Production Multi-Stage Dockerfile
# Optimized for Render.com, Koyeb, and Railway Free Tiers

# --- Stage 1: Build & Dependencies ---
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install dependencies including devDependencies for build
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit

# Copy source code and build production distribution
COPY . .
RUN npm run build

# Prune devDependencies to keep image lean
RUN npm prune --production

# --- Stage 2: Production Runtime ---
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Set production environment flags
ENV NODE_ENV=production \
    PORT=3000

# Copy node_modules and compiled code from builder
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

# Create non-root user for security (Rule 6 Tier 5)
USER node

EXPOSE 3000

# Health check probe (System Design Law 14)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/main"]
