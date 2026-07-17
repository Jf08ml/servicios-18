# syntax=docker/dockerfile:1

# ── deps: dependencias + código fuente (también la usa el servicio "migrate") ──
FROM node:22-alpine AS deps
# openssl: lo requieren los engines de Prisma en Alpine (musl).
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# prisma/ debe estar antes de npm ci: el postinstall corre `prisma generate`.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .

# ── builder: compila Next.js ──
FROM deps AS builder
# Las NEXT_PUBLIC_* se incrustan en el bundle del navegador durante el build,
# por eso llegan como build args y no solo como variables de runtime.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY \
    NEXT_TELEMETRY_DISABLED=1

# El build no consulta la BD (todas las páginas con datos son dinámicas),
# pero Prisma exige que DATABASE_URL exista.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npm run build

# ── runner: imagen final mínima ──
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# uploads/ vive en un volumen persistente montado aquí (ver docker-compose.prod.yml).
RUN mkdir -p uploads && chown -R node:node /app
USER node

EXPOSE 3000
CMD ["node", "server.js"]
