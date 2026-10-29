import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, JobStatus, NightDigest, StatusCounts } from './types.js';

const NIGHT = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = new Set<string>(['ok', 'retry', 'fail']);

type Parsed = {
  at: string;
  job: string;
  status: JobStatus;
  owner: string | null;
  error?: string;
};

function parseRecord(line: string): Parsed | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.at !== 'string' || row.at === '') return null;
  if (typeof row.job !== 'string' || row.job === '') return null;
  if (typeof row.status !== 'string' || !STATUSES.has(row.status)) return null;
  if (row.owner !== null && typeof row.owner !== 'string') return null;
  if (row.error !== undefined && typeof row.error !== 'string') return null;
  const parsed: Parsed = {
    at: row.at,
    job: row.job,
    status: row.status as JobStatus,
    owner: row.owner,
  };
  if (typeof row.error === 'string') parsed.error = row.error;
  return parsed;
}

export function readNight(runsDir: string, night: string): NightDigest | null {
  if (!NIGHT.test(night)) return null;
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }

  const byJob = new Map<string, DigestRow>();
  const counts: StatusCounts = { ok: 0, retry: 0, fail: 0 };
  let badLines = 0;

  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const parsed = parseRecord(line);
    if (!parsed) {
      badLines += 1;
      continue;
    }
    counts[parsed.status] += 1;
    const existing = byJob.get(parsed.job);
    if (!existing) {
      byJob.set(parsed.job, {
        job: parsed.job,
        owner: parsed.owner,
        runs: 1,
        retries: parsed.status === 'retry' ? 1 : 0,
        lastStatus: parsed.status,
        lastError: parsed.error ?? null,
        firstAt: parsed.at,
        lastAt: parsed.at,
      });
      continue;
    }
    existing.runs += 1;
    if (parsed.status === 'retry') existing.retries += 1;
    existing.owner = parsed.owner;
    existing.lastStatus = parsed.status;
    existing.lastError = parsed.error ?? null;
    existing.lastAt = parsed.at;
  }

  return { rows: [...byJob.values()], badLines, counts };
}
