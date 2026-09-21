import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Verifies .env.example against the S-5 acceptance criteria.
 *
 * claire-dashboard is a static Vite + React SPA. The ONLY environment value
 * the code reads is Vite's built-in import.meta.env.BASE_URL (src/data/loader.ts),
 * derived from the `base` option in vite.config.ts. There are no runtime
 * secrets, backend, database or custom VITE_* variables. .env.example must
 * document exactly that surface and nothing invented.
 */

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const envExamplePath = resolve(repoRoot, ".env.example");

function readEnvExample(): string {
  return readFileSync(envExamplePath, "utf8");
}

/**
 * Every KEY= token that appears in the file, whether on a bare line or shown
 * as a placeholder inside a comment. This is what catches a phantom key: a
 * variable the code does not read being documented as if it did.
 */
function documentedKeys(text: string): string[] {
  const keys = new Set<string>();
  for (const rawLine of text.split(/\r?\n/)) {
    // Strip a single leading comment marker so `#   BASE_URL=/` is inspected
    // the same as a bare `BASE_URL=/`.
    const line = rawLine.replace(/^\s*#\s?/, "").trim();
    const m = line.match(/^([A-Z][A-Z0-9_]*)\s*=/);
    if (m) keys.add(m[1]);
  }
  return [...keys].sort();
}

describe(".env.example (S-5)", () => {
  it("AC1: exists at the repo root", () => {
    expect(existsSync(envExamplePath)).toBe(true);
  });

  it("AC2: documents BASE_URL with a placeholder and an explanatory comment", () => {
    const text = readEnvExample();
    // Placeholder assignment showing the shape of the value (bare or in a comment).
    expect(text).toMatch(/^\s*#?\s*BASE_URL\s*=/m);
    // Names the code path it is read from and the mechanism that sets it.
    expect(text).toMatch(/import\.meta\.env\.BASE_URL/);
    expect(text).toMatch(/vite\.config\.ts/);
    // Explains what it is (the base path the app is served under).
    expect(text.toLowerCase()).toMatch(/base path|served under|sub-path/);
  });

  it("AC3: states plainly that the app reads no runtime secrets / backend / database", () => {
    const lower = readEnvExample().toLowerCase();
    expect(lower).toMatch(/no runtime secrets|reads no runtime secret|no .*secret/);
    expect(lower).toMatch(/no backend|no api|no database/);
    // Tells the next person not to hunt for phantom keys.
    expect(lower).toMatch(/phantom|not listed below|does not read it/);
  });

  it("AC4: contains no real secret patterns", () => {
    const text = readEnvExample();
    const secretPatterns: Array<[string, RegExp]> = [
      ["AWS access key id", /AKIA[0-9A-Z]{16}/],
      ["private key block", /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/],
      ["GitHub token", /gh[pousr]_[A-Za-z0-9]{36,}/],
      ["Slack token", /xox[baprs]-[A-Za-z0-9-]{10,}/],
      ["Google API key", /AIza[0-9A-Za-z_-]{35}/],
      ["Stripe live key", /sk_live_[0-9a-zA-Z]{24,}/],
      ["JWT", /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],
      // A key/token/secret/password assigned a long non-placeholder value.
      [
        "assigned credential value",
        /(?:secret|token|password|passwd|api[_-]?key|access[_-]?key)\s*=\s*["']?[A-Za-z0-9/+=_-]{16,}["']?/i,
      ],
    ];
    const hits = secretPatterns
      .filter(([, re]) => re.test(text))
      .map(([label]) => label);
    expect(hits).toEqual([]);
  });

  it("guards against phantom keys: documents no variable other than BASE_URL", () => {
    // The app reads exactly one env value (import.meta.env.BASE_URL). The file
    // may present it only as a commented placeholder — that is correct, since
    // BASE_URL is not actually a runtime .env var. What must never happen is a
    // second key appearing as if the code read it.
    const keys = documentedKeys(readEnvExample());
    const phantom = keys.filter((k) => k !== "BASE_URL");
    expect(phantom).toEqual([]);
  });
});
