#!/usr/bin/env bash
set -euo pipefail

: "${1:?Pass the locally built image tag}"
export DEMOWEB_IMAGE="$1"
temp_dir=$(mktemp -d)
project="demoweb-smoke-${GITHUB_RUN_ID:-local}-$$"
compose=(docker compose --project-name "$project" --env-file "$temp_dir/app.env" -f compose.production.yaml)
cleanup() {
  result=$?
  if [ "$result" -ne 0 ]; then
    "${compose[@]}" logs --tail=80 web || true
  fi
  # Only this script's disposable project/volume is removed.
  "${compose[@]}" down --volumes --remove-orphans || true
  rm -rf -- "$temp_dir"
  exit "$result"
}
trap cleanup EXIT
node --input-type=module - "$temp_dir/app.env" <<'NODE'
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const password = randomBytes(24).toString('hex');
writeFileSync(process.argv[2], [
  `DEMOWEB_IMAGE=${process.env.DEMOWEB_IMAGE}`,
  'DEMOWEB_PORT=3002',
  `POSTGRES_PASSWORD=${password}`,
  `DATABASE_URL=postgresql://demo_district:${password}@db:5432/demo_district`,
  ''
].join('\n'), {mode: 0o600, flag: 'wx'});
NODE
"${compose[@]}" config --quiet
"${compose[@]}" up -d --wait --wait-timeout 180
"${compose[@]}" exec -T web node -e 'if (process.getuid() === 0) process.exit(1)'
node scripts/container-http-smoke.mjs create http://127.0.0.1:3002 "$temp_dir/state.json"
"${compose[@]}" stop web db
"${compose[@]}" up -d --wait --wait-timeout 180
node scripts/container-http-smoke.mjs restore http://127.0.0.1:3002 "$temp_dir/state.json"
"${compose[@]}" stop db
node scripts/container-http-smoke.mjs unavailable http://127.0.0.1:3002 "$temp_dir/state.json"
