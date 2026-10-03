# Storefront Backend API

Express 5 + TypeScript + PostgreSQL. Accounts, catalog, cart, checkout, orders, addresses and an
admin namespace, behind a versioned `/api/v1` path.

## Setup

Needs Node.js 22 or later and PostgreSQL (17 in the Docker setup below).

### 1. Install packages

```bash
npm install
```

### 2. Database

PostgreSQL on port **5432**.

**Option A — Docker (recommended):**

```bash
docker compose up -d
```

Starts PostgreSQL 17 and Adminer, and creates `storefront_dev` + `storefront_test`. Both ports
are published to `127.0.0.1` only, so nothing on the local network can reach the database.

**Option B — local PostgreSQL:**

```sql
CREATE USER storefront_user WITH PASSWORD 'storefront_pass';
CREATE DATABASE storefront_dev OWNER storefront_user;
CREATE DATABASE storefront_test OWNER storefront_user;
```

The user has to own both databases: since PostgreSQL 15, `GRANT ALL ON DATABASE` no longer lets
it create tables in the `public` schema, so the migrations would fail.

### 3. Environment

Copy `.env.example` to `.env` and fill it in. The server **refuses to start** when a required
value is missing or too short, so nothing silently falls back to an insecure default. With either
database above, set `POSTGRES_USER=storefront_user` and `POSTGRES_PASSWORD=storefront_pass`.

| Variable | Required | Notes |
| -------- | -------- | ----- |
| `ENV` | – | `dev` (default), `test` or `production` |
| `DATABASE_URL` | one of | A full connection string (managed providers). Takes precedence over the `POSTGRES_*` values |
| `POSTGRES_HOST` / `PORT` / `DB` / `TEST_DB` / `USER` / `PASSWORD` | one of | Used when there is no `DATABASE_URL` |
| `DATABASE_SSL` | – | `off` (local), `verify`, or `no-verify` for a provider with a self-signed certificate. Defaults to `verify` when `DATABASE_URL` is set, `off` otherwise |
| `DATABASE_SSL_CA` | – | A CA certificate to verify against, if the provider publishes one |
| `TOKEN_SECRET` | **yes** | 32+ characters. Signs access tokens |
| `PASSWORD_PEPPER` | **yes** | 32+ characters. Mixed into every password hash |
| `BCRYPT_PASSWORD` | – | The pepper of the **old** hashing scheme. Keep it until every account has signed in once after the upgrade; each login re-hashes that password under `PASSWORD_PEPPER` |
| `SALT_ROUNDS` | – | bcrypt cost, 10–15 (default 10) |
| `ACCESS_TOKEN_EXPIRY` | – | Default `15m`. Access tokens cannot be revoked, so keep this short |
| `REFRESH_TOKEN_EXPIRY_DAYS` | – | Default 7, at most 365 |
| `REFRESH_COOKIE_SAMESITE` | – | `strict`, `lax` or `none` for the refresh cookie. Defaults to `none` under `ENV=production` (frontend and API on different sites) and `strict` otherwise. `none` is refused unless `ENV=production`, which is what sets `Secure` |
| `PORT` | – | Default 3000 |
| `ALLOWED_ORIGIN` | – | Comma-separated browser origins allowed to call the API. Default `http://localhost:4200`, the Angular dev server |
| `TRUST_PROXY` | – | Number of proxies in front of the app. Default 1, right for Railway and similar. Decides which IP the rate limiter and the audit log see; set `0` when clients connect directly, or they can pick their own IP with `X-Forwarded-For` |
| `LOG_LEVEL` | – | `info` by default, `silent` under `ENV=test` |
| `API_RATE_LIMIT` / `AUTH_RATE_LIMIT` | – | Requests per IP per 15 minutes (500 / 20). The auth limit covers register, login and refresh. Neither applies under `ENV=test` |
| `JSON_BODY_LIMIT` | – | Default `1mb`; a larger body answers 413 |
| `AUDIT_LOG_RETENTION_DAYS` / `PAGE_VIEW_RETENTION_DAYS` | – | Default 90 each |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_FIRST_NAME` / `ADMIN_LAST_NAME` | – | Used by `npm run seed:admin` only |

Generate a secret or a pepper with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 4. Run migrations

```bash
npm run migrate:up
```

The SQL lives in `migrations/sqls/`. Migration 20 also installs the `pg_trgm` extension that the
product search uses.

### 5. Create the first admin

Self-registration always creates a `customer`. The only ways to get an `admin` are this script,
or an existing admin calling `POST /api/v1/admin/users` or `PUT /api/v1/admin/users/:id/role`.

```bash
# set ADMIN_USERNAME / ADMIN_PASSWORD (12+ chars) in .env, then:
npm run seed:admin
```

Re-running it is safe: an existing account with that username is promoted, not recreated.

### 6. Start the server

```bash
npm run watch    # development, recompiles and restarts on save
npm run build && npm start
```

The API answers at `http://localhost:3000`, with Swagger UI at `/docs`.

