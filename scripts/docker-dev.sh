#!/bin/sh
# Entry point of the `dev` container: reinstall dependencies after package-lock.json
# changes (e.g. after `git pull`), then start the dev server.
set -eu

hash=$(sha256sum package-lock.json | cut -d' ' -f1)
if [ "$(cat node_modules/.lock-hash 2>/dev/null || true)" != "$hash" ]; then
  echo "package-lock.json changed: installing dependencies"
  npm ci --no-audit
  echo "$hash" > node_modules/.lock-hash
fi

exec npm run dev -- --host 0.0.0.0
