import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Verifies .env.example against the S-5 acceptance criteria.
 *
 * claire-dashboard is a static Vite + React SPA. The ONLY environment value
 * the code reads is Vite's built-in import.meta.env.BASE_URL (src/data/loader.ts),
 * derived from the `base` option in vite.config.ts. There are no runtime
 * secrets, backend, database or custom VITE_* variables. .env.example must
 * document exactly that surface and nothing invented.
 *
 * The "env coverage" test below does NOT hardcode that fact: it scans the
 * source for every environment variable the code actually reads and asserts
 * .env.example documents each one. If a future change adds a new
 * `import.meta.env.VITE_*` or `process.env.*` read, this test fails in CI
 * until the variable is added to .env.example — that is the regression guard.
 */

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const envExamplePath = resolve(repoRoot, ".env.example");
const srcRoot = resolve(repoRoot, "src");

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

/** Every source file we scan for env access. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d)) {
      const p = join(d, entry);
      if (statSync(p).isDirectory()) {
        walk(p);
      } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry) && !/\.test\.[jt]sx?$/.test(entry)) {
        out.push(p);
      }
    }
  };
  if (existsSync(dir)) walk(dir);
  // vite.config.ts sits at the repo root, outside src/.
  const viteConfig = resolve(repoRoot, "vite.config.ts");
  if (existsSync(viteConfig)) out.push(viteConfig);
  return out;
}

/**
 * Vite injects these on import.meta.env regardless of any .env file, so they
 * are never expected to be listed as configurable variables. BASE_URL is the
 * one we document explicitly (it maps to vite.config.ts `base`), so it is NOT
 * excluded here — the code reading it must be matched by documentation.
 */
const VITE_BUILTINS = new Set(["MODE", "DEV", "PROD", "SSR"]);

/** Scan the source for every environment variable name the code reads. */
function referencedEnvVars(): string[] {
  const found = new Set<string>();
  // import.meta.env.FOO and process.env.FOO / process.env["FOO"]
  const patterns = [
    /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g,
    /import\.meta\.env\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/g,
    /process\.env\.([A-Z][A-Z0-9_]*)/g,
    /process\.env\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/g,
  ];
  for (const file of sourceFiles(srcRoot)) {
    const text = readFileSync(file, "utf8");
    for (const re of patterns) {
      for (const m of text.matchAll(re)) {
        const name = m[1];
        if (!VITE_BUILTINS.has(name)) found.add(name);
      }
    }
  }
  return [...found].sort();
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

  it("env coverage: every variable the code reads is documented in .env.example", () => {
    // Data-driven regression guard. Derives the required set by scanning the
    // source rather than trusting a hardcoded list, so a newly added env read
    // that is not documented fails CI here.
    const referenced = referencedEnvVars();
    const documented = new Set(documentedKeys(readEnvExample()));
    const undocumented = referenced.filter((v) => !documented.has(v));
    expect(undocumented).toEqual([]);
    // Sanity: the scan is actually finding the one variable the code reads.
    expect(referenced).toContain("BASE_URL");
  });

  it("guards against phantom keys: documents no variable the code does not read", () => {
    // The other direction of coverage: .env.example must not invent a variable
    // that no source file reads (a phantom key the next person would hunt for).
    const referenced = new Set(referencedEnvVars());
    const documented = documentedKeys(readEnvExample());
    const phantom = documented.filter((k) => !referenced.has(k));
    expect(phantom).toEqual([]);
  });
});
