import { describe, expect, it } from "vitest";
import { SchemaError } from "./loader";
import {
  LEDGER_ENTRY_TYPES,
  appendLedgerAndSave,
  validateStory,
  type CohortStory,
} from "./cohortStory";

// S-6 regression. The board rejected every write to S-1..S-7 with
//   CohortStory validation failed:
//     ledger.0.type: `proposed`  is not a valid enum value for path `type`.
//     ledger.1.type: `approved`  is not a valid enum value for path `type`.
// because each story's ledger opens with the platform's own `proposed`/
// `approved` lifecycle entries, and Mongoose re-validates the WHOLE document
// on every save. These tests pin that a board_record / board_unblock write on
// such a story must persist without a CohortStory validation error.

function storyWithLifecycleLedger(key: string): CohortStory {
  return {
    key,
    title: "SPRINT-6 Design review",
    column: "blocked",
    ledger: [
      { type: "proposed", at: "2026-09-18T10:00:00.000Z" },
      { type: "approved", at: "2026-09-18T11:30:00.000Z" },
      { type: "started", at: "2026-09-18T12:00:00.000Z" },
      { type: "blocked", at: "2026-09-19T08:00:00.000Z", note: "run stopped" },
    ],
  };
}

describe("CohortStory ledger enum (S-6 regression)", () => {
  it("accepts a stored ledger containing `proposed` and `approved`", () => {
    const story = storyWithLifecycleLedger("S-6");
    expect(() => validateStory(story)).not.toThrow();
  });

  it("a board_record write on a proposed/approved story persists (no validation error)", () => {
    const store = new Map<string, CohortStory>();
    const story = storyWithLifecycleLedger("S-6");
    const saved = appendLedgerAndSave(store, story, {
      type: "unblocked",
      at: "2026-09-19T09:55:00.000Z",
      note: "ledger enum widened",
    });
    expect(store.get("S-6")).toBe(saved);
    expect(saved.ledger.map((e) => e.type)).toEqual([
      "proposed",
      "approved",
      "started",
      "blocked",
      "unblocked",
    ]);
  });

  it("a board_unblock write moves the story out of blocked and persists", () => {
    const store = new Map<string, CohortStory>();
    const story = storyWithLifecycleLedger("S-6");
    const unblocked = appendLedgerAndSave(
      store,
      { ...story, column: "in_progress" },
      { type: "unblocked", at: "2026-09-19T09:56:00.000Z" },
    );
    expect(unblocked.column).toBe("in_progress");
    expect(store.get("S-6")?.ledger).toHaveLength(5);
  });

  it("exposes `proposed` and `approved` as accepted enum values", () => {
    expect(LEDGER_ENTRY_TYPES).toContain("proposed");
    expect(LEDGER_ENTRY_TYPES).toContain("approved");
  });

  it("still rejects a genuinely invalid ledger type with the board error shape", () => {
    const store = new Map<string, CohortStory>();
    const story = storyWithLifecycleLedger("S-6");
    expect(() =>
      appendLedgerAndSave(store, story, {
        type: "teleported",
        at: "2026-09-19T09:57:00.000Z",
      }),
    ).toThrow(SchemaError);
    expect(() =>
      appendLedgerAndSave(store, story, {
        type: "teleported",
        at: "2026-09-19T09:57:00.000Z",
      }),
    ).toThrow(/`teleported` is not a valid enum value for path `type`/);
  });
});
