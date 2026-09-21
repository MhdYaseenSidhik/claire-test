#!/usr/bin/env bash
# S-3 acceptance test — proves `docker compose up` serves claire-dashboard healthy.
#
# Verifies every S-3 acceptance criterion that can be checked by running the stack:
#   1. `docker compose config` validates the compose file
#   2. `docker compose up -d --build` brings the app up with one build
#   3. the `app` service reaches Docker health state "healthy"
#   4. the served page returns HTTP 200
#   5. a committed CSV under /data/ is reachable (HTTP 200) — proves the runtime
#      CSV fetch the SPA depends on will succeed
#
# Requires: docker (with the compose plugin) and curl. Run from the repo root:
#   ./scripts/acceptance.sh
#
# Exits 0 only if every check passes; non-zero (and prints FAIL) otherwise.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

HOST_PORT="${HOST_PORT:-8080}"
BASE="http://localhost:${HOST_PORT}"
SERVICE="app"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-120}"

pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; exit 1; }

cleanup() { docker compose down -v --remove-orphans >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "==> [1/5] docker compose config validates"
docker compose config >/dev/null || fail "docker compose config did not validate"
pass "compose file is valid"

echo "==> [2/5] docker compose up -d --build"
docker compose up -d --build || fail "docker compose up failed"
pass "stack started"

echo "==> [3/5] wait for '${SERVICE}' to report healthy (timeout ${WAIT_TIMEOUT}s)"
cid="$(docker compose ps -q "$SERVICE")"
[ -n "$cid" ] || fail "no container id for service '${SERVICE}'"
deadline=$(( $(date +%s) + WAIT_TIMEOUT ))
while :; do
  status="$(docker inspect -f '{{ .State.Health.Status }}' "$cid" 2>/dev/null || echo unknown)"
  case "$status" in
    healthy) pass "container is healthy"; break ;;
    unhealthy) docker logs "$cid" | tail -n 40; fail "container became unhealthy" ;;
  esac
  [ "$(date +%s)" -lt "$deadline" ] || { docker logs "$cid" | tail -n 40; fail "timed out waiting for healthy (last: ${status})"; }
  sleep 3
done

echo "==> [4/5] served page returns HTTP 200"
code="$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/")"
[ "$code" = "200" ] || fail "GET / returned ${code}, expected 200"
pass "GET / -> 200"

echo "==> [5/5] committed CSV under /data/ is reachable"
code="$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/data/sales_weekly.csv")"
[ "$code" = "200" ] || fail "GET /data/sales_weekly.csv returned ${code}, expected 200"
pass "GET /data/sales_weekly.csv -> 200"

echo
echo "ALL CHECKS PASSED — docker compose up serves claire-dashboard healthy on ${BASE}"
