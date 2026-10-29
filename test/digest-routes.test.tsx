import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const jobs = [
  'digest/render',
  'fixtures/refresh',
  'lane/sync',
  'notes/backup',
  'rig/rotate-logs',
];

function config(runsDir: string) {
  return {
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  };
}

function tempRunsDir(): string {
  return mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
}

type DigestJson = {
  night: string;
  badLines: number;
  counts: { ok: number; retry: number; fail: number };
  rows: { job: string; owner: string | null }[];
};

describe('digest routes', () => {
  it('GET /digest/:night renders the fixture jobs in order', async () => {
    const res = await createApp(config('runs')).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    let previous = -1;
    for (const job of jobs) {
      const at = html.indexOf(job);
      expect(at).toBeGreaterThan(previous);
      previous = at;
    }
    expect(html).toContain('—');
  });

  it('GET /api/digest/:night returns the fixture digest', async () => {
    const res = await createApp(config('runs')).request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = (await res.json()) as DigestJson;
    expect(Object.keys(body).sort()).toEqual(['badLines', 'counts', 'night', 'rows']);
    expect(body.night).toBe('2026-10-28');
    expect(body.badLines).toBe(1);
    expect(body.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
    expect(body.rows.map((row) => row.job)).toEqual(jobs);
  });

  it('GET /digest/:night is 404 when the night file is missing', async () => {
    const res = await createApp(config(tempRunsDir())).request('/digest/1999-01-01');
    expect(res.status).toBe(404);
  });

  it('GET /api/digest/:night is 404 when the night file is missing', async () => {
    const res = await createApp(config(tempRunsDir())).request('/api/digest/1999-01-01');
    expect(res.status).toBe(404);
  });

  it('GET /digest/:night says nothing ran for an empty file', async () => {
    const runsDir = tempRunsDir();
    writeFileSync(join(runsDir, '2026-01-01.jsonl'), '');
    const res = await createApp(config(runsDir)).request('/digest/2026-01-01');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('GET /api/digest/:night returns no rows for an empty file', async () => {
    const runsDir = tempRunsDir();
    writeFileSync(join(runsDir, '2026-01-01.jsonl'), '');
    const res = await createApp(config(runsDir)).request('/api/digest/2026-01-01');
    expect(res.status).toBe(200);
    const body = (await res.json()) as DigestJson;
    expect(body.rows).toHaveLength(0);
    expect(body.badLines).toBe(0);
  });

  it('GET /digest/:night still shows the valid job when a line is bad', async () => {
    const runsDir = tempRunsDir();
    writeFileSync(
      join(runsDir, '2026-02-02.jsonl'),
      '{"at":"2026-02-02T00:00:00+01:00","job":"solo","status":"ok","owner":null}\nthis is not json\n',
    );
    const res = await createApp(config(runsDir)).request('/digest/2026-02-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('solo');
  });

  it('GET /api/digest/:night counts a bad line and keeps the valid row', async () => {
    const runsDir = tempRunsDir();
    writeFileSync(
      join(runsDir, '2026-02-02.jsonl'),
      '{"at":"2026-02-02T00:00:00+01:00","job":"solo","status":"ok","owner":null}\nthis is not json\n',
    );
    const res = await createApp(config(runsDir)).request('/api/digest/2026-02-02');
    expect(res.status).toBe(200);
    const body = (await res.json()) as DigestJson;
    expect(body.badLines).toBe(1);
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0]?.job).toBe('solo');
    expect(body.rows[0]?.owner).toBeNull();
  });
});
