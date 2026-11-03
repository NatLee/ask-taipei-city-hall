import { describe, expect, it } from 'vitest';
import { buildEntries, type CategoryConfig, categoryFor, mergeRecords } from './merge.ts';
import type { NormalizedRecord } from './normalize.ts';

const CONFIG: CategoryConfig = {
  rules: [
    { id: 'welfare', name: '社會福利', icon: 'heart', match: ['社會局'] },
    { id: 'transport', name: '交通', icon: 'bus', match: ['交通', '捷運'] },
  ],
  fallback: { id: 'other', name: '其他', icon: 'circle-help' },
};

function record(overrides: Partial<NormalizedRecord>): NormalizedRecord {
  return { id: '1', q: '問題', a: '答案', dept: '臺北市政府社會局', date: '2026-01-01', links: [], ...overrides };
}

describe('mergeRecords', () => {
  it('lets a later source fill in fields without blanking earlier ones', () => {
    const dump = [record({ id: '7', a: '完整答案', links: [{ title: '舊', url: 'https://a.tw/old' }] })];
    const feed = [
      record({
        id: '7',
        a: '',
        url: 'https://www.gov.taipei/q7',
        date: '2026-02-01',
        links: [{ title: '新', url: 'https://a.tw/new' }],
      }),
    ];
    const [merged] = mergeRecords([dump, feed]);
    expect(merged).toMatchObject({ id: '7', a: '完整答案', url: 'https://www.gov.taipei/q7', date: '2026-02-01' });
    expect(merged?.links.map((link) => link.url)).toEqual(['https://a.tw/new', 'https://a.tw/old']);
  });

  it('keeps records that only one source has', () => {
    expect(mergeRecords([[record({ id: '1' })], [record({ id: '2' })]]).map((r) => r.id)).toEqual(['1', '2']);
  });
});

describe('categoryFor', () => {
  it('uses the first matching rule and falls back otherwise', () => {
    expect(categoryFor('臺北市政府社會局老人福利科', CONFIG)).toBe('welfare');
    expect(categoryFor('臺北大眾捷運股份有限公司', CONFIG)).toBe('transport');
    expect(categoryFor('臺北市立動物園', CONFIG)).toBe('other');
  });
});

describe('buildEntries', () => {
  const now = new Date('2026-11-04T00:00:00Z');

  it('drops questions already taken offline and ones with nothing to show', () => {
    const report = buildEntries(
      [
        record({ id: 'live' }),
        record({ id: 'later', offlineAt: '2030-01-01T00:00:00' }),
        record({ id: 'gone', offlineAt: '2026-04-06T11:15:00' }),
        record({ id: 'empty', a: '' }),
        record({ id: 'file', a: '', links: [{ title: '附件', url: 'https://a.tw/f.pdf' }] }),
      ],
      CONFIG,
      now,
    );
    expect(report.entries.map((entry) => entry.id).sort()).toEqual(['file', 'later', 'live']);
    expect(report.expired).toBe(1);
    expect(report.empty).toBe(1);
  });

  it('sorts newest first, counts categories and reports units without a rule', () => {
    const report = buildEntries(
      [
        record({ id: 'a', date: '2025-01-01' }),
        record({ id: 'b', date: '2026-05-01', dept: '臺北市政府交通局' }),
        record({ id: 'c', date: '2026-05-01', dept: '臺北市立動物園' }),
      ],
      CONFIG,
      now,
    );
    expect(report.entries.map((entry) => entry.id)).toEqual(['b', 'c', 'a']);
    expect(report.categories).toEqual([
      { id: 'welfare', name: '社會福利', icon: 'heart', count: 1 },
      { id: 'transport', name: '交通', icon: 'bus', count: 1 },
      { id: 'other', name: '其他', icon: 'circle-help', count: 1 },
    ]);
    expect(report.uncategorised).toEqual({ 臺北市立動物園: 1 });
  });

  it('omits empty optional fields from the output', () => {
    const [entry] = buildEntries([record({ id: 'x' })], CONFIG, now).entries;
    expect(entry).toEqual({ id: 'x', q: '問題', a: '答案', dept: '臺北市政府社會局', cat: 'welfare', date: '2026-01-01' });
  });
});
