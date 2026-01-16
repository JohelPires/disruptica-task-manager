# =========================
# Builder stage
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install all dependencies (dev deps included)
RUN npm ci

# Copy Prisma schema BEFORE generate
COPY prisma ./prisma

# Generate Prisma Client (required before tsc)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public" \
    npx prisma generate

# Copy the rest of the source code
COPY . .

# Build TypeScript
RUN npm run build


# =========================
# Production stage
# =========================
FROM node:20-alpine AS production

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install production dependencies ONLY
RUN npm ci --omit=dev && npm cache clean --force

# Copy Prisma runtime artifacts from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built app and Prisma schema
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Create non-root user
RUN addgroup -S nodejs -g 1001 \
  && adduser -S nodejs -u 1001 -G nodejs

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api-docs.json', r => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run migrations then start app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
