# CI installation status — S-6

**Deliverable:** `.github/workflows/ci.yml` — a GitHub Actions pipeline that runs on
every pull request and on pushes to `main`, and fails the build on any gate:
`npm ci` → `npm run typecheck` → `npm run lint` → `npm test` → `npm run build`.

**State:** the workflow YAML is authored and ready (recorded verbatim in
`.github/CI_WORKFLOW.md`). It is **not yet on `main`** because the connected token
lacks the `workflow` OAuth scope: a write to `.github/workflows/ci.yml` returns
HTTP 404, while a write to any other `.github/` path on the same branch succeeds.

**One action installs it** (either):
1. Grant the token the `workflow` scope, then re-run this ticket; or
2. A maintainer commits `.github/workflows/ci.yml` with the contents in
   `.github/CI_WORKFLOW.md`.

Once installed, `github_workflow_runs` will show runs and PRs will be gated.
