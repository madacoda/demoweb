# The six district apps

`/demo/sites` links six independent brands plus Form & Field. See the [root README](../../../README.md) for the route/feature table, Docker PostgreSQL setup, and tests.

Haven provides hotel reservations; Table & Thyme food ordering; Daybreak project tasks; Gather event tickets; Hireline job applications; Careloop support conversations. Each has search/filtering, forms, persistent mutations, validation, and meaningful empty/error states.

`/demo/sites/api` validates requests and calls `_lib/workspace.ts`. Each browser workspace is its own PostgreSQL JSONB row, accessed with a transactional row lock. Separate browser sessions cannot read or mutate each other's records. Directory reset restores only the current browser's district data, preserving the separate Form & Field store.

Tests: `_lib/workspace.test.ts`, `tests/postgres.test.ts`, and `tests/browser/district.spec.ts`. They use real PostgreSQL and Chromium with disposable namespaces for isolation.
