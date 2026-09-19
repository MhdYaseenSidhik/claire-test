# CI scope probe (this run, 2026-09-19)

Control file to distinguish a general write failure from a `workflow`-scope
failure. This file writes at a normal path; the sibling PUT to
`.github/workflows/ci.yml` on this same branch returns HTTP 404.

If this commit exists and the workflow PUT 404s, the connected token lacks the
`workflow` OAuth scope — CI cannot be wired without a maintainer committing the
workflow file or the token being re-scoped.
