FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]