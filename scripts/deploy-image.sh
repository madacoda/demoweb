#!/usr/bin/env bash
set -euo pipefail
umask 077

# Forced SSH command: accepts only an image digest, registry user and token on stdin.
# Never evaluate SSH_ORIGINAL_COMMAND or accept arbitrary commands/paths from CI.
root_dir=$(realpath "${1:-/opt/demoweb}")
valid_image() { [[ "$1" =~ ^ghcr\.io/madacoda/demoweb@sha256:[a-f0-9]{64}$ ]]; }
IFS= read -r -t 15 image
IFS= read -r -t 15 registry_user
IFS= read -r -t 15 registry_token
valid_image "$image" || { echo 'Rejected image reference' >&2; exit 1; }
[[ "$registry_user" =~ ^[A-Za-z0-9][A-Za-z0-9-]{0,38}$ ]] || exit 1
[[ -n "$registry_token" && ${#registry_token} -le 4096 ]] || exit 1
[[ -f "$root_dir/.env.deploy" && -f "$root_dir/compose.production.yaml" ]] || exit 1

exec 9>"$root_dir/deploy.lock"
flock -w 600 9
previous=''
if [[ -f "$root_dir/current-image" ]]; then
  previous=$(cat "$root_dir/current-image")
  valid_image "$previous" || { echo 'Invalid retained image reference' >&2; exit 1; }
fi
auth_dir=$(mktemp -d "$root_dir/.registry.XXXXXX")
trap 'rm -rf -- "$auth_dir"' EXIT
printf '%s\n' "$registry_token" | docker --config "$auth_dir" login ghcr.io --username "$registry_user" --password-stdin
unset registry_token
docker --config "$auth_dir" pull "$image"

compose() {
  local selected_image=$1
  shift
  DEMOWEB_IMAGE="$selected_image" docker --config "$auth_dir" compose \
    --project-name demoweb --env-file "$root_dir/.env.deploy" \
    -f "$root_dir/compose.production.yaml" "$@"
}
# Complete network pulls before replacing a running application.
compose "$image" pull db
if compose "$image" up -d --wait --wait-timeout 180 --pull never && \
  curl --noproxy '*' --fail --silent --show-error --max-time 15 \
    --resolve demoweb.madacoda.dev:443:127.0.0.1 \
    https://demoweb.madacoda.dev/health >/dev/null; then
  image_file=$(mktemp "$root_dir/.image.XXXXXX")
  printf '%s\n' "$image" >"$image_file"
  mv -f -- "$image_file" "$root_dir/current-image"
  printf 'Healthy release: %s\n' "$image"
else
  echo 'Deployment failed health checks.' >&2
  if [[ -n "$previous" ]]; then
    docker image inspect "$previous" >/dev/null
    compose "$previous" up -d --wait --wait-timeout 180 --pull never
    echo 'Restored the previous healthy image.' >&2
  else
    compose "$image" stop web
    echo 'Stopped the failed first release; PostgreSQL data is retained.' >&2
  fi
  exit 1
fi
