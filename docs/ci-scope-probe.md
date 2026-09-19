# CI scope probe

This file confirms whether normal-path writes succeed on this branch.
If this commits but `.github/workflows/ci.yml` returns 404, the connected
token lacks the GitHub `workflow` OAuth scope required to create or update
files under `.github/workflows/`. To be removed.
