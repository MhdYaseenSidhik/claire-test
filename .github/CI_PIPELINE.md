# CI pipeline — ready to install, blocked only on token `workflow` scope

This repository has **no** GitHub Actions workflow on `main`. Nothing runs on a
pull request, so the review gates (install, type-check, lint, test, build) only
ever ran on individual machines. That is exactly what this ticket exists to fix.

## The pipeline

The fix is one file — `.github/workflows/ci.yml` — that runs the five gates on
every pull request and on every push to `main`, and **fails the build on any of
them**. It uses `npm ci` against the committed `package-lock.json`, so the run is
reproducible rather than machine-dependent.

| Gate       | Command             | Backed by (package.json) |
|------------|---------------------|--------------------------|
| Install    | `npm ci`            | `package-lock.json` committed |
| Type-check | `npm run typecheck` | `tsc --noEmit` |
| Lint       | `npm run lint`      | `eslint . --ext .ts,.tsx --max-warnings 0` |
| Test       | `npm test`          | `vitest run` |
| Build      | `npm run build`     | `tsc --noEmit && vite build` |

## Why the workflow file itself is not in this commit

The connected GitHub token (`MhdYaseenSidhik`) lacks the **`workflow`** OAuth
scope. GitHub refuses any write to a path under `.github/workflows/` with an HTTP
404 (its masked-403 for a missing-scope write) — re-confirmed on this branch,
2026-09-21 — while a write to any other path, including this file in the same
`.github/` directory on the same branch, succeeds. That proves the block is
scope-specific, not a general write-permission problem.

## To install CI (commander action, either one):

1. **Grant the token the `workflow` scope** (GitHub → Settings → Developer
   settings → the PAT / OAuth app used here → enable `workflow`), then re-run
   this ticket — the YAML below will push and CI will start gating PRs; **or**
2. **A maintainer commits the file directly** at `.github/workflows/ci.yml`
   using the exact contents below.

## Exact contents of `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  verify:
    name: install · typecheck · lint · test · build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install (clean, from lockfile)
        run: npm ci

      - name: Type-check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test

      - name: Build
        run: npm run build
```
