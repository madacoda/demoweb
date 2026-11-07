#!/bin/sh
set -eu

# The existing migration uses a transaction and advisory lock. Fail closed.
node /app/migrate.mjs
exec node /app/server.js