### 7. Run the checks

```bash
npm test         # resets the test database, then the suite
npm run lint
npm run typecheck
npm run format:check
```

CI ([`.github/workflows/backend.yml`](../../.github/workflows/backend.yml)) runs the same checks
against a PostgreSQL 17 service whenever a push to `master` or a pull request touches
`app/backend`. It also runs `npm audit --audit-level=high`, and swaps `npm test` for
`npm run test:coverage`, which fails below 90% statements, functions and lines or 75% branches
([`.c8rc.json`](.c8rc.json)).

Leave `DATABASE_URL` out of a local `.env`. The suite connects through it whenever it is set, even
under `ENV=test`, while the reset step always uses the `POSTGRES_*` values, so the tests would
write their fixtures, admin accounts included, to that database.

---

## Code layout

A request passes through four layers under `src/`:

```
routes/        URL + middleware chain per domain (express.Router), mounted under /api/v1 by routes/index.ts
controllers/   Parse the request with a schema, call a service, send the response
services/      The business rules: ownership, checkout, sessions, passwords, activity
repositories/  One class per domain: parameterized SQL and row mapping, nothing HTTP-specific
```

Each service is built by a factory (`createCartService(deps)` and so on) that receives just the
repository methods and services it calls, typed in `types/service.types.ts`.
[`services/index.ts`](src/services/index.ts) is the one place the real repositories are wired in,
so the unit specs can hand a service plain fakes instead of a database. Work that must succeed or
fail as one (checkout, refresh-token rotation, closing an account, keeping exactly one default
address) runs inside `withTransaction`, which passes a single client to every repository call in it.

Around them:

| Path | What it holds |
| ---- | ------------- |
| `app.ts` | Assembles the Express app (the tests import this) |
| `server.ts` | `listen`, the daily cleanup job, a graceful shutdown on SIGTERM / SIGINT, and a fatal log entry before exiting on an uncaught error |
| `config.ts` | The environment, validated once at startup; nothing else reads `process.env` |
| `database.ts` | The connection pool, `withTransaction`, and the `SELECT 1` behind `/healthz` |
| `logger.ts` | Structured logging (pino) with credentials redacted; every request gets an id, echoed as `X-Request-Id` |
| `schemas/` | zod schemas — one per request body, query or parameter set. They also give the input types |
| `middleware/` | Auth, rate limiting, the audit log, and the 404 and error handlers |
| `utils/` | Response envelope, `AppError`, schema parsing, the refresh cookie |
| `types/` | The shapes passed between layers and returned to clients |
| `scripts/` | `seedAdmin.ts`, behind `npm run seed:admin` |
| `tests/` | `api/` (HTTP through supertest), `repositories/` (SQL against the test database), `unit/` (no HTTP) |

---

## API reference

