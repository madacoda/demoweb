# GHCR and production deployment

The source checkout is `C:\www\demoweb`. `origin` is `https://github.com/madacoda/demoweb.git`; `upstream` is `https://github.com/monsieurafa/demo-district.git`. Upstream history is preserved. This deployment is independent of Veriflow.

## Release pipeline

The workflow first installs the frozen Bun lockfile and runs lint, formatting, types, real PostgreSQL tests, the production build and Chromium browser tests. Its container job builds a Linux amd64 image with Node.js 24 and Bun 1.4.4. The runtime contains Next.js standalone output, static assets, a bundled migration entrypoint and production dependencies, and runs as the non-root `node` user.

Before publication, a disposable Compose project checks real database migrations, non-root execution, pages/static assets, the acceptance catalog, persisted cart/session data across application/database restart, and a 503 readiness response when PostgreSQL is unavailable. The CI cleanup deletes only this disposable project's volume. Production data is separate.

Successful main runs publish the exact tested image:

- `ghcr.io/madacoda/demoweb:sha-<full-commit>` for a source revision.
- `ghcr.io/madacoda/demoweb:latest` for the latest successful release.
- The workflow summary records its immutable `ghcr.io/madacoda/demoweb@sha256:...` reference. Prefer that digest for deployments and rollbacks.

Pull requests run checks and container verification without publishing. Publication uses the workflow's `GITHUB_TOKEN` with `packages: write`; no registry password or custom GitHub secret is needed. The package is linked to the destination repository through its OCI source label. A pre-existing package must grant this repository Actions access. Container packages can initially be private even when their repository is public; keep their existing visibility unless an owner deliberately changes it.

No VPS auto-deployment is configured by this change. It publishes the image and supplies the production Compose definition.

## Run a published image

On a machine with Node.js 24, Docker Engine and Docker Compose v2:

```sh
node scripts/setup-production-env.mjs
docker compose --env-file .env.deploy -f compose.production.yaml pull
docker compose --env-file .env.deploy -f compose.production.yaml up -d --wait
```

The setup command creates an ignored `.env.deploy` with a random database password and a matching internal `DATABASE_URL`. It preserves an existing file and does not print credentials. This filename is deliberately outside Next.js automatic environment loading, so the container's database URL cannot override local development settings. Protect this file and back it up separately from Git. Do not substitute the local-development `.env`: its database URL addresses host port 5433, whereas production uses the internal `db:5432` service.

For a private GHCR package, authenticate the deployment machine first with an account token that has `read:packages`, supplied through `docker login ghcr.io --username <account> --password-stdin`. Never put that token in Compose, Git or image build arguments.

| Setting in `.env.deploy`                            | Meaning                                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `DEMOWEB_IMAGE`                                     | Published image tag or immutable digest                                                                            |
| `DEMOWEB_BIND_ADDRESS`                              | Defaults to `127.0.0.1`; expose through a configured reverse proxy or private network                              |
| `DEMOWEB_PORT`                                      | Host port, default `3001`; container port stays 3001                                                               |
| `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PASSWORD` | Database initialization settings                                                                                   |
| `DATABASE_URL`                                      | Application connection string for `db:5432`; password must match PostgreSQL and be URL-encoded if changed manually |
| `DEMO_NAMESPACE`                                    | Optional application namespace; defaults to `default`                                                              |

The application starts only after PostgreSQL is healthy and the transaction/advisory-lock migration succeeds. `/health` verifies the application table is reachable. The database has no published host port in production. Data lives in `demoweb_postgres_data` with the default Compose project name; the local development stack uses a different volume. `down` preserves the volume; `down -v` deletes its data.

These are UAT targets with synthetic accounts and deliberate lab faults. Use an appropriate private network or access gate for the intended testers. A Veriflow browser container needs a reachable target address: its own loopback is not this container. Configure the shared Docker network or reverse proxy deliberately; keep the project's allowed origin consistent with the chosen URL.

## Updating and rollback

Set `DEMOWEB_IMAGE` to the desired verified digest, then run `pull` and `up -d --wait` again. Retain the previous digest for a code rollback. Database credentials are initialized only on an empty PostgreSQL volume; changing `.env.deploy` alone does not rotate an existing database password. Back up PostgreSQL before schema changes. Restoring an older image does not undo database migrations or restore data.

## Local image verification

```sh
docker build -t demoweb:test .
bash scripts/container-smoke.sh demoweb:test
```

The smoke script requires Bash, Docker Compose, Node.js 24 and free host port 3002. It uses fresh isolated PostgreSQL data and never uses `.env.deploy` or a production volume. Windows can run this check in a Docker-enabled WSL environment; GitHub Actions provides the authoritative Linux image check.

References: [GitHub image publication](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images) and [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).
