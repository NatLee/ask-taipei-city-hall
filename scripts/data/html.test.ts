import { describe, expect, it } from 'vitest';
import { htmlToText, resolveUrl, tidyText } from './html.ts';

const BASE = 'https://www.gov.taipei/';

describe('htmlToText', () => {
  it('keeps paragraphs on their own lines and decodes entities', () => {
    const { text } = htmlToText('<p>第一段&nbsp;文字</p><p>第二段 &gt; 說明</p>', BASE);
    expect(text).toBe('第一段 文字\n第二段 > 說明');
  });

  it('numbers ordered lists and bullets unordered ones', () => {
    const html = '<ol><li>身分證</li><li>照片</li></ol><ul><li>正本</li></ul>';
    expect(htmlToText(html, BASE).text).toBe('1. 身分證\n2. 照片\n• 正本');
  });

  it('joins table cells with a bar so rows stay readable', () => {
    const html = '<table><tr><th>項目</th><th>費用</th></tr><tr><td>製卡</td><td>100元</td></tr></table>';
    expect(htmlToText(html, BASE).text).toBe('項目｜費用\n製卡｜100元');
  });

  it('drops scripts and styles that some answers carry', () => {
    const html = '<script>ga("send")</script><style>p{color:red}</style><p>答案</p>';
    expect(htmlToText(html, BASE).text).toBe('答案');
  });

  it('collects links and images, resolving relative and protocol-relative URLs', () => {
    const html =
      '<p>請見<a href="//www.legalaffairs.gov.taipei/x">法務局</a>或<a href="/News.aspx?n=1">公告</a>' +
      '<a href="javascript:void(0)">無效</a><img src="https://example.org/a.png" alt="流程圖"></p>';
    expect(htmlToText(html, BASE).links).toEqual([
      { title: '法務局', url: 'https://www.legalaffairs.gov.taipei/x' },
      { title: '公告', url: 'https://www.gov.taipei/News.aspx?n=1' },
      { title: '流程圖', url: 'https://example.org/a.png' },
    ]);
  });

  it('lists each URL once even when it is linked twice', () => {
    const html = '<a href="https://a.tw/">一</a><a href="https://a.tw/">二</a>';
    expect(htmlToText(html, BASE).links).toEqual([{ title: '一', url: 'https://a.tw/' }]);
  });
});

describe('resolveUrl', () => {
  it('accepts http(s) and mailto only', () => {
    expect(resolveUrl(' https://a.tw/x ', BASE)).toBe('https://a.tw/x');
    expect(resolveUrl('mailto:a@b.tw', BASE)).toBe('mailto:a@b.tw');
    expect(resolveUrl('javascript:alert(1)', BASE)).toBeNull();
    expect(resolveUrl('', BASE)).toBeNull();
  });
});

describe('tidyText', () => {
  it('collapses spaces, including no-break spaces, and drops blank lines', () => {
    expect(tidyText('  a \u00a0 b \n\n\t c  ')).toBe('a b\nc');
  });
});
