/**
 * A small but real dataset for tests: the raw open-data samples in
 * `scripts/data/fixtures/` run through the same pipeline as the live build.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buildEntries, type CategoryConfig, mergeRecords } from '../../scripts/data/merge.ts';
import { type NormalizedRecord, normalizeRecord } from '../../scripts/data/normalize.ts';
import type { FaqDataset } from '../data/types.ts';

const ROOT = path.resolve(import.meta.dirname, '../..');
/** Fixed so "taken offline" decisions do not change as time passes. */
export const FIXTURE_NOW = new Date('2026-11-04T00:00:00+08:00');

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readFileSync(path.join(ROOT, ...parts), 'utf8').replace(/^\uFEFF/, '')) as T;
}

export function fixtureDataset(): FaqDataset {
  const { sources } = readJson<{ sources: { id: string; contentBaseUrl: string }[] }>('data', 'sources.json');
  const categories = readJson<CategoryConfig>('data', 'categories.json');
  const normalized = sources.map((source) =>
    readJson<Record<string, unknown>[]>('scripts', 'data', 'fixtures', `${source.id}.json`)
      .map((raw) => normalizeRecord(raw, source.contentBaseUrl))
      .filter((record): record is NormalizedRecord => record !== null),
  );
  const report = buildEntries(mergeRecords(normalized), categories, FIXTURE_NOW);
  return {
    version: 1,
    generatedAt: FIXTURE_NOW.toISOString(),
    sources: [],
    categories: report.categories,
    entries: report.entries,
  };
}
