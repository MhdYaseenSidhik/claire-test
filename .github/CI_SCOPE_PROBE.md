# CI scope probe

Diagnostic probe written 2026-09-19 to confirm the connected token can write
normal paths on this branch while a write to `.github/workflows/ci.yml` returns
HTTP 404. A 404 (not 422/409) on the workflow path is GitHub's masked-403 for a
token missing the `workflow` OAuth scope.

This file is harmless and can be removed on merge.
