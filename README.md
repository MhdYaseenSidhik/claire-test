# claire-dashboard — Sales & Churn Dashboard

A single-page **Sales & Churn dashboard** built with **Vite + React + TypeScript**.
It renders committed synthetic datasets (weekly sales and a customer book) that
the browser fetches at runtime and validates against a schema guard before they
reach the UI. There is **no backend, database, cache or queue** — it is a static
front end that ships its data alongside the bundle.

> **New here? Read this file top to bottom.** Everything from a clean checkout to
> a running, tested app is below, with the exact command for each step — no "run
> the dev server", the actual command for *this* project.

---

## What this is

- **Framework:** Vite 5 + React 18 + TypeScript 5.6 (SPA, client-rendered).
- **Styling:** plain CSS with custom properties (`src/index.css`, `src/tokens.css`) — not Tailwind, not CSS-in-JS.
- **Data:** committed CSVs under `public/data/`, parsed with [papaparse] and checked by a schema guard (`src/data/loader.ts`).
- **Tests:** Vitest (jsdom).
- **Runtime shape:** static assets served by any web server; the Docker image serves them with nginx.

---

## Prerequisites

| Tool | Version | Needed for | Where to get it |
|---|---|---|---|
| **Node.js** | **20.x** (any 20.x LTS; ≥ 20.9 recommended) | install, run, build, test | <https://nodejs.org> or `nvm install 20 && nvm use 20` |
| **npm** | **10.x** (ships with Node 20) | package management | comes with Node |
| **Docker** + Compose plugin | 24+ (Compose v2) | `docker compose up` | <https://docs.docker.com/get-docker/> |
| **Python** | 3.8+ | *optional* — regenerating the synthetic CSVs only | <https://www.python.org/downloads/> |

Check what you have:

```bash
node --version   # expect v20.x
npm --version    # expect 10.x
docker --version # expect 24+ (only if using Docker)
```

Node **must be major version 20**. Vite 5 and the toolchain here are not
supported on Node 18 or lower, and Node 22/23 are untested for this project.

---

## Install

The repo commits a `package-lock.json`, so install reproducibly:

```bash
npm ci        # clean, lockfile-exact install — use this
```

Use `npm install` only when you are intentionally changing dependencies (it may
update the lockfile). For a normal checkout, `npm ci` is correct and faster.

---

## Run it locally

Start the Vite dev server (hot reload, for iteration):

```bash
npm run dev
```

Vite prints the local URL — by default **<http://localhost:5173>**. Open that in
a browser. The page fetches the CSVs from `public/data/` and renders the
dashboard.

To run a **production build** exactly as it will be served (this is what the
Docker image and any static host use):

```bash
npm run build     # tsc --noEmit && vite build  -> outputs to dist/
npm run preview   # serves dist/ locally, default http://localhost:4173
```

`npm run build` type-checks first (`tsc --noEmit`) and fails the build on any
type error, then produces the static bundle in `dist/` with the CSVs copied in.

---

## Run the tests

The full unit-test suite (Vitest, single run — not watch mode):

```bash
npm test          # = vitest run
```

Watch mode while developing a test:

```bash
npx vitest         # re-runs on change
```

Run one file or one test by name:

```bash
npx vitest run src/data/loader.test.ts
npx vitest run -t "schema guard"
```

The other quality gates, run individually:

```bash
npm run typecheck   # tsc --noEmit — types only, no output
npm run lint        # eslint . --ext .ts,.tsx --max-warnings 0 (zero warnings allowed)
```

`npm run build` runs the type-check as part of the build, so a green build
implies a green type-check.

---

## Run it in Docker

The production Docker image is a **multi-stage build** — it builds the bundle on
`node:20-alpine`, then serves the static `dist/` behind `nginx:1.27-alpine`, so
the final image contains no Node or build tools. It runs nginx as a **non-root**
user and therefore listens on the unprivileged port **8080** inside the
container.

