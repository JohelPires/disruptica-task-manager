############################
# Stage 1 — Dependencies
############################
FROM node:20-alpine AS deps

WORKDIR /app

# Required for Prisma on Alpine
RUN apk add --no-cache openssl

# Copy only dependency manifests for cache efficiency
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install dependencies (including devDeps)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

############################
# Stage 2 — Build
############################
FROM node:20-alpine AS build

WORKDIR /app

# Copy node_modules and Prisma client from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

############################
# Stage 3 — Production
############################
FROM node:20-alpine AS production

# Minimal runtime dependencies
RUN apk add --no-cache dumb-init openssl

WORKDIR /app

# Create non-root user
RUN addgroup -S app && adduser -S app -G app

# Copy only what is required to run
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma

# Switch user
USER app

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/server.js"]
