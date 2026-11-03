import { beforeAll, describe, expect, it } from 'vitest';
import { fixtureDataset } from '../test/fixtureDataset.ts';
import { ANSWER_RULES, judge, SearchService } from './service.ts';
import { createWordSegmenter } from './tokenize.ts';

let service: SearchService;

beforeAll(() => {
  service = new SearchService(fixtureDataset(), createWordSegmenter());
});

function topQuestion(query: string): string | undefined {
  return service.search(query).hits[0]?.entry.q;
}

describe('SearchService.search', () => {
  it('finds questions phrased differently from the FAQ', () => {
    expect(topQuestion('借書站怎麼用')).toContain('FastBook');
    expect(topQuestion('低收入戶要繳房屋稅嗎')).toBe('低收入戶持有之房屋是否應課徵房屋稅?');
    expect(topQuestion('臨時停課找保母')).toBe('臨時停課，有托育需求可到哪裡找空手保母？');
  });

  it('treats 台 and 臺 as the same character', () => {
    expect(topQuestion('台北市房屋稅徵收率')).toBe('臺北市房屋稅徵收率表為何?');
  });

  it('matches Latin tokens such as 1999 and YouBike', () => {
    expect(topQuestion('1999 視障')).toBe('請問1999視障話務中心之服務內容為何?');
    expect(topQuestion('youbike 敬老卡')).toContain('YouBike2.0E');
  });

  it('uses synonyms for everyday words (狗 → 犬)', () => {
    expect(topQuestion('導盲狗可以摸嗎')).toBe('導盲犬可以摸或餵食嗎?');
  });

  it('answers directly when one question clearly matches', () => {
    const response = service.search('酒駕累犯怎麼罰');
    expect(response.verdict).toBe('direct');
    expect(response.hits[0]?.entry.q).toBe('酒後駕車累犯、拒絕接受酒測的處罰為何？');
  });

  it('offers suggestions when several questions fit equally well', () => {
    expect(service.search('育兒津貼').verdict).toBe('suggest');
  });

  it('admits when nothing matches', () => {
    expect(service.search('火星探險隊').verdict).toBe('none');
    expect(service.search('你好').verdict).toBe('none');
  });
});

describe('judge', () => {
  const hit = (score: number, questionCoverage: number, coverage = questionCoverage) => ({
    score,
    questionCoverage,
    coverage,
  });

  it('needs coverage and a clear lead for a direct answer', () => {
    expect(judge([hit(50, 0.9), hit(30, 0.5)])).toBe('direct');
    expect(judge([hit(50, 0.9), hit(48, 0.9)])).toBe('suggest');
    expect(judge([hit(50, ANSWER_RULES.directCoverage - 0.01), hit(10, 0.1)])).toBe('suggest');
    expect(judge([hit(50, 0.9)])).toBe('direct');
  });

  it('gives up below the suggestion threshold', () => {
    expect(judge([hit(50, 0.1, ANSWER_RULES.suggestCoverage - 0.01)])).toBe('none');
    expect(judge([])).toBe('none');
  });
});

describe('SearchService.related', () => {
  it('suggests nearby questions and never the question itself', () => {
    const related = service.related('8402119');
    expect(related.map((entry) => entry.id)).not.toContain('8402119');
    expect(related[0]?.q).toContain('育兒津貼');
  });

  it('returns nothing for an unknown id', () => {
    expect(service.related('nope')).toEqual([]);
  });
});

describe('SearchService.browse and get', () => {
  it('lists a category newest first, with its publishing units', () => {
    const page = service.browse('tax', { limit: 3 });
    expect(page.total).toBeGreaterThan(3);
    expect(page.entries).toHaveLength(3);
    const dates = page.entries.map((entry) => entry.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(page.units[0]?.name).toContain('稅捐稽徵處');
  });

  it('narrows to one unit', () => {
    const unit = service.browse('tax').units[0]?.name as string;
    const page = service.browse('tax', { unit });
    expect(page.entries.every((entry) => entry.dept === unit)).toBe(true);
  });

  it('looks entries up by id', () => {
    expect(service.get('9395231')?.q).toBe('導盲犬可以摸或餵食嗎?');
    expect(service.get('missing')).toBeUndefined();
  });

  it('reports dataset totals', () => {
    const meta = service.meta();
    expect(meta.total).toBe(meta.categories.reduce((sum, category) => sum + category.count, 0));
  });
});