One command brings the whole thing up:

```bash
docker compose up            # builds the image and serves the app
```

Compose waits until the container reports **healthy** before it says it is up.
Open the app at:

```
http://localhost:8080
```

Stop and clean up:

```bash
# Ctrl-C to stop, then:
docker compose down
```

Build and run the image directly, without Compose:

```bash
docker build -t claire-dashboard:local .
docker run --rm -p 8080:8080 claire-dashboard:local
# then open http://localhost:8080
```

There is **no database, cache or queue** to start — the stack is a single web
service. The container's healthcheck probes both the app shell (`/`) and a
committed dataset (`/data/sales_weekly.csv`), so a *healthy* container proves the
data the SPA fetches at runtime is actually being served.

> The Docker files (`Dockerfile`, `docker-compose.yml`, `nginx.conf`,
> `.dockerignore`, `scripts/acceptance.sh`) are delivered by the containerization
> work on branch `feature/s-9-dockerfile-multi-stage-build-run-image-p` (PR #31).
> If `docker compose up` reports "no configuration file", that PR has not been
> merged into `main` yet — check it out or merge it first.

---

## Configuration & environment variables

This app reads **no runtime secrets** — there are no API keys, connection
strings or tokens to configure. The only configurable value is a **build-time**
setting:

| Name | What it is | Where it is set | Default |
|---|---|---|---|
| `BASE_URL` | Public base path the app is served under. Read in code as `import.meta.env.BASE_URL` (`src/data/loader.ts`) to resolve the CSV paths, e.g. `${BASE_URL}data/sales_weekly.csv`. | **Not** an env var. Derived by Vite from the `base` option in `vite.config.ts` (currently `"./"`), or overridden per build with `vite build --base=/my/path/`. | `./` (relative — works from the domain root, a sub-path, or `file://`) |

To serve the app under a sub-path, change `base` in `vite.config.ts` or pass
`--base` to the build:

```bash
npx vite build --base=/dashboard/
```

There is no `.env` file to fill in for a normal run. A commented
`.env.example` documenting the `BASE_URL` knob is delivered on branch
`feature/s-5-env-example-clean` (S-5); copy it to `.env` only if you introduce a
local override. **If a variable is not listed above, the project does not read
it** — do not go looking for phantom keys.

---

## Regenerating the datasets (optional)

The CSVs under `public/data/` are committed and deterministic (seeded), so you do
not need to regenerate them to run the app. If you want to, or you're changing
the schema:

```bash
python scripts/generate_data.py
```

This rewrites `public/data/sales_weekly.csv` (52 weeks × 4 regions) and
`public/data/customers.csv` (600 rows) with a fixed seed, so the output is
reproducible. To drive the dashboard with **real** data instead, replace those
files with exports using the same headers — no code change required:

- `sales_weekly.csv` — `week, region, revenue, orders, new_customers`
- `customers.csv` — `customer_id, region, signup_date, mrr, tenure_months, churned`

The schema guard (`src/data/loader.ts`) rejects a file with a missing column, a
non-numeric `revenue`, or a `churned` value outside `{0,1}` — throwing a
`SchemaError` that names the file and offending field rather than letting bad
data reach the UI. The contract is pinned by `src/data/loader.test.ts`.

---

## Project layout

```
public/data/            committed CSV datasets (fetched at runtime)
scripts/
  generate_data.py      seeded synthetic-data generator
  acceptance.sh         end-to-end Docker acceptance test (PR #31)
src/
  data/
    types.ts            Dataset / SalesRow / CustomerRow types
    loader.ts           fetch + parse + schema guard
    loader.test.ts      loader contract tests
  index.css             component styles
  tokens.css            design tokens (colors, spacing, type scale)
  App.tsx               dashboard view
  main.tsx              React entry
index.html
vite.config.ts          Vite + Vitest config (base path, test pool)
Dockerfile              multi-stage build -> nginx runtime (PR #31)
docker-compose.yml      one-command stack, gated on healthcheck (PR #31)
nginx.conf              static root, SPA history fallback, CSV type (PR #31)
```

---

## CI

`.github/workflows/ci.yml` is intended to run `npm ci`, lint, typecheck, tests
and build on every push to `main` and every pull request. **Note:** landing that
workflow requires the connected token to carry the `workflow` scope; until it
does, pull requests show *"no checks configured"* (CI-absent, not failing) and
the gates must be run locally with the commands above.

---

## Troubleshooting

These are the failures people actually hit on this project.

### `npm run dev` / `npm test` fails with `fork: Resource temporarily unavailable` or `spawn ... EAGAIN`
The machine's process/thread table is exhausted — the OS cannot spawn a child.
This is an **environment condition, not a code or test failure**: no test ran.
It shows up on shared/constrained runners.
- **Fix:** free up processes and retry; confirm headroom first with
  `echo ok && git status` (both should succeed without a `fork` error).
- On a CI/constrained runner, prefer the single-process test pool:
  `npx vitest run --pool=forks --poolOptions.forks.singleFork=true`.

### Vitest won't start / aborts with a `uv_thread_create` assertion or produces no report
The Vitest worker pool can't spawn its worker under a constrained thread table.
`vite.config.ts` currently pins `pool: "threads"`; on a starved host that pool
can't boot.
- **Fix:** run with the forks pool for one process:
  `npx vitest run --pool=forks --poolOptions.forks.singleFork=true`.
  (The permanent switch to `forks`/`singleFork` is tracked in S-4.)

### Tests fail on a loader/import error right after switching branches
A stale or partially-installed `node_modules` (e.g. a shared or interrupted
install) fakes a red test that isn't real.
- **Fix:** reinstall clean — `rm -rf node_modules && npm ci` — then re-run
  `npm test`.

### The page loads but is blank / shows no data, and the console shows a 404 for `/data/*.csv`
The app couldn't fetch the CSVs. Two common causes:
- You're serving under a **sub-path** but `base` is wrong. The CSV URL is built
  from `BASE_URL` (see Configuration). Serve from the root, or set `base`
  correctly in `vite.config.ts` / `--base` and rebuild.
- You opened `dist/index.html` from disk without a server, or a static server
  isn't serving `/data/`. Use `npm run preview`, or in Docker confirm the
  container is **healthy** (its healthcheck probes `/data/sales_weekly.csv`).

### `SchemaError: <file> ...` on load
A CSV under `public/data/` doesn't match the expected schema (missing column,
non-numeric `revenue`, or `churned` not in `{0,1}`). The error names the file
and field.
- **Fix:** correct the file to the headers listed under *Regenerating the
  datasets*, or regenerate with `python scripts/generate_data.py`.

### `npm run lint` fails with warnings
Lint is configured with `--max-warnings 0` — a warning fails the gate.
- **Fix:** resolve the reported warnings; there is no threshold to raise.

### Build or install fails with an engine/syntax error mentioning Node
You're on the wrong Node major (18 or 22+). Vite 5 here targets **Node 20**.
- **Fix:** `nvm install 20 && nvm use 20`, then `rm -rf node_modules && npm ci`.

### `docker compose up` says "no configuration file provided"
The Docker files aren't on your current branch — they land via PR #31 (see *Run
it in Docker*).
- **Fix:** check out `feature/s-9-dockerfile-multi-stage-build-run-image-p` or
  merge PR #31.

### Container starts but never reports healthy
The healthcheck probes `/` **and** `/data/sales_weekly.csv` on `:8080`. If the
CSV isn't in the image, health never passes.
- **Fix:** inspect logs with `docker compose logs app`; confirm the build copied
  `public/data/` into `dist/` (it does via `vite build`) and that
  `curl -I http://localhost:8080/data/sales_weekly.csv` returns `200`.

[papaparse]: https://www.papaparse.com/
