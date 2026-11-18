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
| `NOT NULL` on all columns of `users`, `instruments`, `orders` and on `marketdata.instrumentId`, `close`, `previousClose`, `date` | The application cannot work without them; Prisma then types them as required, and orders can no longer be orphaned from a user/instrument. |
| `marketdata.open/high/low` stay nullable | The seed has NULLs there (instruments 12 and 53 on 2023-07-13). |
| `orders.price` is `NOT NULL` | Every order stores its price: MARKET orders the latest close they were checked/executed at (also when `REJECTED`), LIMIT orders the user's price. Existing databases need `make db-reset` (or `ALTER TABLE orders ALTER COLUMN price SET NOT NULL`). |
| `UNIQUE` on `users.email`, `users.accountNumber`, `instruments.ticker` | Natural keys; ticker uniqueness also backs the instrument search. |
| `UNIQUE (marketdata.instrumentId, date)` | One price row per instrument per day; also serves the "latest close" lookup. |
| `CHECK` on `orders.type`, `side`, `status`, `size > 0`, `price >= 0` | Encodes the allowed values and invariants from the challenge. Prisma does not model `CHECK` constraints, so they exist only in SQL. |
| Index `idx_orders_user_status` on `orders (userId, status)` | The portfolio query filters a user's `FILLED` orders. |

Note: the seed inserts 8-decimal prices into `NUMERIC(10,2)` columns, so Postgres rounds them on load.

Known data quirk: user 1 has a FILLED SELL of 30 units of instrument 31 but only 20 FILLED BUY units, so the
net position is -10. The portfolio keeps it as a negative position (computed from all FILLED orders).

## Architecture (hexagonal)

Code is organised feature-first; each feature has three layers and dependencies only point inwards
(`infrastructure -> application -> domain`, enforced by ESLint `no-restricted-imports`):

```
src/<feature>/
  domain/          pure TypeScript: types, business rules, errors (no Nest, no Prisma)
  application/     use cases + ports (interfaces and injection tokens the use cases need)
  infrastructure/  adapters: HTTP controllers (driving) and Prisma repositories (driven)
  <feature>.module.ts   wires ports to adapters ({ provide: TOKEN, useClass: PrismaXRepository })
```

`src/prisma/` is the shared PrismaClient provider. Tests: the domain and use cases are unit-tested without
Nest/DB; e2e tests override `PrismaService` and the repository tokens with in-memory fakes.

## `GET /users/:userId/portfolio`

Returns `userId`, `totalValue`, `availableCash` and `positions[]` (`instrumentId`, `ticker`, `name`, `quantity`,
`marketValue`, `totalReturnPct`). `404` for an unknown user, `400` for a non-numeric id.

Assumptions:
- Only `FILLED` orders count (`NEW`, `CANCELLED`, `REJECTED` are ignored).
- Cash: `CASH_IN`/`CASH_OUT` move `size` pesos; `BUY`/`SELL` move `size * price`.
- Position quantity = sum(BUY) - sum(SELL). Zero positions are omitted; **negative positions are kept** (see the
  data quirk above) with `totalReturnPct: null`, since a return over cost is not meaningful for them.
- `marketValue = quantity * close` using the latest `marketdata` row per instrument.
- `totalReturnPct = (close - avgBuyCost) / avgBuyCost * 100`, where `avgBuyCost` is the weighted average price of the
  FILLED BUYs (total return, not the daily return).
- `totalValue = availableCash + sum(marketValue)`. Amounts are rounded to 2 decimals.
- An instrument with no market data is left out of the positions (and logged); a user without orders gets zeros.
- A FILLED BUY/SELL with a NULL price is treated as corrupt data and makes the request fail.

## `GET /instruments?search=<term>&page=<n>&pageSize=<n>`

Searches instruments ("activos") by ticker or name. Response: `{ items: [{ id, ticker, name, type }], page, pageSize, total, totalPages }`.

