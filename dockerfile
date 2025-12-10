FROM node:20-alpine AS base

RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN pnpm prisma generate
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV production

COPY --from=builder /dist ./dist
COPY --from=builder /node_modules ./node_modules
COPY --from=builder /prisma ./prisma
COPY --from=builder /package.json ./package.json
COPY --from=builder /.env ./.env

CMD npx prisma migrate deploy && node dist/main