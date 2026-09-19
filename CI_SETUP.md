# S-6 — CI workflow (ready to install)

The four-gate CI workflow below is ready. It **cannot be committed by the
connected token** because that token lacks the GitHub `workflow` OAuth scope:
a PUT to `.github/workflows/ci.yml` returns HTTP 404 (GitHub's masked-403 for
a missing `workflow` scope), while a PUT to a normal path on the same branch
succeeds. Reproduced live 2026-09-19 on this branch (control commit `89ab3d5`).

**To wire CI, a maintainer must commit the file below to
`.github/workflows/ci.yml`** (or the token must be granted the `workflow`
scope, after which this can be pushed automatically).

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

All four npm scripts (`lint`, `typecheck`, `test`, `build`) exist in
`package.json`, and `package-lock.json` is committed so `npm ci` is
deterministic. The ledger-enum fix (`proposed`/`approved` in
`LEDGER_ENTRY_TYPES`) and its 5-case regression suite are already on `main`
(`src/data/cohortStory.ts`, `src/data/cohortStory.test.ts`).
