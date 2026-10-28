FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies needed for build tools (e.g. bcrypt native build)
RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["npm", "start"]
