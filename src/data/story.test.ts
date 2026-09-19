import { describe, expect, it } from "vitest";
import { SchemaError } from "./loader";
import {
  LEDGER_ENTRY_TYPES,
  validateStory,
  type CohortStory,
} from "./story";

// A minimal in-memory store so the test asserts "validate AND save", not just
// "does not throw". Mirrors the board persisting a CohortStory after validation.
function saveStory(store: Map<string, CohortStory>, raw: unknown): CohortStory {
  const story = validateStory(raw);
  store.set(story.key, story);
  return story;
}

describe("CohortStory ledger enum (S-3 regression)", () => {
  const s3Story = {
    key: "S-3",
    title: "SPRINT-3 Design direction",
    ledger: [
      { type: "proposed", at: "2026-09-18T10:00:00.000Z" },
      { type: "approved", at: "2026-09-18T11:30:00.000Z" },
    ],
  };

  it("accepts a ledger containing `proposed` and `approved`", () => {
    expect(() => validateStory(s3Story)).not.toThrow();
    const story = validateStory(s3Story);
    expect(story.ledger.map((e) => e.type)).toEqual(["proposed", "approved"]);
  });

  it("validates and saves the story successfully", () => {
    const store = new Map<string, CohortStory>();
    const saved = saveStory(store, s3Story);
    expect(store.get("S-3")).toBe(saved);
    expect(store.get("S-3")?.ledger).toHaveLength(2);
  });

  it("exposes `proposed` and `approved` as accepted enum values", () => {
    expect(LEDGER_ENTRY_TYPES).toContain("proposed");
    expect(LEDGER_ENTRY_TYPES).toContain("approved");
  });

  it("still rejects a genuinely invalid ledger type", () => {
    const bad = {
      key: "S-99",
      title: "bogus",
      ledger: [{ type: "teleported", at: "2026-09-18T10:00:00.000Z" }],
    };
    expect(() => validateStory(bad)).toThrow(SchemaError);
    expect(() => validateStory(bad)).toThrow(
      /ledger\.0\.type: `teleported` is not a valid enum value/,
    );
  });

  it("reproduces the pre-fix failure: an enum missing proposed/approved rejects S-3", () => {
    // Model the buggy enum that caused S-3 (proposed/approved absent) and
    // confirm it would reject exactly the entries the board reported. This is
    // the behaviour the fix removes; guarding it stops a regression.
    const buggyTypes = new Set(["started", "blocked", "done"]);
    const rejects = s3Story.ledger.filter((e) => !buggyTypes.has(e.type));
    expect(rejects.map((e) => e.type)).toEqual(["proposed", "approved"]);
    // And the shipped enum accepts them, proving the fix.
    const fixed = new Set<string>(LEDGER_ENTRY_TYPES);
    expect(s3Story.ledger.every((e) => fixed.has(e.type))).toBe(true);
  });
});
