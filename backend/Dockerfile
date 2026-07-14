# ── Mideeye Motors API ──
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# Dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --omit=dev --no-audit --no-fund

# Build
FROM base AS build
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate && npm run build

# Runtime
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY package.json ./
COPY prisma ./prisma
EXPOSE 4000
# 1) sync schema  2) seed (idempotent — ensures the Super Admin exists)
# 3) boot the compiled server (tsc emits dist/src/index.js).
CMD ["sh", "-c", "npx prisma migrate deploy || npx prisma db push; node dist/prisma/seed.js || true; node dist/src/index.js"]
