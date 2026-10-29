import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const base = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
};

describe('GET /api/digest/:night', () => {
  it('returns 2026-10-28 in page order', async () => {
    const res = await createApp({ ...base, runsDir: 'runs' }).request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.badLines).toBe(1);
    expect(body.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
    expect(body.rows.map((row: { job: string }) => row.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('returns 404 when the night file is missing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-json-'));
    const res = await createApp({ ...base, runsDir: dir }).request('/api/digest/2026-01-02');
    expect(res.status).toBe(404);
  });

  it('returns an empty digest for an empty file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-json-'));
    writeFileSync(join(dir, '2026-01-01.jsonl'), '');
    const res = await createApp({ ...base, runsDir: dir }).request('/api/digest/2026-01-01');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });
});
