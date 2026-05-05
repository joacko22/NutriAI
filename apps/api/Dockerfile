FROM node:20-alpine
WORKDIR /app

# Copy workspace manifests first (Docker layer cache for deps)
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json         ./apps/api/

RUN npm ci

# Copy source (after deps so code changes don't bust the dep cache)
COPY packages/shared ./packages/shared
COPY apps/api        ./apps/api

# Generate Prisma client (must run before tsc so types are available)
RUN cd apps/api && npx prisma generate

# Compile TypeScript → apps/api/dist/
RUN npm run build:api

EXPOSE 3001

# migrate deploy runs pending migrations on each deploy, then starts the server
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && node dist/index.js"]
