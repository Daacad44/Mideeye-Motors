#!/bin/sh
# Mideeye Motors API — container entrypoint.
# Prints an unambiguous status line for every step so a broken deploy is
# diagnosable from `docker logs` / the Coolify deploy log alone.
set -u

echo "───────────────────────────────────────────────"
echo "[boot] Mideeye Motors API starting"
echo "[boot] NODE_ENV=${NODE_ENV:-unset}  PORT=${PORT:-unset}"
if [ -z "${DATABASE_URL:-}" ]; then
  echo "[boot] FATAL: DATABASE_URL is not set. Set it in the environment and redeploy."
  exit 1
fi
# Print the DB host:port/name without leaking credentials.
echo "[boot] DATABASE_URL target: $(echo "$DATABASE_URL" | sed -E 's#//[^@]*@#//<redacted>@#')"

echo "[boot] Applying database schema (prisma migrate deploy)…"
if npx prisma migrate deploy; then
  echo "[boot] migrate deploy: OK"
else
  echo "[boot] migrate deploy FAILED — falling back to prisma db push"
  echo "[boot] (this is expected on Coolify's very first deploy, or if the DB"
  echo "[boot]  already has schema without migration history / drift)"
  if npx prisma db push --skip-generate; then
    echo "[boot] db push: OK"
  else
    echo "[boot] FATAL: both migrate deploy and db push failed."
    echo "[boot] Either the database is unreachable/misconfigured (check"
    echo "[boot] DATABASE_URL and that Postgres is healthy), OR db push refused"
    echo "[boot] because applying it would lose existing data — in that case"
    echo "[boot] this needs a human to review the schema diff, not an auto-retry."
    exit 1
  fi
fi

echo "[boot] Seeding (idempotent — ensures the Super Admin exists)…"
if node dist/prisma/seed.js; then
  echo "[boot] seed: OK"
else
  echo "[boot] WARNING: seed failed — continuing anyway (see error above)."
fi

echo "[boot] Starting server: node dist/src/index.js"
echo "───────────────────────────────────────────────"
exec node dist/src/index.js
