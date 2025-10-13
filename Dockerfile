# ---- deps ----
FROM node:20-bullseye-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN corepack enable && npm ci

# ---- build ----
FROM node:20-bullseye-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Your build already runs Prisma generate in package.json "build"
# see: [package.json](/Users/abdullahalnoman/Desktop/awx-platform/package.json)
RUN NODE_OPTIONS="--max-old-space-size=8192" npm run build

# ---- runtime ----
FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "start"]