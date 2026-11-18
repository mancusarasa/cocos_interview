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

## Database / Prisma

Data access uses [Prisma](https://www.prisma.io/) (v6). `prisma/schema.prisma` mirrors `database.sql`
(which stays the source of truth for the schema; Prisma is used for querying, not migrations).
Postgres lowercases the unquoted column names in `database.sql` (`instrumentid`, `previousclose`, ...),
so the Prisma fields are camelCase and mapped to them with `@map`. Prices are `Decimal`
(`NUMERIC(10,2)`), convert with `.toNumber()` before doing arithmetic.

The Prisma client is generated when the Docker image is built. After changing the schema:

```bash
make npm ARGS="run prisma:generate"
# if the api container keeps a stale client: make down && make up (rebuilds the image)
```

## Schema changes (`database.sql`)

The challenge allows adjusting the provided schema if justified. Changes made directly in `database.sql`
(the seed data is unchanged):

| Change | Why |
|---|---|
| `NOT NULL` on all columns of `users`, `instruments`, `orders` (except `orders.price`) and on `marketdata.instrumentId`, `close`, `previousClose`, `date` | The application cannot work without them; Prisma then types them as required, and orders can no longer be orphaned from a user/instrument. |
| `marketdata.open/high/low` stay nullable | The seed has NULLs there (instruments 12 and 53 on 2023-07-13). |
| `orders.price` stays nullable | Pending decision on how MARKET orders store their execution price. |
| `UNIQUE` on `users.email`, `users.accountNumber`, `instruments.ticker` | Natural keys; ticker uniqueness also backs the instrument search. |
| `UNIQUE (marketdata.instrumentId, date)` | One price row per instrument per day; also serves the "latest close" lookup. |
| `CHECK` on `orders.type`, `side`, `status`, `size > 0`, `price >= 0` | Encodes the allowed values and invariants from the challenge. Prisma does not model `CHECK` constraints, so they exist only in SQL. |
| Index `idx_orders_user_status` on `orders (userId, status)` | The portfolio query filters a user's `FILLED` orders. |

Note: the seed inserts 8-decimal prices into `NUMERIC(10,2)` columns, so Postgres rounds them on load.

Known data quirk: user 1 has a FILLED SELL of 30 units of instrument 31 but only 20 FILLED BUY units, so the
net position is -10. The portfolio keeps it as a negative position (computed from all FILLED orders).
