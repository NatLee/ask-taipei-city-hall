import { describe, expect, it } from 'vitest';
import { normalizeRecord } from './normalize.ts';

const BASE = 'https://www.gov.taipei/';

describe('normalizeRecord', () => {
  it('reads the data.taipei dump flavour (numeric ids, {Title, URL} links)', () => {
    const record = normalizeRecord(
      {
        DataSN: 9142472,
        title: ' 敬老卡遺失怎麼辦？ ',
        內容: '<p>請先掛失。</p>',
        日期時間: '2026-03-20T15:45:00',
        下版日期: null,
        ArticleType: 0,
        發布單位: '臺北市政府社會局老人福利科',
        相關連結: [{ Title: '掛失說明', URL: 'https://www.gov.taipei/a' }],
        相關圖片: [],
        相關檔案: [{ Title: '申請表', URL: 'https://www-ws.gov.taipei/f.pdf' }],
      },
      BASE,
    );
    expect(record).toEqual({
      id: '9142472',
      q: '敬老卡遺失怎麼辦？',
      a: '請先掛失。',
      dept: '臺北市政府社會局老人福利科',
      date: '2026-03-20',
      links: [
        { title: '掛失說明', url: 'https://www.gov.taipei/a' },
        { title: '申請表', url: 'https://www-ws.gov.taipei/f.pdf' },
      ],
    });
  });

  it('reads the live feed flavour (string ids, page URL, {title, url} links, Link target)', () => {
    const record = normalizeRecord(
      {
        DataSN: '8123184',
        ArticleType: '2',
        Link: 'https://www.travel.taipei/faq',
        Source: 'https://www.gov.taipei/News_Content.aspx?n=EEC70A4186D4C828&s=9EFFE42FAC12AF87',
        title: '來台北有購嗨常見問答',
        內容: '',
        日期時間: '2026-11-03T11:40:00',
        下版日期: '2027-01-01T00:00:00',
        相關連結: [{ title: '活動網站', url: 'https://www.travel.taipei/' }],
        相關圖片: [],
        相關檔案: [],
        發布單位: '臺北市商業處',
      },
      BASE,
    );
    expect(record?.url).toBe('https://www.gov.taipei/News_Content.aspx?n=EEC70A4186D4C828&s=9EFFE42FAC12AF87');
    expect(record?.offlineAt).toBe('2027-01-01T00:00:00');
    expect(record?.a).toBe('');
    expect(record?.links).toEqual([
      { title: '活動網站', url: 'https://www.travel.taipei/' },
      { title: '相關連結', url: 'https://www.travel.taipei/faq' },
    ]);
  });

  it('gives untitled attachments a readable name', () => {
    const record = normalizeRecord(
      { DataSN: 1, title: 'Q', 內容: '', 相關檔案: [{ Title: '', URL: 'https://a.tw/x.pdf' }] },
      BASE,
    );
    expect(record?.links).toEqual([{ title: '附件', url: 'https://a.tw/x.pdf' }]);
  });

  it('rejects records without an id or a question', () => {
    expect(normalizeRecord({ title: '沒有編號' }, BASE)).toBeNull();
    expect(normalizeRecord({ DataSN: 1, title: '  ' }, BASE)).toBeNull();
  });
});
