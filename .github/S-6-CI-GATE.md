# S-6 CI gate — pending `workflow` token scope

The four-gate CI workflow for this branch could not be committed by the
connected GitHub App/token because writing `.github/workflows/ci.yml` returns
HTTP 404 — GitHub's masked-403 for a token without the `workflow` OAuth scope.
This file, written to the SAME `.github/` directory on the SAME branch,
succeeds — proving the block is scope-specific, not a general write failure.

The intended workflow (paste to `.github/workflows/ci.yml`):

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  gates:
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
