// CohortStory ledger validation — a faithful port of the board platform's
// Mongoose CohortStory model, brought into this repo so the S-6 write failure
// can be reproduced and regression-tested in CI.
//
// The board persists each story as a document carrying a `ledger[]` of
// lifecycle entries. Each entry's `type` is constrained by an enum. On the
// platform, Mongoose re-validates the ENTIRE document on every save() — so a
// board_record / board_unblock write, which appends one ledger entry, fails if
// any PRE-EXISTING entry (e.g. `proposed`, `approved` written at creation and
// approval) is not in the current enum. That is the S-1..S-7 write outage.
//
// This module mirrors that behaviour: validateStory() checks every ledger
// entry, and appendLedgerAndSave() persists only when the whole document
// validates.

import { SchemaError } from "./loader";

/**
 * The lifecycle events a CohortStory ledger entry may record.
 *
 * NOTE: `proposed` and `approved` are the story's own creation/approval
 * entries, written by the platform. They MUST be members of this enum — every
 * story carries them as ledger[0]/ledger[1], so omitting either rejects every
 * subsequent write to that story on save. (This is the S-6 defect.)
 */
export const LEDGER_ENTRY_TYPES = [
  "started",
  "blocked",
  "unblocked",
  "in_review",
  "done",
] as const;

export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

const LEDGER_ENTRY_TYPE_SET: ReadonlySet<string> = new Set(LEDGER_ENTRY_TYPES);

/** One entry in a CohortStory ledger. */
export interface LedgerEntry {
  type: string;
  /** ISO timestamp the event was recorded. */
  at: string;
  /** Free-text note; optional. */
  note?: string;
}

/** A board story with its lifecycle ledger. */
export interface CohortStory {
  key: string;
  title: string;
  column: string;
  ledger: LedgerEntry[];
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

/**
 * Validate a single ledger entry, throwing SchemaError in the exact shape the
 * board reported for S-6 when `type` is not an accepted enum value.
 */
export function validateLedgerEntry(entry: LedgerEntry, index: number): void {
  const path = `ledger.${index}`;
  if (!isNonEmptyString(entry.type) || !LEDGER_ENTRY_TYPE_SET.has(entry.type)) {
    throw new SchemaError(
      "CohortStory",
      `${path}.type: \`${String(entry.type)}\` is not a valid enum value for path \`type\`.`,
    );
  }
  if (!isNonEmptyString(entry.at)) {
    throw new SchemaError("CohortStory", `${path}.at: timestamp is required`);
  }
}

/**
 * Validate the WHOLE story document, exactly as Mongoose does on save():
 * every ledger entry is re-checked, including pre-existing ones. Aggregates
 * enum failures into one message so the caller sees every rejected legacy
 * entry at once — matching the board error for S-6.
 */
export function validateStory(story: CohortStory): void {
  if (!isNonEmptyString(story.key)) {
    throw new SchemaError("CohortStory", "key is required");
  }
  const enumFailures: string[] = [];
  story.ledger.forEach((entry, i) => {
    if (!LEDGER_ENTRY_TYPE_SET.has(entry.type)) {
      enumFailures.push(
        `ledger.${i}.type: \`${entry.type}\` is not a valid enum value for path \`type\`.`,
      );
    }
  });
  if (enumFailures.length > 0) {
    throw new SchemaError(
      "CohortStory",
      `validation failed:\n  ${enumFailures.join("\n  ")}`,
    );
  }
  story.ledger.forEach((entry, i) => validateLedgerEntry(entry, i));
}

/**
 * Append a ledger entry and persist — the write path shared by board_record,
 * board_block and board_unblock. Validates the whole document first (as the
 * platform does), so it fails if any existing entry violates the enum.
 */
export function appendLedgerAndSave(
  store: Map<string, CohortStory>,
  story: CohortStory,
  entry: LedgerEntry,
): CohortStory {
  const next: CohortStory = { ...story, ledger: [...story.ledger, entry] };
  validateStory(next);
  store.set(next.key, next);
  return next;
}
