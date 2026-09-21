"""Standalone QA assertion for S-7 (no third-party deps).

Runs the delivered hello.py as a subprocess and asserts stdout, stderr and exit code.
Exits non-zero on any mismatch so it can gate CI even without pytest installed.
Run:  python tests/verify_hello.py
"""

import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "hello.py"
EXPECTED = "Hello, World!\n"


def main() -> int:
    result = subprocess.run(
        [sys.executable, str(SCRIPT)],
        capture_output=True,
        text=True,
    )
    failures = []
    if result.returncode != 0:
        failures.append(f"exit code {result.returncode} (expected 0)")
    if result.stdout != EXPECTED:
        failures.append(f"stdout {result.stdout!r} (expected {EXPECTED!r})")
    if result.stderr != "":
        failures.append(f"stderr {result.stderr!r} (expected empty)")

    if failures:
        print("FAIL: " + "; ".join(failures))
        return 1
    print(f"PASS: stdout=={EXPECTED!r}, stderr empty, exit 0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
