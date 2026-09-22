import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// S-8 — Design direction and tokens. Verifies the acceptance criteria
// mechanically against the real files: tokens.css is the single source of
// truth, DESIGN.md documents the same values token-for-token, and no
// component carries a literal colour or design pixel. Cases were derived from
// the S-8 acceptance criteria before reading the implementation.

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const srcDir = here;

const tokensCss = readFileSync(join(srcDir, "tokens.css"), "utf8");
const designMd = readFileSync(join(repoRoot, "DESIGN.md"), "utf8");
const indexCss = readFileSync(join(srcDir, "index.css"), "utf8");

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}
function stripLineComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((l) => l.replace(/\/\/.*$/, ""))
    .join("\n");
}
function filesUnder(dir: string, ext: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...filesUnder(full, ext));
    else if (entry.endsWith(ext)) out.push(full);
  }
  return out;
}

function parseTokens(css: string): {
  root: Map<string, string>;
  dark: Map<string, string>;
} {
  const root = new Map<string, string>();
  const dark = new Map<string, string>();
  const darkBlock = css.match(
    /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{([\s\S]*)\}/,
  );
  const darkText = darkBlock ? darkBlock[1] : "";
  const rootText = darkBlock ? css.replace(darkBlock[0], "") : css;
  const decl = /--([\w-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = decl.exec(rootText)) !== null) root.set(m[1].trim(), m[2].trim());
  while ((m = decl.exec(darkText)) !== null) dark.set(m[1].trim(), m[2].trim());
  return { root, dark };
}

const { root, dark } = parseTokens(tokensCss);