Decisions:
- `search` is required (trimmed); missing/blank -> `400`.
- Case-insensitive substring match on ticker **or** name (`PAMP`, `pamp`, `pampa` all find PAMP). `%`, `_` and `\` in the term are
  matched literally (Prisma's `contains` does not escape them, so the adapter does).
- The cash instrument (ARS, type `MONEDA`) is excluded: only tradable instruments are returned.
- Results are ordered by `ticker` (then `id`), so pages are stable.
- Pagination: `page` >= 1 (default 1), `pageSize` 1..50 (default 10). Invalid or non-numeric values -> `400`;
  a page past the end is valid and returns empty `items`. `totalPages = ceil(total / pageSize)`.
- Performance: see "Search scalability" below.

### Search scalability (known limitation, not implemented)

The search runs `ILIKE '%term%'` against PostgreSQL. A leading wildcard cannot use a btree index, so each query scans
the whole `instruments` table. With the 65 instruments of this challenge that is irrelevant, but with a large table the
response times would degrade as the table grows (and `count(*)` for the pagination total adds to the cost).

A solution that scales is to serve the search from a reverse (inverted) index such as OpenSearch, kept in sync with
PostgreSQL by a replication mechanism:
- PostgreSQL stays the source of truth. Changes to `instruments` are replicated to an OpenSearch index (for example with
  change data capture on the table, or an outbox table consumed by a worker), so the index is eventually consistent.
- The index analyzes `ticker` and `name` (case folding, accent folding, prefix/n-gram tokens), which makes searches fast
  regardless of table size and allows relevance ranking (e.g. exact ticker first) and typo tolerance.
- Thanks to the hexagonal architecture the change is contained: add an adapter that implements
  `InstrumentRepositoryPort.searchTradable` with OpenSearch queries and bind it to `INSTRUMENT_REPOSITORY` in
  `instruments.module.ts`. The use case, controller and API contract do not change.
- Trade-off: extra infrastructure to operate and a short replication lag, so a just-created instrument may take a moment to
  show up in the search results.

A cheaper intermediate step, if the table grows moderately, is a `pg_trgm` GIN index on `ticker`/`name`, which makes
`ILIKE '%term%'` index-assisted without adding new infrastructure.

## `POST /orders`

Submits a BUY or SELL order. Body:

```json
{ "userId": 1, "instrumentId": 47, "side": "BUY", "type": "MARKET", "size": 10 }
{ "userId": 1, "instrumentId": 47, "side": "SELL", "type": "LIMIT", "amount": 10000, "price": 900 }
```

- `side`: `BUY` | `SELL`; `type`: `MARKET` | `LIMIT`.
- Exactly one of `size` (integer > 0, exact shares) or `amount` (pesos to invest; the system orders `floor(amount / price)`
  whole shares, no fractions).
- `price` (> 0, at most 2 decimals) is required for `LIMIT` and ignored for `MARKET`.

Response `201` with the stored order (`id`, `userId`, `instrumentId`, `side`, `type`, `size`, `price`, `status`, `datetime`).
Errors: `400` invalid input (including both/neither of `size`|`amount`, an `amount` too small for one share, trading the
cash instrument), `404` unknown user or instrument, `422` MARKET order for an instrument without market data.

Rules and assumptions:
- **MARKET** orders execute immediately at the `close` of the latest `marketdata` row -> `FILLED`.
- **LIMIT** orders are stored as `NEW`. The market is not simulated, so they stay `NEW` (until the cancel feature exists).
- **Funds validation** (MARKET and LIMIT): a BUY needs `size * price` pesos available, a SELL needs at least `size` shares
  (a zero or negative position can never sell). Otherwise the order is stored as `REJECTED` and the response is still
  `201`: the order exists, check `status`. Spending exactly the available cash is allowed.
- Available cash and shares are computed from `FILLED` orders only (`src/shared/ledger.ts`, shared with the portfolio).
  `NEW` orders do not reserve cash or shares.
- Executed orders update the positions automatically: the portfolio is derived from the `FILLED` orders.
- **Concurrency**: the funds check and the insert run in one transaction after locking the user row
  (`SELECT ... FOR UPDATE`), so concurrent orders of the same user are serialized and cannot overspend.
- Invalid requests (400/404/422) are not stored.
- Not covered by this endpoint: cancelling `NEW` orders and cash transfers (`CASH_IN`/`CASH_OUT`).
- Tests: `src/orders/application/place-order.use-case.spec.ts` is the functional test of the order submission (use case and
  domain rules with in-memory adapters); `test/orders.e2e-spec.ts` covers the HTTP layer.
