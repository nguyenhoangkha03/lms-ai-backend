# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci --include=dev

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production dependencies stage
FROM node:18-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Install security updates
RUN apk update && apk upgrade

# Install dumb-init for signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy built application and dependencies
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --chown=nestjs:nodejs package*.json ./

# Health check script
COPY --chown=nestjs:nodejs scripts/health-check.js ./scripts/

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Security: drop privileges
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node scripts/health-check.js

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]