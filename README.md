# Cocos challenge

This is my solution to Cocos' [backend challenge](https://github.com/cocoscap/cocos-challenge/blob/main/backend-challenge.md).


## Running with Docker (no local Node.js needed)

Only Docker is required.

```bash
make setup        # creates .env from .env.example
# edit .env and set DATABASE_URL

make up           # API only, uses the remote DATABASE_URL
make up-local     # API + local Postgres seeded from database.sql
                  #   (use DATABASE_URL=postgres://postgres:postgres@db:5432/cocos)
make down         # stop everything
make db-reset     # wipe the local DB volume (re-seeds on next up-local)
```

The API listens on http://localhost:3000 (`GET /health`).

Other commands (all run inside containers):

```bash
make test         # unit tests
make e2e          # e2e tests
make lint
make sh           # shell inside the api container
make npm ARGS="install <pkg>"   # add dependencies without local Node
make lock         # regenerate package-lock.json
make prod         # build the production image
```
