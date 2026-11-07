# Extraction and PostgreSQL verification

Verified locally on 2026-11-07.

## Scope

- Moved all seven websites and their browser tests out of `Veriflow 2` into this independent repository.
- Preserved the Next.js, React, and Bun implementation and existing site routes. The default server port is now 3001; `/` opens the site directory.
- Replaced both file-backed stores with PostgreSQL transactions. There is no runtime file-store fallback and no dependency on Veriflow packages.
- Added Docker Compose, a named PostgreSQL volume, a generated ignored environment file, migration/import commands, database health checks, and an isolated test setup.
- Created private GitHub repository `monsieurafa/demo-district`.

## Local acceptance evidence

- `bun run lint`, `bun run format:check`, and `bun run typecheck` passed.
- `bun run build` passed for the standalone repository, including the final explicit build/tracing root configuration.
- `bun run test`: **20 passed**, against real PostgreSQL. Tests cover prices, stock, variants, discounts, session/account isolation, password/token hashing, checkout idempotency, cancellation, reservations, task changes, applications, conversations, reset, and fresh-process persistence.
- Separate Node processes competed for event capacity and store inventory; PostgreSQL allowed only the valid reservation/order and prevented overselling. Failed operations rolled back; failed-login counters persisted as intended.
- `bun run test:browser`: **27 passed** in Chromium on the production build with PostgreSQL. All seven site journeys, the fixed/broken coupon contract, session isolation, HTTP validation, and mobile accessibility checks passed.
- Browser tests used a disposable `e2e-` namespace; backend tests used separate `test-` namespaces. Teardown removed only test records.
- The Docker database reports **PostgreSQL 18.6**, healthy, bound to `127.0.0.1:5433`, with its named data volume mounted at `/var/lib/postgresql`.
- The legacy storefront and one district workspace were imported atomically. After restarting the Docker database, a field-by-field comparison against both legacy inputs passed. No customer records or session data were discarded.
- Browser preview at `http://127.0.0.1:3001/demo/sites` loaded all seven sites and completed its PostgreSQL bootstrap. Screenshot: `/tmp/demo-district-postgres.jpg` (local evidence, not checked in).

## Source repository

- Veriflow's working tree is clean. No tracked Veriflow implementation or shared contracts were changed.
- The former untracked demo subtree, its two browser test files, and its legacy data directories are no longer in Veriflow. Recovery copies are under this repository's ignored `.local/extraction-backup`; the original import inputs are under ignored `.local/legacy-import`.
- Removed stale generated Next.js route caches after extraction, then rebuilt Veriflow successfully. Its build no longer contains `/demo` routes.
- Veriflow's two remaining Chromium smoke tests passed after extraction.

## Boundaries

Application records are durable PostgreSQL data; payments, physical bookings/fulfillment, hiring, and staff responses remain simulated. Local `.env`, migration backups, database data, dependencies, screenshots, and browser reports are excluded from Git. The CI workflow uses a freshly generated database password and runs the same checks with Docker PostgreSQL.
