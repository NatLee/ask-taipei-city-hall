import { describe, expect, it } from 'vitest';
import corpus from './smalltalk.json';
import { similarity, smalltalkReply } from './smalltalk.ts';

const first = () => 0;

describe('smalltalkReply', () => {
  it('answers greetings and the 2017 personality lines', () => {
    expect(smalltalkReply('你好', first)).toBe('嗨！');
    expect(smalltalkReply('你為什麼不能吃？', first)).toBe('我吃電。');
    expect(smalltalkReply('YEE', first)).toBe('YEE～');
  });

  it('ignores punctuation, width and case', () => {
    expect(smalltalkReply('  ＨＥＬＬＯ！！ ', first)).toBe('嗨！');
  });

  it('picks among several replies at random', () => {
    const replies = corpus.entries[0]?.replies ?? [];
    expect(smalltalkReply('你好', () => 0.99)).toBe(replies.at(-1));
  });

  it('leaves real questions to the FAQ search', () => {
    expect(smalltalkReply('你好，請問敬老卡遺失怎麼辦', first)).toBeNull();
    expect(smalltalkReply('什麼是低收入戶', first)).toBeNull();
    expect(smalltalkReply('', first)).toBeNull();
  });

  it('does not answer the 2017 line about the mayor any more', () => {
    expect(smalltalkReply('台北市市長是誰', first)).toBeNull();
  });
});

describe('similarity', () => {
  it('is 1 for equal strings and 0 for unrelated ones', () => {
    expect(similarity('你好嗎', '你好嗎')).toBe(1);
    expect(similarity('你好嗎', '房屋稅')).toBe(0);
    expect(similarity('你好嗎', '你好')).toBeCloseTo(2 / 3);
  });
});
