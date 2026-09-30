FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/
RUN npm ci && npm run --workspace=@pack-manager/worker build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app /app
CMD ["node", "apps/worker/dist/index.js"]
