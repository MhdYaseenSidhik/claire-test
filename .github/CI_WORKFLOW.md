# CI workflow — pending token `workflow` scope

This repository has **no** GitHub Actions workflow on `main`, so nothing runs on a
pull request and tests only ever ran on individual machines. The fix is a single
file: `.github/workflows/ci.yml`, which runs the four review gates on every PR and
push to `main`, failing the build on any of them:

| Gate       | Command            |
|------------|--------------------|
| Install    | `npm ci`           |
| Type-check | `npm run typecheck`|
| Lint       | `npm run lint`     |
| Test       | `npm test`         |
| Build      | `npm run build`    |

## Why the workflow file itself is not in this commit

The connected GitHub token (`MhdYaseenSidhik`) lacks the **`workflow`** OAuth scope.
GitHub refuses any write to a path under `.github/workflows/` with an HTTP 404
(its masked-403 for a missing-scope write), while a write to any other path — such
as this file, in the same `.github/` directory on the same branch — succeeds. That
proves the block is scope-specific, not a general write-permission problem.

## To finish this (commander action, one of):

1. **Grant the token the `workflow` scope** (GitHub → Settings → Developer settings →
   the PAT/OAuth app used here → enable `workflow`), then re-run this ticket — the
   YAML below will push and CI will start gating PRs; **or**
2. **A maintainer commits the file directly** using the exact contents below.

## Ready-to-commit contents of `.github/workflows/ci.yml`

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
    name: install · build · typecheck · lint · test
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
