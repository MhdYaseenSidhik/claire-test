# CI pipeline — ready to install

This file is the ready-to-land CI workflow for `claire-test`. It cannot yet be
written to `.github/workflows/ci.yml` because the connected GitHub token lacks
the `workflow` OAuth scope: a `PUT` to `.github/workflows/*.yml` returns HTTP 404
(GitHub's masked-403 for a missing-scope write), while a write to a sibling path
in `.github/` — such as this file — succeeds. That difference is the proof the
block is scope-specific, not a general write problem.

## What it does

Runs on every pull request to `main` and on pushes to `main`. It executes the
five gates a reviewer would otherwise run by hand, and **fails the build if any
of them fails** — so a green PR is real evidence, not "it passed on my machine":

1. `npm ci` — reproducible install from the committed `package-lock.json`
2. `npm run build` — `tsc --noEmit && vite build`
3. `npm run typecheck` — `tsc --noEmit`
4. `npm run lint` — `eslint . --ext .ts,.tsx --max-warnings 0`
5. `npm test` — `vitest run`

## To install it (one of)

- **Grant the connected token the `workflow` OAuth scope**, then re-run this task —
  the same `PUT` will then write `.github/workflows/ci.yml` and CI runs on the next PR; **or**
- **A maintainer commits the YAML below directly** to `.github/workflows/ci.yml` on `main`.

## The workflow (`.github/workflows/ci.yml`)

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

# Cancel superseded runs on the same ref so a new push doesn't queue behind a stale one.
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  gates:
    name: install · build · type-check · lint · test
    runs-on: ubuntu-latest
    steps:
      - name: Check out the code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies (reproducible)
        run: npm ci

      - name: Build
        run: npm run build

      - name: Type-check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test
```
