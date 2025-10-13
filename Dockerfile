
FROM node:20-slim

# Install dependencies and bash
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl wget python3 make g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm i --legacy-peer-deps

# SWC patch - explicitly install platform-specific SWC packages
RUN npm install @next/swc-linux-x64-gnu @next/swc-linux-x64-musl

# Copy project files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the Next.js app
ENV NODE_ENV production
ENV NODE_OPTIONS=--max-old-space-size=8192
RUN npm run build

# Set the command to start the app
EXPOSE 3000
CMD ["npm", "run", "start"]