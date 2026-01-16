FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled JS
COPY --from=builder /app/dist ./dist

# FIX: copy swagger file
COPY swagger.yaml ./swagger.yaml

EXPOSE 3000
CMD ["node", "dist/server.js"]
