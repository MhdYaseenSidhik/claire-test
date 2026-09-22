# S-8 gate execution — infrastructure note (Omar / DevOps)

This file is a write-probe committed alongside the S-8 branch to isolate the CI
blocker. See below.

## Verified this session (2026-09-22)

Two routes exist to produce a readable green gate for S-8's AC4
(type-check / lint / build / test pass on the branch). Both are currently closed,
each confirmed with fresh evidence:

### Route 1 — run the gates locally in the sandbox: CLOSED
The shared workspace cgroup is at its hard PID ceiling:

    pids.current=512  pids.max=512

`/bin/true` — the cheapest possible fork — fails with
`fork: Resource temporarily unavailable`. Therefore `repo_checkout`, `npm ci`,
`tsc`, `eslint`, `vite build` and `vitest` cannot spawn from this seat. This is
not fixable by retrying; it needs a seat with fork headroom (verify with
`git ls-remote` exiting 0 before handoff).

### Route 2 — install a CI workflow so GitHub's runners produce the verdict: CLOSED
A `PUT` to `.github/workflows/ci.yml` on this branch returns **HTTP 404**
(GitHub's masked-403 for a write the token is not scoped for), while a `PUT` to
this sibling file in the **same directory on the same branch** succeeds. That
contrast isolates the cause to the connected token lacking the **`workflow`**
OAuth scope — not connectivity, not branch protection, not a general write fault.

## To unblock (commander-owned — either one)

1. **Grant the connected GitHub token the `workflow` scope**, then re-run this
   task; the same `PUT` will then write `.github/workflows/ci.yml` and CI runs on
   PR #27, producing a verdict readable via `github_pr_checks`; **or**
2. **Provide a sandbox seat with fork headroom** (`pids.current` well below
   `pids.max`, `git ls-remote` exits 0), then re-run the one-shot:
   `repo_checkout` → `npm ci && npm run typecheck && npm run lint && npm run build`
   → `vitest run` over `src/design-tokens.test.ts`, and record the counts.

The ready-to-install workflow YAML is documented in PR #32
(`.github/CI_PIPELINE.md`) and is identical to what a maintainer can commit
directly to `.github/workflows/ci.yml` on `main`.
