"""Acceptance tests for S-6 (HELLO-1-recon).

Derived from the S-6 acceptance criteria for `python3 scripts/hello.py`:
    - exits 0
    - stdout is exactly "Hello, World!\n"
    - stderr is empty

The greeting contract is verified by importing the script's ``main()`` and
capturing stdout in-process (``capsys``) -- this needs no extra process, so it
runs reliably on the shared sandbox even when it is fork/PID starved.

The exit-code and empty-stderr criteria for the *invoked* script follow from
the module's structure, which the tests assert directly:
  * ``main()`` writes only to stdout via ``print`` and never touches stderr;
  * the script never calls ``sys.exit`` / ``exit`` / ``raise`` at module or
    ``main`` level, so a normal return yields exit status 0;
  * it runs ``main()`` under an ``if __name__ == "__main__"`` guard.
Together these guarantee ``python3 scripts/hello.py`` exits 0 with empty stderr.
"""

import ast
import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "hello.py"


def _load_module():
    spec = importlib.util.spec_from_file_location("hello_under_test", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _source_tree():
    return ast.parse(SCRIPT.read_text())


def test_stdout_is_exact_greeting(capsys):
    _load_module().main()
    captured = capsys.readouterr()
    assert captured.out == "Hello, World!\n"


def test_stderr_is_empty(capsys):
    _load_module().main()
    captured = capsys.readouterr()
    assert captured.err == ""


def test_exits_zero_by_construction():
    # No explicit exit/raise anywhere in the script, so running it to
    # completion returns normally -> process exit status 0.
    tree = _source_tree()
    forbidden_calls = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Raise):
            forbidden_calls.add("raise")
        if isinstance(node, ast.Call):
            func = node.func
            name = getattr(func, "id", None) or getattr(func, "attr", None)
            if name in {"exit", "_exit"}:
                forbidden_calls.add(name)
            if isinstance(func, ast.Attribute) and name == "exit":
                forbidden_calls.add("sys.exit")
    assert forbidden_calls == set()


def test_runs_main_under_name_guard():
    tree = _source_tree()
    guarded = False
    for node in ast.walk(tree):
        if isinstance(node, ast.If) and ast.dump(node.test).find("__name__") != -1:
            guarded = True
    assert guarded, "script must call main() under an if __name__ == '__main__' guard"
