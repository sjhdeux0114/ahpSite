# 1. Base stage for dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

# 2. Builder stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure public directory exists
RUN mkdir -p /app/public

# Generate Prisma Client & Build Next.js standalone
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
RUN npx prisma generate
RUN npm run build

# 3. Runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Install openssl for prisma engine and dos2unix for line endings
RUN apk add --no-cache openssl dos2unix

# Create data directory for SQLite and public folder
RUN mkdir -p /app/data /app/public

# Copy built artifacts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY docker-entrypoint.sh ./

RUN dos2unix docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 3000

VOLUME ["/app/data"]

ENTRYPOINT ["./docker-entrypoint.sh"]
