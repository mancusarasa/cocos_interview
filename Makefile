.PHONY: setup up up-local down db-reset logs build test e2e lint sh npm lock prod

# Create .env from the template if missing
setup:
	@test -f .env || cp .env.example .env

# API only -> uses the remote DATABASE_URL from .env
up: setup
	docker compose up --build

# API + local dockerized Postgres (set DATABASE_URL to the local one in .env)
up-local: setup
	docker compose --profile local-db up --build

down:
	docker compose --profile local-db down

# Drop the local DB volume so database.sql is re-applied on next up-local
db-reset:
	docker compose --profile local-db down -v

logs:
	docker compose logs -f api

build:
	docker compose run --rm --no-deps api npm run build

test:
	docker compose run --rm --no-deps api npm test

e2e:
	docker compose run --rm --no-deps api npm run test:e2e

lint:
	docker compose run --rm --no-deps api npm run lint

sh:
	docker compose run --rm --no-deps api sh

# Run any npm command in the container, e.g. make npm ARGS="install pg"
npm:
	docker compose run --rm --no-deps api npm $(ARGS)

# (Re)generate package-lock.json without local Node
lock:
	docker run --rm -v "$(PWD)":/app -w /app node:22-alpine npm install --package-lock-only

# Build the production image
prod:
	docker build --target prod -t cocos-challenge:prod .
