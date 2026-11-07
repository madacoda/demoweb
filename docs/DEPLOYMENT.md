# GHCR and production deployment

The local checkout is `C:\www\demoweb`. `origin` is [madacoda/demoweb](https://github.com/madacoda/demoweb); `upstream` preserves [monsieurafa/demo-district](https://github.com/monsieurafa/demo-district) history.

Production URL: **https://demoweb.madacoda.dev**. The application uses **1112** locally, inside the container, and on the VPS loopback interface.

## Release pipeline

1. A pull request runs the frozen Bun install, lint, formatting, types, real PostgreSQL tests, production build and Chromium browser tests.
2. CI builds a Linux amd64 image with Node.js 24 and Bun 1.4.4. The standalone Next.js runtime runs as the non-root `node` user.
3. Container checks verify database migrations, pages/static assets, persisted cart/session data after application and database restart, and HTTP 503 when PostgreSQL is unavailable. Deployment control tests use **explicit fake Docker responses** to verify rejection, credential cleanup and rollback.
4. Successful main runs publish the exact tested image to GHCR with `sha-<full-commit>` and `latest` tags. The workflow passes its immutable `ghcr.io/madacoda/demoweb@sha256:...` digest to deployment.
5. The deployment job checks that its commit is still main, then uses a restricted SSH key to deploy that digest. It waits for container health and verifies the public HTTPS health endpoint.

Publication uses `GITHUB_TOKEN` with `packages: write`. Deployment uses its own short-lived job token with `packages: read`. The token travels over SSH stdin and is stored in a temporary mode-700 Docker configuration directory, removed on exit. A permanent registry token is unnecessary for this pipeline. The package must grant this repository Actions access; its visibility can remain private.

## GitHub configuration

Create the `production` environment in **Settings → Environments** and set these environment secrets:

| Secret            | Value                                                                            |
| ----------------- | -------------------------------------------------------------------------------- |
| `VPS_HOST`        | The VPS IP address or SSH hostname                                               |
| `VPS_USER`        | SSH account holding the restricted authorized key; this installation uses `root` |
| `VPS_PORT`        | `22`, or the configured SSH port                                                 |
| `VPS_SSH_KEY`     | Dedicated Demoweb CI private key, including its header and footer                |
| `VPS_KNOWN_HOSTS` | Verified SSH host-key entries for that host and port                             |

Set repository **Actions variable** `VPS_DEPLOY_ENABLED=true` once server provisioning and HTTPS are ready. Setting it to `false` pauses deployment while keeping CI and publication active. Never disable SSH host-key verification. Verify a host fingerprint through a trusted channel before saving it.

The dedicated key is restricted in the server account's `authorized_keys`:

```text
restrict,command="/opt/demoweb/deploy-image.sh /opt/demoweb" ssh-ed25519 <public-key> demoweb-github-actions
```

The fixed command accepts only a digest from this repository plus registry credentials. It does not evaluate `SSH_ORIGINAL_COMMAND`, provide an interactive shell, forward ports or accept arbitrary paths. Keep the administrator SSH key separate. Updating Compose, the deployment script, Nginx or secrets requires administrator provisioning; ordinary releases update only the image.

## Server provisioning

Requires Docker Engine, Docker Compose v2, Bash, `flock`, Nginx and Certbot. Create `/opt/demoweb` with mode 700. Copy these reviewed files there:

- `compose.production.yaml`
- `scripts/deploy-image.sh` as `deploy-image.sh` (mode 755)
- `deploy/nginx/renew-hook.sh` as `renew-hook.sh` (mode 755)

Generate the deployment environment on a trusted machine with Node.js 24:

```sh
node scripts/setup-production-env.mjs
```

Transfer the resulting ignored `.env.deploy` to `/opt/demoweb/.env.deploy` through SSH and set mode 600. The generator creates a random database password and matching internal URL, preserves existing files and never prints credentials. Do not use the local development `.env`: it addresses host port 5433 instead of the production `db:5432` service.

| Setting                                             | Meaning                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| `DEMOWEB_IMAGE`                                     | Default image for manual commands; CI overrides it with a verified digest |
| `DEMOWEB_BIND_ADDRESS`                              | `127.0.0.1`; Nginx is the public entrypoint                               |
| `DEMOWEB_PORT`                                      | `1112`; container port is also 1112                                       |
| `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PASSWORD` | Database initialization settings                                          |
| `DATABASE_URL`                                      | Connection string for `db:5432`; password must match PostgreSQL           |
| `DEMO_NAMESPACE`                                    | Optional application namespace; defaults to `default`                     |

PostgreSQL has no published host port. Production records live in the `demoweb_postgres_data` volume. The web container is limited to 768 MiB and one CPU; PostgreSQL to 512 MiB and one CPU. Both have PID limits. Application startup waits for healthy PostgreSQL and successful transactional migrations; `/health` checks database readiness.

## DNS and HTTPS

1. Point the `demoweb` DNS A record at the VPS. With Cloudflare proxying enabled, configure **Full (strict)** for this hostname using a configuration rule. Preserve unrelated hostnames' settings.
2. Install `deploy/nginx/demoweb-http.conf` as `/etc/nginx/sites-available/demoweb`, enable its symlink under `sites-enabled`, create `/var/www/demoweb-acme`, validate `nginx -t` and reload.
3. Issue the certificate:

```sh
certbot certonly --webroot -w /var/www/demoweb-acme \
  -d demoweb.madacoda.dev --email <operator-email> --agree-tos \
  --non-interactive --deploy-hook /opt/demoweb/renew-hook.sh
```

4. Replace that virtual host with `deploy/nginx/demoweb.conf`, validate `nginx -t` and reload. This enables HTTPS, redirects HTTP, preserves the ACME challenge path and proxies to `127.0.0.1:1112`. Check the Certbot renewal timer.
5. Verify both `https://demoweb.madacoda.dev/health` and the application in a browser.

The proxy supplies the external host and HTTPS scheme for same-origin validation and Secure cookies. Access logs omit query strings. A Cloudflare Flexible setting causes redirect loops with this HTTPS origin; use the hostname-scoped strict rule.

These are intentionally faulty UAT targets with synthetic accounts. Use synthetic data when testing them. Veriflow can target the public HTTPS address; its container's loopback does not refer to Demoweb.

## Updating, diagnostics and rollback

After checks pass, merge the pull request. Main publishes and deploys automatically. SSH deployment is serialized with `flock`; failed health checks restore the previous local image, or stop the failed web container on the first release. PostgreSQL data is retained. The successful digest is atomically written to `/opt/demoweb/current-image`.

To inspect or restart the current release as an administrator, explicitly use that retained digest; `.env.deploy` may still contain the initial default tag:

```sh
cd /opt/demoweb
export DEMOWEB_IMAGE="$(cat current-image)"
docker compose --env-file .env.deploy -f compose.production.yaml ps
docker compose --env-file .env.deploy -f compose.production.yaml logs --tail 100 web
docker compose --env-file .env.deploy -f compose.production.yaml up -d --wait --pull never
curl --fail http://127.0.0.1:1112/health
```

For a manual code rollback, set `DEMOWEB_IMAGE` to a previous verified digest, authenticate/pull it if no longer cached, then run `up -d --wait`. After confirming health, record that digest in `current-image`. An image rollback does **not** reverse database migrations or restore records. Back up PostgreSQL and `.env.deploy` before schema changes; keep migrations compatible with the previous release.

Database credentials are initialized only for an empty volume. Changing the environment file does not rotate an existing database password. Never run `down -v` against production unless deliberately deleting its data. This single-VPS setup can briefly interrupt requests during an application replacement; it is not a zero-downtime deployment.

## Local verification

```sh
bun run lint
bun run format:check
bun run typecheck
docker build -t demoweb:test .
bash scripts/tests/deploy.test.sh
bash scripts/container-smoke.sh demoweb:test
```

The container smoke script requires Bash, Docker Compose, Node.js 24 and free **test-only host port 3002**; the container still listens on 1112. It creates fresh isolated PostgreSQL data and cleans up only that disposable project. GitHub Actions provides the authoritative Linux container check when Docker is unavailable locally.

References: [GitHub registry authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry), [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) and [Cloudflare encryption modes](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/).
