# CI scope re-probe — 2026-09-19

This file confirms whether the connected token can write to `.github/` on this branch.
If this commit succeeds but `.github/workflows/ci.yml` returns 404, the token lacks
only the `workflow` OAuth scope. The four-gate ci.yml is ready to push the moment
that scope is granted.
