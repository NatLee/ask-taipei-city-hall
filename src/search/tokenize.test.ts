import { describe, expect, it } from 'vitest';
import { createWordSegmenter, normalizeText, prepareQuery, tokenize, type WordSegmenter } from './tokenize.ts';
import { FINAL_PARTICLES, QUESTION_WORDS, SYNONYM_GROUPS } from './vocabulary.ts';

const vocabulary = { questionWords: QUESTION_WORDS, finalParticles: FINAL_PARTICLES, synonymGroups: SYNONYM_GROUPS };

/** A segmenter that splits on spaces, so tests do not depend on the ICU dictionary. */
const spaces: WordSegmenter = {
  segment: (text) => text.split(/(\s+)/).map((segment) => ({ segment, isWordLike: /\S/.test(segment) })),
};

describe('normalizeText', () => {
  it('folds full-width forms, case and 臺/台', () => {
    expect(normalizeText('臺北市ＭＲＴ１９９９')).toBe('台北市mrt1999');
  });
});

describe('tokenize', () => {
  it('splits Han runs into bigrams', () => {
    expect(tokenize('敬老卡')).toEqual(['敬老', '老卡']);
  });

  it('keeps Latin and digits whole, separate from neighbouring Han text', () => {
    expect(tokenize('YouBike微笑單車 1999')).toEqual(['youbike', '微笑', '笑單', '單車', '1999']);
  });

  it('splits letters from digits so 「YouBike2.0E」 still matches 「youbike」', () => {
    expect(tokenize('YouBike2.0E')).toEqual(['youbike', '2', '0', 'e']);
  });

  it('keeps a lone Han character as a term', () => {
    expect(tokenize('狗')).toEqual(['狗']);
  });

  it('adds single characters and segmenter words when asked', () => {
    expect(tokenize('路燈 不亮', { chars: true, segmenter: spaces })).toEqual([
      '路燈',
      'u:路',
      'u:燈',
      '不亮',
      'u:不',
      'u:亮',
      'w:路燈',
      'w:不亮',
    ]);
  });

  it('works with the real Intl.Segmenter when the runtime has one', () => {
    const segmenter = createWordSegmenter();
    if (!segmenter) return;
    expect(tokenize('低收入戶申請', { segmenter })).toContain('w:申請');
  });
});

describe('prepareQuery', () => {
  it('removes question words and a final particle', () => {
    expect(prepareQuery('請問敬老卡遺失怎麼辦呢？', vocabulary).text).toBe('敬老卡遺失');
  });

  it('keeps the original when the query is nothing but question words', () => {
    expect(prepareQuery('為什麼', vocabulary).text).toBe('為什麼');
  });

  it('finds synonym groups before question words are removed', () => {
    expect(prepareQuery('垃圾車幾點來', vocabulary).synonyms).toEqual([{ typed: ['幾點'], others: ['時間'] }]);
  });

  it('lists the other members of every group the query touches', () => {
    expect(prepareQuery('狗狗晶片', vocabulary).synonyms).toEqual([{ typed: ['狗'], others: ['犬', '寵物'] }]);
  });
});
