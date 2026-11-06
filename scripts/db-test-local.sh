#!/usr/bin/env bash
# Sobe um Postgres 16 descartável, aplica o esqueleto do Supabase, as migrações e roda os testes pgTAP.
# Uso: scripts/db-test-local.sh [arquivo_de_teste...]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
DATA="${PGDATA_DIR:-/tmp/pauta-pg}"
PORT="${PGPORT_LOCAL:-54399}"
RUNAS=""
if [ "$(id -u)" = "0" ]; then RUNAS="runuser -u postgres --"; mkdir -p "$DATA"; chown postgres "$DATA"; fi
if [ ! -f "$DATA/PG_VERSION" ]; then $RUNAS "$PGBIN/initdb" -D "$DATA" -U postgres -A trust >/dev/null; fi
$RUNAS "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp" -l "$DATA/log" status >/dev/null 2>&1 || \
  $RUNAS "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp -c listen_addresses=''" -l "$DATA/log" -w start >/dev/null
PSQL="psql -h /tmp -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -d postgres -c "drop database if exists pauta_test" -c "create database pauta_test" >/dev/null
$PSQL -d pauta_test -f "$ROOT/scripts/supabase-stub.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/*.sql; do
  $PSQL -d pauta_test -f "$f" >/dev/null || { echo "falhou: $f"; exit 1; }
done
echo "migrações aplicadas"
if [ "${1:-}" = "--seed" ]; then shift; $PSQL -d pauta_test -f "$ROOT/supabase/seed.sql" >/dev/null && echo "seed aplicado"; fi
TESTS=("$@"); [ ${#TESTS[@]} -eq 0 ] && TESTS=("$ROOT"/supabase/tests/*.sql)
fail=0
for t in "${TESTS[@]}"; do
  out=$(psql -h /tmp -p $PORT -U postgres -d pauta_test -X -q -t -A -f "$t" 2>&1) || true
  if echo "$out" | grep -qE "^not ok|ERROR|Looks like"; then echo "FALHOU $(basename "$t")"; echo "$out" | grep -E "^not ok|ERROR|#" | head -20; fail=1
  else echo "ok $(basename "$t") ($(echo "$out" | grep -c '^ok'))"; fi
done
exit $fail
