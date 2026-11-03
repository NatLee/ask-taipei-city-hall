import type { FaqLink } from '../../src/data/types.ts';
import { htmlToText, resolveUrl, tidyText } from './html.ts';

/**
 * One FAQ record after cleaning, before sources are merged and categories are
 * assigned. The open data comes in two flavours: the full dump on data.taipei
 * (numeric fields, `{Title, URL}` links, no page URL) and the live feeds on the
 * city's websites (string fields, `{title, url}` links, a `Source` page URL).
 * This module is the only place that knows about either.
 */
export interface NormalizedRecord {
  id: string;
  q: string;
  a: string;
  dept: string;
  date: string;
  url?: string;
  links: FaqLink[];
  /** When the publisher takes the question offline (下版日期), ISO 8601. */
  offlineAt?: string;
}

type RawRecord = Record<string, unknown>;

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

/** Read a field whose key differs only in letter case between the two flavours. */
function field(raw: RawRecord, key: string): unknown {
  if (key in raw) return raw[key];
  const lower = key.toLowerCase();
  const match = Object.keys(raw).find((k) => k.toLowerCase() === lower);
  return match === undefined ? undefined : raw[match];
}

function linkList(value: unknown, baseUrl: string, fallbackTitle: string): FaqLink[] {
  if (!Array.isArray(value)) return [];
  const links: FaqLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const url = resolveUrl(asString(field(item as RawRecord, 'url')), baseUrl);
    if (!url) continue;
    const title = tidyText(asString(field(item as RawRecord, 'title'))) || fallbackTitle;
    links.push({ title, url });
  }
  return links;
}

/** Keep the first link for each URL. */
export function uniqueLinks(links: FaqLink[]): FaqLink[] {
  const seen = new Set<string>();
  return links.filter((link) => (seen.has(link.url) ? false : (seen.add(link.url), true)));
}

/** `2026-03-20T15:45:00` → `2026-03-20`; anything unparsable → ''. */
function datePart(value: unknown): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(asString(value).trim());
  return match?.[1] ?? '';
}

/**
 * Clean one raw record. Returns null when the record has no id or no question,
 * which would make it impossible to show or cite.
 */
export function normalizeRecord(raw: RawRecord, contentBaseUrl: string): NormalizedRecord | null {
  const id = asString(field(raw, 'DataSN')).trim();
  // Some titles carry HTML entities (「機電設計&gt;…」), so they go through the same decoder.
  const q = htmlToText(asString(field(raw, 'title')), contentBaseUrl).text.replace(/\n/g, ' ');
  if (!id || !q) return null;

  const body = htmlToText(asString(field(raw, '內容')), contentBaseUrl);
  // Feeds put the target of a "link" type FAQ (ArticleType 2) in `Link`.
  const linkTarget = resolveUrl(asString(field(raw, 'Link')), contentBaseUrl);
  const links = uniqueLinks([
    ...linkList(field(raw, '相關連結'), contentBaseUrl, '相關連結'),
    ...(linkTarget ? [{ title: '相關連結', url: linkTarget }] : []),
    ...linkList(field(raw, '相關檔案'), contentBaseUrl, '附件'),
    ...body.links,
    ...linkList(field(raw, '相關圖片'), contentBaseUrl, '圖片'),
  ]);

  const record: NormalizedRecord = {
    id,
    q,
    a: body.text,
    dept: tidyText(asString(field(raw, '發布單位'))),
    date: datePart(field(raw, '日期時間')),
    links,
  };
  const url = resolveUrl(asString(field(raw, 'Source')), contentBaseUrl);
  if (url) record.url = url;
  const offline = asString(field(raw, '下版日期')).trim();
  if (offline) record.offlineAt = offline;
  return record;
}
