import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight, rowsInPageOrder } from '../src/digest/types.js';

describe('readNight', () => {
  it('reads 2026-10-28 as 5 jobs and 1 bad line', () => {
    const digest = readNight('runs', '2026-10-28');
    expect(digest).not.toBeNull();
    if (!digest) return;
    expect(digest.rows).toHaveLength(5);
    expect(digest.badLines).toBe(1);
    expect(digest.counts).toEqual({ ok: 10, retry: 4, fail: 1 });

    const byJob = Object.fromEntries(digest.rows.map((row) => [row.job, row]));
    expect(byJob['digest/render']).toMatchObject({
      owner: null,
      runs: 1,
      retries: 0,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T05:41:09+01:00',
      lastAt: '2026-10-29T05:41:09+01:00',
    });
    expect(byJob['fixtures/refresh']).toMatchObject({
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(byJob['lane/sync']).toMatchObject({
      owner: 'rook',
      runs: 8,
      retries: 1,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-28T23:00:06+01:00',
      lastAt: '2026-10-29T05:00:04+01:00',
    });
    expect(byJob['notes/backup']).toMatchObject({
      owner: 'lane-07',
      runs: 1,
      retries: 0,
      lastStatus: 'fail',
      lastError: 'quota exceeded',
      firstAt: '2026-10-29T04:00:01+01:00',
      lastAt: '2026-10-29T04:00:01+01:00',
    });
    expect(byJob['rig/rotate-logs']).toMatchObject({
      owner: 'lane-07',
      runs: 1,
      retries: 0,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-28T23:00:02+01:00',
      lastAt: '2026-10-28T23:00:02+01:00',
    });
  });

  it('returns null when the file is absent or the night is not a date', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
    expect(readNight('runs', '../.env')).toBeNull();
  });

  it('returns an empty digest for an empty file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-night-'));
    writeFileSync(join(dir, '2026-01-01.jsonl'), '');
    expect(readNight(dir, '2026-01-01')).toEqual({
      rows: [],
      badLines: 0,
      counts: { ok: 0, retry: 0, fail: 0 },
    });
  });

  it('sorts jobs in the order the page and the JSON share', () => {
    const digest = readNight('runs', '2026-10-28');
    expect(digest).not.toBeNull();
    if (!digest) return;
    expect(rowsInPageOrder(digest.rows).map((row) => row.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });
});
