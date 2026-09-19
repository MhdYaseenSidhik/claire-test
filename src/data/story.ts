// CohortStory ledger validation — the schema guard for board story records.
//
// A CohortStory carries a `ledger` of lifecycle entries. Each entry has a
// `type` drawn from a fixed enum. The board rejected stories whose ledger
// contained `proposed` or `approved` because those values were missing from
// the accepted enum (see S-3). This module is the single source of truth for
// the accepted ledger entry types and validates a story before it is saved.

import { SchemaError } from "./loader";

/**
 * The lifecycle events a CohortStory ledger entry may record.
 *
 * `proposed` and `approved` are first-class members: a story moves through
 * proposed -> approved before work starts, and both are written to the ledger.
 * Omitting either is the defect behind S-3.
 */
export const LEDGER_ENTRY_TYPES = [
  "proposed",
  "approved",
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
  type: LedgerEntryType;
  /** ISO timestamp the event was recorded. */
  at: string;
  /** Free-text note; optional. */
  note?: string;
}

/** A board story with its lifecycle ledger. */
export interface CohortStory {
  key: string;
  title: string;
  ledger: LedgerEntry[];
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

/**
 * Validate a raw ledger entry, throwing SchemaError with the offending path
 * when the `type` is not an accepted enum value — the same failure shape the
 * board reported for S-3.
 */
export function validateLedgerEntry(raw: unknown, index: number): LedgerEntry {
  const path = `ledger.${index}`;
  if (typeof raw !== "object" || raw === null) {
    throw new SchemaError("CohortStory", `${path}: entry must be an object`);
  }
  const entry = raw as Record<string, unknown>;
  const type = entry.type;
  if (!isNonEmptyString(type) || !LEDGER_ENTRY_TYPE_SET.has(type)) {
    throw new SchemaError(
      "CohortStory",
      `${path}.type: \`${String(type)}\` is not a valid enum value for path \`type\`.`,
    );
  }
  if (!isNonEmptyString(entry.at)) {
    throw new SchemaError("CohortStory", `${path}.at: timestamp is required`);
  }
  const out: LedgerEntry = { type: type as LedgerEntryType, at: entry.at };
  if (entry.note !== undefined) {
    if (typeof entry.note !== "string") {
      throw new SchemaError("CohortStory", `${path}.note: must be a string`);
    }
    out.note = entry.note;
  }
  return out;
}

/**
 * Validate a raw CohortStory. Returns a typed, validated story ready to save,
 * or throws SchemaError naming the first offending field.
 */
export function validateStory(raw: unknown): CohortStory {
  if (typeof raw !== "object" || raw === null) {
    throw new SchemaError("CohortStory", "story must be an object");
  }
  const story = raw as Record<string, unknown>;
  if (!isNonEmptyString(story.key)) {
    throw new SchemaError("CohortStory", "key is required");
  }
  if (!isNonEmptyString(story.title)) {
    throw new SchemaError("CohortStory", "title is required");
  }
  if (!Array.isArray(story.ledger)) {
    throw new SchemaError("CohortStory", "ledger must be an array");
  }
  const ledger = story.ledger.map((e, i) => validateLedgerEntry(e, i));
  return { key: story.key, title: story.title, ledger };
}