The full API is described by [`openapi.yaml`](openapi.yaml) (OpenAPI 3.0.3). With the server
running, browse it as Swagger UI:

| URL | What it is |
| --- | ---------- |
| `http://localhost:3000/docs` | Swagger UI — browse and call every endpoint |
| `http://localhost:3000/openapi.yaml` | The raw spec |

Click **Authorize** and paste an `accessToken` to use "Try it out" on authenticated routes.

Both doc routes are public. To take them off a deployed instance, drop the `app.use(docsRoutes)`
line in [`src/app.ts`](src/app.ts).

### Route groups

| Group | Base path | Who |
| ----- | --------- | --- |
| Auth | `/api/v1/auth` | Public, except `me` and `logout-all` |
| Users | `/api/v1/users` | The token's own account only |
| Products | `/api/v1/products` | Any signed-in user; read-only, products on sale only |
| Orders | `/api/v1/orders` | The token's own orders; read-only |
| Cart | `/api/v1/cart` | The token's own cart, and checkout |
| Addresses | `/api/v1/addresses` | The token's own addresses |
| Page views | `/api/v1/page-views` | Any signed-in user |
| Admin | `/api/v1/admin` | Admins: accounts, catalog, orders, carts, addresses, activity |

### Responses

Every `/api/v1` response has the same envelope:

```
{ status: 200, message: "Products fetched.", data: [...], meta: { limit: 50, offset: 0, total: 9 } }
{ status: 400, message: "quantity must be a whole number between 1 and 999", data: null, code: "invalid_request" }
```

