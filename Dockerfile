# syntax=docker/dockerfile:1

# ---- base: deps shared by every stage ----
FROM node:22-alpine AS base
WORKDIR /app
# Prisma's engines need openssl on Alpine
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./

# ---- dev: all deps, hot reload (source is bind-mounted by docker compose) ----
FROM base AS dev
RUN npm ci
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# ---- build: compile TypeScript ----
FROM dev AS build
RUN npm run build

# ---- prod: runtime-only image ----
FROM node:22-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
# Generated Prisma client (the CLI is a devDependency, so copy it from build)
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
