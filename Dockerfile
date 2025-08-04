FROM node:20-bullseye

WORKDIR /app

RUN apt update && apt install -y openssl

COPY package*.json ./
RUN npm install --force

COPY . .

# ✅ This fixes the Prisma checksum issue
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

# Build the application
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

EXPOSE 3000

ENV NODE_OPTIONS="--max-old-space-size=4096"

CMD ["npm", "run", "start"]