describe("AC2 — a single tokens file is the source of truth", () => {
  it("tokens.css defines the design tokens", () => {
    expect(root.size).toBeGreaterThan(0);
  });

  it("index.css imports tokens.css exactly once, at the top", () => {
    const imports = [...indexCss.matchAll(/@import\s+["']\.\/tokens\.css["'];/g)];
    expect(imports).toHaveLength(1);
    const before = indexCss.slice(0, indexCss.indexOf("@import"));
    expect(stripComments(before).trim()).toBe("");
  });

  it("tokens.css is the only stylesheet that declares custom properties", () => {
    const offenders: string[] = [];
    for (const file of filesUnder(srcDir, ".css")) {
      if (file.endsWith("tokens.css")) continue;
      if (/--[\w-]+\s*:/.test(stripComments(readFileSync(file, "utf8")))) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("AC1 — DESIGN.md states the full direction", () => {
  const sections: [string, RegExp][] = [
    ["Typeface", /##\s*Typeface/],
    ["Type scale", /##\s*Type scale/],
    ["Spacing scale", /##\s*Spacing scale/],
    ["Palette", /##\s*Palette/],
    ["Radii", /##\s*Radii/],
    ["Elevation", /##\s*Elevation/],
    ["Motion", /##\s*Motion/],
    ["Component inventory", /##\s*Component inventory/],
  ];
  for (const [name, re] of sections) {
    it(`documents ${name}`, () => {
      expect(designMd).toMatch(re);
    });
  }

  it("documents both a light AND a dark palette column", () => {
    expect(designMd).toMatch(/\|\s*Light\s*\|\s*Dark\s*\|/);
  });

  it("lists several components in the inventory", () => {
    const inv = designMd.slice(designMd.indexOf("## Component inventory"));
    const rows = [...inv.matchAll(/^\|\s*[A-Z][^|]+\|/gm)];
    expect(rows.length).toBeGreaterThan(5);
  });
});

describe("AC3 — DESIGN.md values match tokens.css value-by-value", () => {
  const paletteRows = [
    ...designMd.matchAll(
      /\|\s*`--([\w-]+)`\s*\|\s*`(#[0-9a-fA-F]{3,8})`\s*\|\s*`(#[0-9a-fA-F]{3,8})`\s*\|/g,
    ),
  ];
  it("finds the palette table with hex values in DESIGN.md", () => {
    expect(paletteRows.length).toBeGreaterThan(0);
  });
  for (const [, token, light, darkHex] of paletteRows) {
    it(`--${token}: light ${light} / dark ${darkHex} match tokens.css`, () => {
      expect(root.get(token)?.toLowerCase()).toBe(light.toLowerCase());
      expect(dark.get(token)?.toLowerCase()).toBe(darkHex.toLowerCase());
    });
  }

  const pairRows = [
    ...designMd.matchAll(
      /`--([\w-]+)`\s*\/\s*`--([\w-]+)`\s*\|\s*`(#[0-9a-fA-F]{3,8})`\s*\/\s*`(#[0-9a-fA-F]{3,8})`\s*\|\s*`(#[0-9a-fA-F]{3,8})`\s*\/\s*`(#[0-9a-fA-F]{3,8})`/g,
    ),
  ];
  it("finds the semantic bg/fg pair rows", () => {
    expect(pairRows.length).toBeGreaterThan(0);
  });
  for (const [, tA, tB, lA, lB, dA, dB] of pairRows) {
    it(`--${tA}/--${tB} light+dark match tokens.css`, () => {
      expect(root.get(tA)?.toLowerCase()).toBe(lA.toLowerCase());
      expect(root.get(tB)?.toLowerCase()).toBe(lB.toLowerCase());
      expect(dark.get(tA)?.toLowerCase()).toBe(dA.toLowerCase());
      expect(dark.get(tB)?.toLowerCase()).toBe(dB.toLowerCase());
    });
  }

  const typeRows = [
    ...designMd.matchAll(/\|\s*`--(text-[\w-]+)`\s*\|\s*([\d.]+rem)\b/g),
  ];
  it("finds type-scale rows in DESIGN.md", () => {
    expect(typeRows.length).toBeGreaterThan(0);
  });
  for (const [, token, rem] of typeRows) {
    it(`--${token} size ${rem} matches tokens.css`, () => {
      expect(root.get(token)).toBe(rem);
    });
  }

  const spaceRows = [...designMd.matchAll(/`--(space-\d+)`\s*(\d+)\b/g)];
  it("finds spacing tokens in DESIGN.md", () => {
    expect(spaceRows.length).toBeGreaterThan(0);
  });
  for (const [, token, px] of spaceRows) {
    it(`--${token} ${px}px matches tokens.css`, () => {
      expect(root.get(token)).toBe(`${px}px`);
    });
  }

  const radiusRows = [...designMd.matchAll(/`--(radius-[\w-]+)`\s*(\d+)px\b/g)];
  it("finds radius tokens in DESIGN.md", () => {
    expect(radiusRows.length).toBeGreaterThan(0);
  });
  for (const [, token, px] of radiusRows) {
    it(`--${token} ${px}px matches tokens.css`, () => {
      expect(root.get(token)).toBe(`${px}px`);
    });
  }

  it("documents --duration matching tokens.css", () => {
    const dur = designMd.match(/`--duration`\s*([\d.]+s)\b/);
    expect(dur).not.toBeNull();
    if (dur) expect(root.get("duration")).toBe(dur[1]);
  });

  it("every colour token has both a light and a dark value", () => {
    const colourLike = (v: string) => /^#|color-mix|rgb/.test(v);
    const missing: string[] = [];
    for (const [name, val] of root) {
      if (colourLike(val) && !dark.has(name)) missing.push(name);
    }
    expect(missing).toEqual([]);
  });
});

describe("defect clause — no literal colour or design pixel in a component", () => {
  const hex = /#[0-9a-fA-F]{3,8}\b/;
  const pxDecl = /:\s*[^;]*?\b(\d{2,}|[2-9])px\b/;

  it("no component .css declares a hex colour (tokens.css excepted)", () => {
    const offenders: { file: string; line: string }[] = [];
    for (const file of filesUnder(srcDir, ".css")) {
      if (file.endsWith("tokens.css")) continue;
      for (const line of stripComments(readFileSync(file, "utf8")).split("\n")) {
        if (hex.test(line)) offenders.push({ file, line: line.trim() });
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no .tsx component hardcodes a hex colour", () => {
    const offenders: { file: string; line: string }[] = [];
    for (const file of filesUnder(srcDir, ".tsx")) {
      for (const line of stripLineComments(readFileSync(file, "utf8")).split("\n")) {
        if (hex.test(line)) offenders.push({ file, line: line.trim() });
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no component .css hardcodes a design px length outside tokens.css", () => {
    const allowed = /100%/;
    const offenders: { file: string; line: string }[] = [];
    for (const file of filesUnder(srcDir, ".css")) {
      if (file.endsWith("tokens.css")) continue;
      for (const raw of stripComments(readFileSync(file, "utf8")).split("\n")) {
        const line = raw.trim();
        if (!pxDecl.test(line)) continue;
        const residual = line.replace(/\b1px\b/g, "").replace(/\b0\b/g, "");
        if (pxDecl.test(residual) && !allowed.test(residual)) {
          offenders.push({ file, line });
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
