# ---------- builder ----------
FROM node:20-alpine AS builder

# Native deps for node-gyp, Prisma/Sharp, and OpenSSL compat for Prisma
RUN apk add --no-cache python3 make g++ libc6-compat openssl1.1-compat

WORKDIR /app

# Install deps with cache-friendly layers
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build (needs devDeps)
ENV NODE_ENV=production
RUN npx prisma generate && npm run build

# ---------- runner ----------
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat

WORKDIR /app
ENV NODE_ENV=production

# If not using standalone, copy minimal needed files:
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
# Use runtime env vars (set these in Coolify), not build args
CMD ["npm", "start"]
