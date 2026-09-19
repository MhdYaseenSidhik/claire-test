# CI scope probe — Ron, 2026-09-19T12:17Z

Control write to confirm the connected token can still write normal paths on
this branch while a write to `.github/workflows/ci.yml` returns HTTP 404.

If this file commits but the workflow file 404s, the token still lacks the
`workflow` OAuth scope. The four-gate ci.yml (npm ci → typecheck → lint → test
→ build) is authored and ready to push the moment that scope is granted.
