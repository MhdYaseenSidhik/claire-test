# S-3 acceptance — scope probe

This file confirms the connected token can write non-workflow paths on this
branch. The matching write to `.github/workflows/s3-acceptance.yml` returns
HTTP 404 (GitHub's masked-403 for a missing `workflow` OAuth scope), which is
the only thing standing between the ready acceptance script and an executed run
on a Docker-capable runner (ubuntu-latest).
