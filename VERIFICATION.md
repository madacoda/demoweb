# Demo District verification

Verified locally on 2026-11-07.

## HRIS and edge-case expansion

Acceptance: add realistic multi-role workflows and reproducible edge cases to the independent repository; keep all website implementation out of Veriflow; retain Docker PostgreSQL as the only persistence backend.

- Eight working websites, including People HRIS with six accounts, three server-enforced roles, employee leave submission/cancellation, team-scoped manager decisions, HR balances, allowance changes, and an audit history.
- 28 isolated lab presets and 85 documented acceptance workflows at `/lab`, downloadable as JSON at `/lab/cases`. These are acceptance plans, not 85 separately executed browser tests or a Veriflow workflow-schema import.
- Six district lists preserve URL filters across Back/reload and reset all controls together. Task edits use versions; task/HRIS retry requests retain IDs after ambiguous failures. HR allowance drafts keep their original version even when a background refresh receives newer data.
- `bun run test`: **77 passed** against real PostgreSQL. Includes all presets, namespace isolation, one-shot fault claiming, HR roles, ownership, validation, balance calculations, simultaneous submissions/decisions, expired sessions, stale versions and idempotency, plus the original domain and cross-process tests.
- `bun run test:browser --workers=2`: **46 passed** on the production build. Includes the full employee → manager → HR UI journey, rejection, forbidden routes/API actions, filtering/pagination/Back/reload, interrupted response recovery, expiry, Unicode, lab isolation/restore, and all original website journeys.
- One additional targeted browser check passed and verifies that an edited HR allowance cannot overwrite a newer adjustment after refreshing data. See the latest CI for the aggregate result.
- Mobile 375px checks and axe checks passed for the lab, HRIS login and HR balances, as well as the original website views. Fixed ambiguous select labels, text contrast and keyboard access to horizontally scrolling tables found during verification.
- Lint, type generation/checking, formatting and production build passed. PostgreSQL migrations preserve existing namespaces and add HRIS documents plus lab session metadata.
- Fault injection is deliberately scoped to lab sessions: slow save, 503 before commit, simulated lost response after commit, 429 with Retry-After and actual stored-session expiry. These are explicitly simulated transport failures around real persisted operations, not fake database adapters.
- Source audit: Veriflow's Git working tree is clean; `git ls-files` contains none of the removed website subtree or its two browser test files. The original product's workflow examples remain product test fixtures; there is no target website implementation or new dependency in Veriflow.

- Visual preview confirmed the test-lab catalog and signed-in HR balance dashboard at port 3001. Screenshots: `/tmp/demo-district-lab.jpg` and `/tmp/demo-district-hris.jpg` (local only).

## Original extraction scope

- Moved all seven websites and their browser tests out of `Veriflow 2` into this independent repository.
- Preserved the Next.js, React, and Bun implementation and existing site routes. The default server port is now 3001; `/` opens the site directory.
- Replaced both file-backed stores with PostgreSQL transactions. There is no runtime file-store fallback and no dependency on Veriflow packages.
- Added Docker Compose, a named PostgreSQL volume, a generated ignored environment file, migration/import commands, database health checks, and an isolated test setup.
- Created private GitHub repository `monsieurafa/demo-district`.

## Original extraction evidence

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
