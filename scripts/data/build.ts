/**
 * Build `public/data/faq.json` from Taipei open data.
 *
 *   npm run data:build                 download every source in data/sources.json
 *   npm run data:sample                use the small fixtures instead (offline)
 *
 * Options:
 *   --offline <dir>    read `<dir>/<source id>.json` instead of downloading
 *   --out <dir>        output directory (default: public/data)
 *   --min-entries <n>  override `minimumEntries` from data/sources.json
 *
 * Every successful download is kept in `.cache/raw/`. When a source cannot be
 * reached, the cached copy is used and the source is marked stale, so a short
 * outage on the city's side does not break the weekly rebuild.
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import type { FaqDataset, FaqLink, SourceInfo } from '../../src/data/types.ts';
import { buildEntries, type CategoryConfig, mergeRecords } from './merge.ts';
import { type NormalizedRecord, normalizeRecord } from './normalize.ts';

interface SourceConfig {
  id: string;
  name: string;
  provider: string;
  datasetUrl: string;
  downloadUrl: string;
  license: FaqLink;
  contentBaseUrl: string;
  required: boolean;
}

interface SourcesFile {
  minimumEntries: number;
  sources: SourceConfig[];
}

const ROOT = path.resolve(import.meta.dirname, '../..');
const CACHE_DIR = path.join(ROOT, '.cache', 'raw');
const USER_AGENT = 'ask-taipei-city-hall (+https://github.com/NatLee/ask-taipei-city-hall)';
const FETCH_TIMEOUT_MS = 120_000;
const FETCH_ATTEMPTS = 3;

async function readJson<T>(file: string): Promise<T> {
  // The city's feeds start with a byte-order mark, which JSON.parse rejects.
  return JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, '')) as T;
}

function parseRecords(text: string, sourceId: string): Record<string, unknown>[] {
  const data: unknown = JSON.parse(text.replace(/^\uFEFF/, ''));
  if (!Array.isArray(data)) throw new Error(`${sourceId}: expected a JSON array of records`);
  return data as Record<string, unknown>[];
}

async function download(url: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 5_000 * attempt));
    }
  }
  throw lastError;
}

interface Loaded {
  records: Record<string, unknown>[];
  fetchedAt: string;
  stale: boolean;
}

async function loadSource(source: SourceConfig, offlineDir: string | undefined): Promise<Loaded | null> {
  if (offlineDir) {
    const file = path.join(offlineDir, `${source.id}.json`);
    try {
      const records = parseRecords(await readFile(file, 'utf8'), source.id);
      return { records, fetchedAt: (await stat(file)).mtime.toISOString(), stale: false };
    } catch (error) {
      if (source.required) throw error;
      return null;
    }
  }

  const cacheFile = path.join(CACHE_DIR, `${source.id}.json`);
  try {
    const text = await download(source.downloadUrl);
    const records = parseRecords(text, source.id);
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(cacheFile, text);
    return { records, fetchedAt: new Date().toISOString(), stale: false };
  } catch (error) {
    console.warn(`! ${source.id}: download failed (${String(error)})`);
    try {
      const text = await readFile(cacheFile, 'utf8');
      const records = parseRecords(text, source.id);
      console.warn(`  using the cached copy from ${(await stat(cacheFile)).mtime.toISOString()}`);
      return { records, fetchedAt: (await stat(cacheFile)).mtime.toISOString(), stale: true };
    } catch {
      if (source.required) throw new Error(`${source.id} is required and there is no cached copy`);
      console.warn(`  skipped (optional source, no cached copy)`);
      return null;
    }
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      offline: { type: 'string' },
      out: { type: 'string', default: path.join(ROOT, 'public', 'data') },
      'min-entries': { type: 'string' },
    },
  });
  const config = await readJson<SourcesFile>(path.join(ROOT, 'data', 'sources.json'));
  const categories = await readJson<CategoryConfig>(path.join(ROOT, 'data', 'categories.json'));
  const minimumEntries = Number(values['min-entries'] ?? config.minimumEntries);
  const offlineDir = values.offline ? path.resolve(values.offline) : undefined;

  const normalized: NormalizedRecord[][] = [];
  const sources: SourceInfo[] = [];
  for (const source of config.sources) {
    const loaded = await loadSource(source, offlineDir);
    if (!loaded) continue;
    const records = loaded.records
      .map((raw) => normalizeRecord(raw, source.contentBaseUrl))
      .filter((record): record is NormalizedRecord => record !== null);
    normalized.push(records);
    sources.push({
      id: source.id,
      name: source.name,
      provider: source.provider,
      datasetUrl: source.datasetUrl,
      license: source.license,
      fetchedAt: loaded.fetchedAt,
      records: loaded.records.length,
      ...(loaded.stale ? { stale: true } : {}),
    });
    console.log(`✓ ${source.id}: ${loaded.records.length} records${loaded.stale ? ' (cached copy)' : ''}`);
  }

  const now = new Date();
  const report = buildEntries(mergeRecords(normalized), categories, now);
  if (report.entries.length < minimumEntries) {
    throw new Error(`only ${report.entries.length} questions left, expected at least ${minimumEntries}`);
  }

  const dataset: FaqDataset = {
    version: 1,
    generatedAt: now.toISOString(),
    sources,
    categories: report.categories,
    entries: report.entries,
  };
  await mkdir(values.out, { recursive: true });
  const outFile = path.join(values.out, 'faq.json');
  const json = JSON.stringify(dataset);
  await writeFile(outFile, json);

  const withPage = report.entries.filter((entry) => entry.url).length;
  console.log(
    `→ ${path.relative(ROOT, outFile)}: ${report.entries.length} questions ` +
      `(${withPage} with their own page), ${(Buffer.byteLength(json) / 1e6).toFixed(1)} MB; ` +
      `dropped ${report.expired} taken offline and ${report.empty} empty`,
  );
  for (const category of report.categories) console.log(`  ${category.name}: ${category.count}`);
  const unmatched = Object.entries(report.uncategorised).sort((a, b) => b[1] - a[1]);
  if (unmatched.length > 0) {
    console.log(`  units without a category rule (add them to data/categories.json):`);
    for (const [dept, count] of unmatched) console.log(`    ${dept}: ${count}`);
  }
}

main().catch((error: unknown) => {
  console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
