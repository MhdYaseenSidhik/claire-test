# CI workflow — pending token scope

The four-gate CI workflow (`npm ci` → typecheck → lint → test → build) for this
repo is authored and ready, but it cannot be committed to `.github/workflows/`
by the currently connected GitHub token: a PUT to a `.github/workflows/*.yml`
path returns HTTP 404 (GitHub's masked-403 for a token lacking the `workflow`
OAuth scope), while a PUT to this normal path on the same branch succeeds.

To finish gating the CohortStory ledger enum regression suite in CI, the
connected token needs the `workflow` scope granted, or a maintainer commits the
workflow file below directly.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm run build
```
