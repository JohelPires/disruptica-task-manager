# =========================
# Builder stage
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public" \
    npx prisma generate

COPY . .
RUN npm run build


# =========================
# Production stage
# =========================
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/openapi.yaml ./openapi.yaml

RUN addgroup -S nodejs -g 1001 \
  && adduser -S nodejs -u 1001 -G nodejs

USER nodejs

EXPOSE 3000

CMD ["node", "dist/server.js"]
