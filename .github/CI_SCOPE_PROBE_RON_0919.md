# CI scope probe — Ron, 2026-09-19

Control for the workflow-scope bisect. A write to `.github/workflows/ci.yml`
on this same branch returns HTTP 404 (GitHub's masked-403 for a token missing
the `workflow` OAuth scope), while this normal file in the same `.github/`
directory commits fine — proving write access is intact and only workflow
files are blocked.
