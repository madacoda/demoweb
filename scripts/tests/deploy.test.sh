#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "$0")/../.." && pwd)
temp_dir=$(mktemp -d)
trap 'rm -rf -- "$temp_dir"' EXIT
mkdir -p "$temp_dir/bin" "$temp_dir/deploy"
export AUDIT_ROOT="$temp_dir" PATH="$temp_dir/bin:$PATH"
new_image="ghcr.io/madacoda/demoweb@sha256:$(printf 'a%.0s' {1..64})"
old_image="ghcr.io/madacoda/demoweb@sha256:$(printf 'b%.0s' {1..64})"
touch "$temp_dir/deploy/.env.deploy" "$temp_dir/deploy/compose.production.yaml"
cat > "$temp_dir/bin/docker" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "${DEMOWEB_IMAGE:-none} $*" >> "$AUDIT_ROOT/calls"
if [[ " $* " == *' login '* ]]; then
  cat >/dev/null
  [[ "${MOCK_FAILURE:-}" != login ]]
elif [[ " $* " == *' pull '* ]]; then
  [[ "${MOCK_FAILURE:-}" != pull ]]
elif [[ " $* " == *' up '* && "${MOCK_FAILURE:-}" == health && "${DEMOWEB_IMAGE:-}" == "$NEW_IMAGE" ]]; then
  exit 1
fi
MOCK
chmod +x "$temp_dir/bin/docker"
cat > "$temp_dir/bin/curl" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf 'curl %s\n' "$*" >> "$AUDIT_ROOT/calls"
[[ "${MOCK_FAILURE:-}" != proxy ]]
MOCK
chmod +x "$temp_dir/bin/curl"
export NEW_IMAGE="$new_image"
run_deploy() {
  printf '%s\nmadacoda\nexplicit-fake-token\n' "$1" | bash "$repo_root/scripts/deploy-image.sh" "$temp_dir/deploy"
}
reset_case() {
  : > "$temp_dir/calls"
  printf '%s\n' "$old_image" > "$temp_dir/deploy/current-image"
  unset MOCK_FAILURE
}
assert_no_credentials() {
  [[ -z "$(find "$temp_dir/deploy" -maxdepth 1 -type d -name '.registry.*' -print -quit)" ]]
  ! grep -q 'explicit-fake-token' "$temp_dir/calls"
}

reset_case
run_deploy "$new_image"
[[ "$(cat "$temp_dir/deploy/current-image")" == "$new_image" ]]
assert_no_credentials

for failure in login pull; do
  reset_case
  export MOCK_FAILURE="$failure"
  if run_deploy "$new_image"; then echo "Expected $failure failure" >&2; exit 1; fi
  [[ "$(cat "$temp_dir/deploy/current-image")" == "$old_image" ]]
  if grep -q ' up ' "$temp_dir/calls"; then echo 'Unexpected service update' >&2; exit 1; fi
  assert_no_credentials
done

reset_case
export MOCK_FAILURE=health
if run_deploy "$new_image"; then exit 1; fi
grep -q "$old_image .* up " "$temp_dir/calls"
[[ "$(cat "$temp_dir/deploy/current-image")" == "$old_image" ]]
assert_no_credentials

reset_case
export MOCK_FAILURE=proxy
if run_deploy "$new_image"; then exit 1; fi
grep -q "$old_image .* up " "$temp_dir/calls"
[[ "$(cat "$temp_dir/deploy/current-image")" == "$old_image" ]]
assert_no_credentials

reset_case
rm -- "$temp_dir/deploy/current-image"
export MOCK_FAILURE=health
if run_deploy "$new_image"; then exit 1; fi
grep -q ' stop web' "$temp_dir/calls"
if grep -q 'down\|--volumes' "$temp_dir/calls"; then echo 'Unexpected destructive action' >&2; exit 1; fi
[[ ! -e "$temp_dir/deploy/current-image" ]]
assert_no_credentials

reset_case
if run_deploy 'ghcr.io/another/project:latest'; then exit 1; fi
[[ ! -s "$temp_dir/calls" ]]
printf 'Deployment control tests passed using explicit fake Docker responses.\n'
