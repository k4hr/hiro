# ---------- base ----------
FROM node:20-slim AS base
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates openssl curl bash tini \
  && rm -rf /var/lib/apt/lists/*

# ---------- deps (install all deps for build, but DO NOT run postinstall) ----------
FROM base AS deps
WORKDIR /app

COPY package.json ./
COPY package-lock.json* ./

# ✅ на всякий случай кладём schema (если postinstall вдруг запустится — не упадёт)
RUN mkdir -p prisma
COPY prisma/schema.prisma ./prisma/schema.prisma

# ✅ КРИТИЧНО: --ignore-scripts, чтобы postinstall НЕ запускался на этом слое
RUN if [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund --ignore-scripts ; \
    else \
      npm install --no-audit --no-fund --ignore-scripts ; \
    fi

# ---------- builder ----------
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN mkdir -p public
RUN npm run build

# ---------- deps-prod ----------
FROM base AS deps_prod
WORKDIR /app

COPY package.json ./
COPY package-lock.json* ./
COPY prisma ./prisma

# ✅ Здесь scripts можно НЕ игнорить (schema уже есть)
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --no-audit --no-fund ; \
    else \
      npm install --omit=dev --no-audit --no-fund ; \
    fi

# (опционально, но можно оставить для надёжности)
# RUN npm run prisma:generate

# ---------- runner ----------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=deps_prod /app/node_modules ./node_modules

# ✅ Standalone server -> /app (server.js в корне)
COPY --from=builder /app/.next/standalone ./

# ✅ статика туда, где её ждёт standalone
COPY --from=builder /app/.next/static ./.next/static

# ✅ public
COPY --from=builder /app/public ./public

# ✅ package.json (чтобы npm run prisma:* работало)
COPY --from=builder /app/package.json ./package.json

# ✅ prisma schema + migrations нужны в раннере для migrate deploy
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini","--"]

# ✅ миграции перед стартом + запуск standalone
CMD ["bash","-lc","npm run prisma:migrate:deploy && node server.js"]
