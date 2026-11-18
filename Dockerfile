# syntax=docker/dockerfile:1

# ---- base: deps shared by every stage ----
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

# ---- dev: all deps, hot reload (source is bind-mounted by docker compose) ----
FROM base AS dev
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# ---- build: compile TypeScript ----
FROM dev AS build
RUN npm run build

# ---- prod: runtime-only image ----
FROM node:22-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
