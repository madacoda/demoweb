# The Demo District

Eight functional sample websites in an independent repository. Next.js + React + Bun, with **PostgreSQL 18 running in Docker** for all persistent data. There is no JSON-file, SQLite, or in-memory persistence fallback.

## Start locally

Requirements: Bun 1.4.4+, Node.js 24+, Docker Engine with Docker Compose. Docker Desktop or Colima can provide Docker on macOS. Start Docker Desktop or run `colima start` before the setup command.

```sh
bun install --frozen-lockfile
bun run setup
bun run dev
```

Open [the directory](http://127.0.0.1:3001). The app uses **port 3001**, leaving port 3000 available for Veriflow. PostgreSQL is bound to **127.0.0.1:5433**, with data in the Docker named volume `demo-district_postgres_data`.

`setup` generates an ignored `.env` with a random local database password, starts the database, waits for its health check, and applies the versioned schema. An existing `.env` is kept unchanged. `.env.example` documents the configuration; never commit your real `.env`.

For production preview, use `bun run build` then `bun run start`. PostgreSQL must remain running. `/health` reports 200 only when the database and application table are reachable.

## Websites

| Website       | URL                    | Seeded content         | Working journeys                                                                                                          |
| ------------- | ---------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| People HRIS   | `/hris`                | 6 accounts, 3 requests | Employee leave submission, manager approval/rejection, HR balances, role permissions, filtering/pagination, audit history |
| Form & Field  | `/demo`                | 8 products             | Browse, search, variants, favorites, account registration/login, bag, coupon, checkout, receipt, history, cancellation    |
| Haven         | `/demo/sites/haven`    | 9 stays                | Destination/guest filters, date pricing, reservations, overlap checks, booking history, cancellation                      |
| Table & Thyme | `/demo/sites/thyme`    | 12 dishes              | Menu filters, basket quantities, offers, pickup checkout, saved orders, receipts, cancellation                            |
| Daybreak      | `/demo/sites/daybreak` | 12 tasks               | Create/edit/delete, projects, assignees, priorities, due dates, board/list, status changes                                |
| Gather        | `/demo/sites/gather`   | 8 events               | Discover/filter, capacity checks, ticket reservations/downloads, history, cancellation                                    |
| Hireline      | `/demo/sites/hireline` | 10 jobs                | Search/filter, save/unsave, validated applications, duplicate prevention, history, withdrawal                             |
| Careloop      | `/demo/sites/careloop` | 6 conversations        | Create requests, search/filter, reply, resolve/reopen, persistent conversations, help articles                            |

The directory is `/demo/sites`; `/` redirects there. All eight sites include forms, validation, loading/error/empty states, responsive layouts, and durable data. The six district apps have separate domain collections within a browser-scoped workspace. Form & Field has its own accounts and session model.

This is a local evaluation environment: payments, physical reservations, fulfillment, employer contact, and messages to support staff are simulated. Submitted records are actually saved in PostgreSQL. The directory reset affects only the current browser's six district workspaces; it does not reset Form & Field or People HRIS.

## Test lab and realistic UAT

Open **[the test lab](http://127.0.0.1:3001/lab)** for **28 repeatable presets** and **85 acceptance workflows**. Download the JSON catalog from `/lab/cases`. It is an acceptance-plan catalog, not a Veriflow schema import, and does not claim exhaustive coverage of every possible edge case.

Presets include three-role HRIS journeys, login/lockout, guest cart merge, session expiry, combined filters, Unicode/literal markup, empty/full workspaces, stock/capacity boundaries, booking overlaps, stale edits, delayed saves, 429/503 errors, and a successful commit followed by an interrupted response. Correct and deliberately broken coupon controls verify that a runner distinguishes passing and failing assertions.

Starting a preset creates fresh PostgreSQL data in its own namespace and sets separate HttpOnly lab cookies. Normal sessions remain intact; **Leave lab & restore normal data** switches back to them. All tabs in one browser share the active run. Runs expire after 24 hours; `bun run db:prune-lab` removes only expired runs in the configured namespace.

Six district websites now keep search/filter state in the URL, including reload/Back behavior. Clear filters resets every control. Daybreak detects stale edits using record versions, and ambiguous failed submissions retain their request IDs when retried unchanged.

People is a complete HRIS target with employee, manager and HR roles, not a role selector layered over a single account. See [HRIS policies, sample accounts and acceptance journey](docs/HRIS.md). The lab shows all synthetic credentials. Employees submit and cancel their own leave; managers decide only for their direct reports; HR monitors balances and adjusts allowances with an audit reason. Pending requests reserve balance, and invalid or repeated transitions cannot deduct days twice.

## Database

```sh
bun run db:up       # start PostgreSQL and wait for readiness
bun run db:migrate  # idempotent schema migration
bun run db:check    # version and record counts without customer data
bun run db:down     # stop containers, preserving the data volume
```

Schema changes are versioned in `schema_migrations`. `demo_state` stores JSONB documents keyed by namespace, domain, and ID. Form & Field uses one transactional store document to coordinate accounts, sessions, inventory, and orders. Each district browser workspace has its own document and row lock. People HRIS uses a transactional company document containing accounts, requests, session hashes, idempotency records and audit history. `lab_sessions` tracks isolated test runs and atomically claims one-shot faults. Existing domain rules are preserved while durability and concurrency control move into PostgreSQL.

Every mutation uses one checked-out database connection and a `BEGIN` / `SELECT … FOR UPDATE` / `COMMIT` transaction. Invalid actions roll back. Failed sign-in counters deliberately commit before returning an authentication error. Concurrent Node processes share database locks; correctness does not depend on an in-process queue. See the [node-postgres transaction documentation](https://node-postgres.com/features/transactions).

The PostgreSQL 18 container mounts `/var/lib/postgresql`, following the [official image layout](https://hub.docker.com/_/postgres). `docker compose down` preserves data. Adding `-v` would delete the database volume; use that only to intentionally erase all local application data.

Passwords use salted scrypt hashes; browser tokens are hashed before storage. Cookies are HttpOnly, SameSite=Lax, and Secure on HTTPS. API bodies are limited to 16 KiB and cross-site browser requests are rejected. These samples do not provide production account administration or automatic data-retention jobs.

## Tests

```sh
bun run lint
bun run format:check
bun run typecheck
bun run test
bun run build
bun run browsers:install
bun run test:browser
```

Use `bun run test`, which invokes Node's test runner against real PostgreSQL. Backend tests create temporary database namespaces and delete only those records. Browser tests start the production app on port 3001 using an `e2e-` namespace; stop your local app first. Normal records in the default namespace are untouched. No fake database or browser adapters are used.

Tests cover full journeys, mobile accessibility, persistence across processes, request isolation, invalid actions, atomic inventory/ticket capacity, checkout replay, and cancellation. Cross-process tests send competing mutations from separate Node processes.

## Veriflow integration

Run Veriflow from its own repository on port 3000 and use this app's port 3001 URLs as external targets. There are no imports from or package dependencies on Veriflow.

The existing coupon target contract is preserved:

- Fixed: `http://127.0.0.1:3001/demo?bug=0`
- Deliberately broken: `http://127.0.0.1:3001/demo?bug=1`
- Fill `coupon-input` with `SAVE10`, click `apply-coupon`, and assert exact `order-total` text `90000`.
- Initial total: `100000`; broken mode deliberately retains it. Fixture baskets remain separate from normal shopping baskets.

If Veriflow's browser runner is in another container, use a reachable host address (for example, `host.docker.internal`) and bind Next to the appropriate interface explicitly. Default scripts bind only to loopback.

## One-time legacy import

Import the old local demo records into an empty namespace:

```sh
bun run db:import /absolute/path/store.json /absolute/path/workspaces.json
```

Import is atomic and refuses to overwrite destination records. It preserves password hashes, session hashes, carts, orders, and workspaces. Legacy files are import inputs only; the running application never reads them. Keep any migration backup under ignored `.local/`, outside Git.

## Acceptance and evidence

Task: keep all test websites outside Veriflow in private `monsieurafa/demo-district`, use Docker PostgreSQL, and provide realistic UAT targets including role-based HRIS workflows, filtering and reproducible failure cases. Current verification results are in `VERIFICATION.md`.
