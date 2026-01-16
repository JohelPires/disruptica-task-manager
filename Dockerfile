FROM node:20-alpine AS builder
WORKDIR /app
# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev libc6-compat
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
# Install OpenSSL 1.1 compatibility library for Prisma (needed for libssl.so.1.1)
RUN apk add --no-cache openssl1.1-compat libc6-compat
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma
# Install all dependencies to get prisma CLI, generate client, then prune dev dependencies
RUN npm ci && npx prisma generate && npm prune --production

# Copy compiled JS
COPY --from=builder /app/dist ./dist

# FIX: copy swagger file
# COPY swagger.yaml ./swagger.yaml

EXPOSE 3000
CMD ["node", "dist/server.js"]
