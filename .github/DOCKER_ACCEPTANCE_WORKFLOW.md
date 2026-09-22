# S-9 runtime acceptance — CI workflow (ready to install)

The cohort dev/QA sandboxes have **no Docker daemon** (Docker-less by design),
and the connected GitHub App token **lacks the `workflow` OAuth scope**, so this
workflow file cannot be pushed to `.github/workflows/` from the cohort and the
S-9 runtime proof cannot be executed in-cohort.

`ubuntu-latest` GitHub Actions runners **do** have Docker + the compose plugin.
This workflow runs the full S-9 runtime acceptance from a clean checkout with no
host state. **To install it**, either:

1. Grant the connected GitHub App token the `workflow` scope, then re-run the
   DevOps task — the file will push straight to `.github/workflows/`; **or**
2. A maintainer copies the block below verbatim to
   `.github/workflows/docker-acceptance.yml` and commits it.

Once installed it runs on every PR touching the container files (and on demand
via **Run workflow**), and it is the source-of-truth runner for:

- `./scripts/acceptance.sh` — compose config → `up -d --build` → wait `healthy`
  → `GET /` = 200 → `GET /data/sales_weekly.csv` = 200
- `docker exec "$(docker compose ps -q app)" id` → asserts **uid=101** (non-root)

```yaml
# .github/workflows/docker-acceptance.yml
name: docker-acceptance

on:
  pull_request:
    paths:
      - "Dockerfile"
      - ".dockerignore"
      - "nginx.conf"
      - "docker-compose.yml"
      - "scripts/acceptance.sh"
      - ".github/workflows/docker-acceptance.yml"
  workflow_dispatch: {}

jobs:
  acceptance:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout (clean, no host state)
        uses: actions/checkout@v4

      - name: Show Docker versions
        run: |
          docker version
          docker compose version

      - name: Run acceptance script (compose config -> up --build -> healthy -> GET / and CSV = 200)
        run: |
          chmod +x scripts/acceptance.sh
          ./scripts/acceptance.sh

      - name: Prove the runtime process is non-root (uid=101)
        run: |
          set -euo pipefail
          docker compose up -d --build
          cid="$(docker compose ps -q app)"
          echo "container id: $cid"
          echo "== docker exec app id =="
          docker exec "$cid" id
          uid="$(docker exec "$cid" id -u)"
          echo "reported uid: $uid"
          test "$uid" = "101" || { echo "FAIL: expected uid 101, got $uid"; exit 1; }
          echo "PASS: runtime process runs as uid=101 (non-root)"

      - name: Tear down
        if: always()
        run: docker compose down -v --remove-orphans || true
```