On a failure, branch on `code`: the message is written for people and may change.
[API_TESTING.md](API_TESTING.md#errors-you-will-meet) lists each status and code. A 500 never
echoes the underlying error; it is logged under the response's `X-Request-Id` instead.

`GET /products`, `GET /orders` and every admin list are paginated with `?limit=` (1–100,
default 50) and `?offset=`, and return the `meta` object shown above.

### Sessions

`POST /auth/register`, `/auth/login` and `/auth/refresh` return `{ user, accessToken }` and set
the refresh token as an **HttpOnly cookie** (`Path=/api/v1/auth`, `Secure` in production) that
JavaScript cannot read. Browser clients send those calls with credentials.

The `accessToken` goes in an `Authorization: Bearer` header and lasts `ACCESS_TOKEN_EXPIRY`. Once
it runs out, requests answer 401 with `code: "token_expired"`, the cue to call `/auth/refresh`.

`SameSite` follows the deployment, and `REFRESH_COOKIE_SAMESITE` overrides it:

| `ENV` | Default | Why |
| ----- | ------- | --- |
| `production` | `none` | The frontend and the API are on different sites, and a `Strict` cookie would never be sent to `/auth/refresh` — the session could not be renewed. `none` requires `Secure`, which `ENV=production` sets |
| anything else | `strict` | Page and API share `localhost`, so the tightest setting works |

Set `REFRESH_COOKIE_SAMESITE=strict` in production only when the frontend and the API are served
from one site, e.g. `store.example.com` and `api.example.com`. `none` is rejected outside
`ENV=production`, because without `Secure` a browser drops the cookie entirely.

Refresh tokens rotate on every use. A token presented again within 10 seconds of being used (two
tabs refreshing at once) is renewed; any later, it counts as stolen: the whole session is revoked
and the audit log gets a `SECURITY` entry.

### Roles

- **Customers** reach their own account, orders, cart and addresses. Another account's id
  answers `403`, or `404` where the existence of a row should not be revealed.
- **Admins** get `/admin/*`. Cross-account work lives there — an admin's token is not a
  skeleton key on the customer routes.
- Admin routes re-read the role from the database on every call, so a demoted or closed admin
  loses access at once.

### Activity trail

Two tables, kept apart:

- **`audit_logs`** — security-relevant events: every write by a signed-in user, every `/admin`
  read, logins, failed logins, logouts, registrations and replayed refresh tokens, each with a few
  non-secret details. Routine catalog reads are not recorded. Admins read it at
  `GET /api/v1/admin/audit-logs` or on the frontend's **Activity Log** page.
- **`page_views`** — analytics: the pages people open, reported by the frontend with
  `POST /api/v1/page-views` and read at `GET /api/v1/admin/page-views` (the **Page views** page).

Both are read-only over the API, and rows older than their retention setting are deleted daily.

See [API_TESTING.md](API_TESTING.md) for cURL examples and [SECURITY.md](SECURITY.md) for how the
API maps to the OWASP API Security Top 10.

---

## Deploying

The [`Dockerfile`](Dockerfile) builds in two stages and ships a runtime image with no compiler,
no dev dependencies and no TypeScript sources, running as the unprivileged `node` user.

```bash
docker build -t storefront-backend .
docker run --rm -p 3000:3000 --env-file .env storefront-backend
```

Migrations are a **release step**, not something the server does at boot.
[`railway.json`](railway.json) wires that up for Railway (`preDeployCommand`); on another
platform run `npm run migrate:prod` before the new version starts. It connects through
`DATABASE_URL` only.

`GET /healthz` runs `SELECT 1` and answers 503 when the database is unreachable, so a deploy that
cannot reach Postgres never receives traffic. `railway.json` points `healthcheckPath` at it and the
Dockerfile probes the same route.

Migrations read their TLS settings from `DATABASE_SSL` and `DATABASE_SSL_CA` through
[`database.js`](database.js), the same rule `src/config.ts` applies to the app, so the pre-deploy
step cannot end up trusting a certificate the server would reject.

A deployment needs at least `ENV=production`, `DATABASE_URL` (plus `DATABASE_SSL=no-verify` or
`DATABASE_SSL_CA` if the provider's certificate is self-signed), `TOKEN_SECRET`, `PASSWORD_PEPPER`
and `ALLOWED_ORIGIN` set to the frontend's origin. Change `TRUST_PROXY` if there is not exactly
one proxy in front of the app.

## Ports

| Service | Port |
| ------- | ---- |
| Backend | 3000 |
| Database | 5432 (published to `127.0.0.1`) |
| Adminer | 8080 (published to `127.0.0.1`) |

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run watch` | Dev server, recompiles and restarts on save |
| `npm run build` | Compile TypeScript into `dist/` (sources only, no tests) |
| `npm start` | Run the compiled server |
| `npm test` | Reset the test database, then run the suite |
| `npm run test:coverage` | The same suite under `c8`, with a report in `coverage/`; fails below the thresholds in `.c8rc.json` |
| `npm run typecheck` | Type-check everything, including the tests |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm run migrate:up` / `migrate:down` / `migrate:reset` | Migrations on the dev database |
| `npm run migrate:prod` | Migrations on the production database |
| `npm run seed:admin` | Create or promote the admin from `ADMIN_USERNAME` / `ADMIN_PASSWORD` |

Tests run from the TypeScript sources through `tsx`, so `npm test` never touches `dist/` and a
running `npm run watch` survives it.

## Documentation

| File | Contents |
| ---- | -------- |
| [openapi.yaml](openapi.yaml) | OpenAPI 3.0.3 spec — every route, schema and error |
| [API_TESTING.md](API_TESTING.md) | cURL examples for each endpoint |
| [postman/](postman/storefront-api.postman_collection.json) | Postman collection covering every route; saves tokens and ids as it goes |
| [sample-product-data/](sample-product-data/products.json) | Nine sample products for `POST /api/v1/admin/products/bulk` |
| [SECURITY.md](SECURITY.md) | How the API maps to the OWASP API Top 10 |
| [DOCKER_GUIDE.md](DOCKER_GUIDE.md) | The local database in Docker, the production image, upgrading Postgres |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Endpoints and database schema |
