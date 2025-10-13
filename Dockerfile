FROM node:20-alpine

# Install dependencies needed for builds
RUN apk add --no-cache bash libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm i --legacy-peer-deps

COPY . .
RUN npm run build

# Set environment variables
ENV NODE_ENV production
ENV PORT 3000

# Next.js collects anonymous telemetry data about general usage
ENV NEXT_TELEMETRY_DISABLED 1

EXPOSE 3000

CMD ["npm", "run", "start"]