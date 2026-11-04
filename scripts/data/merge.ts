import type { Category, FaqEntry } from '../../src/data/types.ts';
import { type NormalizedRecord, uniqueLinks } from './normalize.ts';

export interface CategoryRule {
  id: string;
  name: string;
  icon: string;
  match: string[];
}

export interface CategoryConfig {
  rules: CategoryRule[];
  fallback: Omit<CategoryRule, 'match'>;
}

export interface MergeReport {
  entries: FaqEntry[];
  categories: Category[];
  /** Records the publisher has already taken offline (下版日期 in the past). */
  expired: number;
  /** Records with neither an answer nor a link, so there is nothing to show. */
  empty: number;
  /** Publishing units that matched no rule, with how many questions each has. */
  uncategorised: Record<string, number>;
}

/**
 * Combine records from several sources. A later source wins for the same id,
 * field by field: an empty value never overwrites a filled one, and links are
 * pooled. That lets a small live feed add page URLs and fresher answers on top
 * of the full dump without losing anything the dump had.
 */
export function mergeRecords(sources: NormalizedRecord[][]): NormalizedRecord[] {
  const byId = new Map<string, NormalizedRecord>();
  for (const records of sources) {
    for (const next of records) {
      const prev = byId.get(next.id);
      if (!prev) {
        byId.set(next.id, next);
        continue;
      }
      const merged: NormalizedRecord = { ...prev };
      for (const key of ['q', 'a', 'dept', 'date', 'url', 'offlineAt'] as const) {
        const value = next[key];
        if (value) merged[key] = value;
      }
      merged.links = uniqueLinks([...next.links, ...prev.links]);
      byId.set(next.id, merged);
    }
  }
  return [...byId.values()];
}

export function categoryFor(dept: string, config: CategoryConfig): string {
  return config.rules.find((rule) => rule.match.some((part) => dept.includes(part)))?.id ?? config.fallback.id;
}

function isExpired(record: NormalizedRecord, now: Date): boolean {
  if (!record.offlineAt) return false;
  const offline = new Date(record.offlineAt);
  return !Number.isNaN(offline.getTime()) && offline.getTime() <= now.getTime();
}

/**
 * Drop expired and empty records, assign categories and sort newest first
 * (ties by id, so the output is stable for the same input).
 */
export function buildEntries(records: NormalizedRecord[], config: CategoryConfig, now: Date): MergeReport {
  let expired = 0;
  let empty = 0;
  const uncategorised: Record<string, number> = {};
  const entries: FaqEntry[] = [];

  for (const record of records) {
    if (isExpired(record, now)) {
      expired += 1;
      continue;
    }
    if (!record.a && record.links.length === 0) {
      empty += 1;
      continue;
    }
    const cat = categoryFor(record.dept, config);
    if (cat === config.fallback.id) uncategorised[record.dept] = (uncategorised[record.dept] ?? 0) + 1;
    const entry: FaqEntry = { id: record.id, q: record.q, a: record.a, dept: record.dept, cat, date: record.date };
    if (record.url) entry.url = record.url;
    if (record.links.length > 0) entry.links = record.links;
    entries.push(entry);
  }

  entries.sort((x, y) => (x.date === y.date ? x.id.localeCompare(y.id) : x.date < y.date ? 1 : -1));

  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.cat, (counts.get(entry.cat) ?? 0) + 1);
  const categories: Category[] = [...config.rules, config.fallback]
    .map(({ id, name, icon }) => ({ id, name, icon, count: counts.get(id) ?? 0 }))
    .filter((category) => category.count > 0);

  return { entries, categories, expired, empty, uncategorised };
}
