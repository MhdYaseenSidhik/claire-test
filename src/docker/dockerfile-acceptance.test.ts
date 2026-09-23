import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// S-9 acceptance: the six criteria for the production Dockerfile are static,
// verifiable properties of the container source in a clean checkout. This spec
// parses the real Dockerfile and .dockerignore from the repo root and asserts
// each criterion, so `npm test` (and CI on any runner) records a pass/fail per
// criterion without needing a Docker daemon.
//
// The one thing this spec deliberately does NOT claim is live runtime behaviour
// (a running container answering 200, or `id` reporting uid 101 at runtime).
// That is covered by scripts/acceptance.sh on a Docker-capable runner. What is
// asserted here is that the Dockerfile *declares* uid-101 non-root via
// `USER nginx`, which the official nginx:alpine base fixes at uid 101.

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (rel: string) => readFileSync(resolve(repoRoot, rel), "utf8");

const dockerfile = read("Dockerfile");
const dockerignore = read(".dockerignore");

// Instructions with leading `#` comment lines stripped, so assertions match
// real instructions rather than prose in the header comments.
const instructions = dockerfile
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l.length > 0 && !l.startsWith("#"));

const fromLines = instructions.filter((l) => /^FROM\s/i.test(l));

describe("S-9 Dockerfile acceptance", () => {
  it("AC1: is multi-stage — builds the app then serves the production bundle from a separate runtime stage", () => {
    // Two FROM lines = two stages; the build stage runs the app build, the
    // runtime stage copies the built artifact out of it.
    expect(fromLines.length).toBeGreaterThanOrEqual(2);
    expect(dockerfile).toMatch(/FROM\s+node:[^\s]+\s+AS\s+build/i);
    expect(dockerfile).toMatch(/FROM\s+nginx:[^\s]+/i);
    expect(dockerfile).toMatch(/RUN\s+npm\s+run\s+build/);
    // The runtime stage takes the built bundle from the build stage, not a
    // re-build — proof the two stages are wired together.
    expect(dockerfile).toMatch(
      /COPY\s+--from=build\s+\/app\/dist\s+\/usr\/share\/nginx\/html/,
    );
  });

  it("AC2: base images are pinned to explicit versions — no floating latest", () => {
    expect(fromLines.length).toBeGreaterThan(0);
    for (const line of fromLines) {
      const image = line.replace(/^FROM\s+/i, "").split(/\s+/)[0];
      // Must carry an explicit tag...
      expect(image, `FROM without a tag: ${line}`).toMatch(/:/);
      const tag = image.split(":")[1];
      // ...and it must not be the floating `latest`.
      expect(tag, `floating tag in: ${line}`).not.toBe("latest");
      // ...and the tag must pin a concrete version (a digit), not a moving alias.
      expect(tag, `non-version tag in: ${line}`).toMatch(/\d/);
    }
  });

  it("AC3: dependencies install in their own cached layer before the source is copied", () => {
    const idxManifestCopy = dockerfile.search(
      /COPY\s+package\.json\s+package-lock\.json/,
    );
    const idxNpmCi = dockerfile.search(/RUN\s+npm\s+ci/);
    const idxSourceCopy = dockerfile.search(/^\s*COPY\s+\.\s+\.\s*$/m);
    expect(idxManifestCopy, "no `COPY package.json package-lock.json`").toBeGreaterThan(-1);
    expect(idxNpmCi, "no `RUN npm ci`").toBeGreaterThan(-1);
    expect(idxSourceCopy, "no `COPY . .`").toBeGreaterThan(-1);
    // Order matters: manifest copy, then install, then the full source copy.
    // A code-only change then invalidates only the layers from `COPY . .` on,
    // reusing the cached `npm ci` layer.
    expect(idxManifestCopy).toBeLessThan(idxNpmCi);
    expect(idxNpmCi).toBeLessThan(idxSourceCopy);
  });

  it("AC4: the runtime container runs as a non-root user (nginx = uid 101)", () => {
    // The runtime stage must switch to a non-root USER, applied in the nginx
    // runtime stage (after the second FROM), not the build stage.
    const runtimeStart = dockerfile.search(/FROM\s+nginx:/i);
    const userMatches = [...dockerfile.matchAll(/^\s*USER\s+(\S+)/gim)];
    expect(userMatches.length, "no USER instruction").toBeGreaterThan(0);
    const lastUser = userMatches[userMatches.length - 1];
    expect(lastUser[1]).not.toBe("root");
    expect(lastUser[1]).toBe("nginx");
    expect(
      lastUser.index!,
      "USER is not in the nginx runtime stage",
    ).toBeGreaterThan(runtimeStart);
  });

  it("AC5: declares an explicit EXPOSE and a HEALTHCHECK", () => {
    const expose = dockerfile.match(/^\s*EXPOSE\s+(\d+)/im);
    expect(expose, "no EXPOSE").not.toBeNull();
    // Non-root nginx cannot bind :80, so the exposed port must be unprivileged.
    const port = Number(expose![1]);
    expect(port).toBe(8080);
    expect(port).toBeGreaterThan(1023);

    const health = dockerfile.match(/^\s*HEALTHCHECK\s+/im);
    expect(health, "no HEALTHCHECK").not.toBeNull();
    // The healthcheck must actually probe the served app, not be a no-op.
    expect(dockerfile).toMatch(/HEALTHCHECK[\s\S]*?CMD[\s\S]*?localhost:8080/i);
  });

  it("AC6: .dockerignore keeps host state (node_modules, dist, .git) out of the build context", () => {
    const entries = dockerignore
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));
    for (const required of ["node_modules", "dist", ".git"]) {
      expect(entries, `.dockerignore is missing ${required}`).toContain(required);
    }
  });
});
