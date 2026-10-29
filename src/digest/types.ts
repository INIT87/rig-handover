// Morning digest contract. Section 2 starts against this file.

export type JobStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  /** Null stays on the row. The page shows it as —. */
  owner: string | null;
  /** Parsed lines for this job. */
  runs: number;
  /** Lines whose status is `retry`. */
  retries: number;
  lastStatus: JobStatus;
  /** Error on the last line for this job, or null when that line has none. */
  lastError: string | null;
  /** `at` of the first line, unchanged, offset included. */
  firstAt: string;
  /** `at` of the last line, unchanged, offset included. */
  lastAt: string;
};

export type StatusCounts = {
  ok: number;
  retry: number;
  fail: number;
};

export type NightDigest = {
  /** First-seen job order. Page and JSON sort with `rowsInPageOrder`. */
  rows: DigestRow[];
  /** Non-blank lines that are not a valid run record. */
  badLines: number;
  /** Parsed lines, by status. */
  counts: StatusCounts;
};

/**
 * Read `runsDir/<night>.jsonl`.
 * Returns null when the night is not `YYYY-MM-DD` or the file is absent.
 * An empty file returns rows `[]`, badLines `0`.
 */
export { readNight } from './read.js';

/** The one order the page and the JSON both use. */
export function rowsInPageOrder(rows: DigestRow[]): DigestRow[] {
  return [...rows].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
}
