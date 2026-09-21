"""QA verification for S-7: hello.py prints exactly "Hello, World!".

Written to run under BOTH pytest (`python -m pytest tests/test_hello.py`) and
the stdlib runner (`python -m unittest tests.test_hello`), so the acceptance
criterion is provable even on a constrained runner where pytest cannot be
installed. The primary check execs the script in-process and captures stdout
without spawning a child, so it needs no free PID slot; a second check runs the
real subprocess when the runner has room and is skipped otherwise.

Run:  python -m pytest tests/test_hello.py
  or: python -m unittest tests.test_hello
"""

import contextlib
import io
import subprocess
import sys
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "hello.py"
EXPECTED = "Hello, World!\n"


def _run_inprocess() -> str:
    source = SCRIPT.read_text()
    buffer = io.StringIO()
    namespace = {"__name__": "__main__"}
    with contextlib.redirect_stdout(buffer):
        exec(compile(source, str(SCRIPT), "exec"), namespace)
    return buffer.getvalue()


class HelloWorldTest(unittest.TestCase):
    def test_hello_inprocess_stdout_exact(self):
        self.assertEqual(_run_inprocess(), EXPECTED)

    def test_hello_subprocess_stdout_exact(self):
        try:
            result = subprocess.run(
                [sys.executable, str(SCRIPT)],
                capture_output=True,
                text=True,
            )
        except BlockingIOError:
            self.skipTest("no PID slot to spawn subprocess; covered in-process")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, EXPECTED)
        self.assertEqual(result.stderr, "")


# pytest-style functions so the file is collected identically by either runner.
def test_hello_inprocess_stdout_exact():
    assert _run_inprocess() == EXPECTED


def test_hello_subprocess_stdout_exact():
    try:
        result = subprocess.run(
            [sys.executable, str(SCRIPT)], capture_output=True, text=True
        )
    except BlockingIOError:
        import pytest

        pytest.skip("no PID slot to spawn subprocess; covered in-process")
    assert result.returncode == 0, result.stderr
    assert result.stdout == EXPECTED
    assert result.stderr == ""


if __name__ == "__main__":
    unittest.main()
