import type Anthropic from '@anthropic-ai/sdk';
import type { FaqEntry } from '../data/types.ts';
import { HOTLINE } from '../config/links.ts';

type MessageParam = Anthropic.Beta.BetaMessageParam;
type SearchResultBlock = Anthropic.Beta.BetaSearchResultBlockParam;

/**
 * The system prompt never changes during a conversation (no dates, no counts),
 * so the API can cache it and earlier answers stay valid.
 */
export const SYSTEM_PROMPT = `你是「問問台北市政府」網頁上的小幫手，根據臺北市政府公開的「常見問答」（FAQ）資料回答市民的問題。

每次市民發問時，網頁會先在 FAQ 資料裡搜尋，把最相關的幾則當成搜尋結果放進訊息。請遵守：

1. 只根據這些搜尋結果回答。不要用你自己的知識補上電話、金額、日期、資格、地址或流程。
2. 如果搜尋結果沒有涵蓋這個問題，或只涵蓋一部分，要直接說明「市政 FAQ 裡沒有找到」哪一部分，不要猜。接著建議撥打${HOTLINE.name}（外縣市請撥 ${HOTLINE.outOfTown}）或洽詢相關機關。
3. 用到搜尋結果的內容時，要引用那一則，讓市民可以點開原文確認。
4. FAQ 可能已經過時。答案牽涉年度、金額或期限時，提醒市民以機關最新公告為準。
5. 用繁體中文和台灣用語回答；市民用其他語言發問時，就用那個語言回答。
6. 先給結論，再列出步驟、文件或條件。寫純文字，可以用「1.」或「•」條列，不要用 Markdown 標題、表格或粗體。
7. 你不是市政府的官方客服，不能代辦申請，也不能保證結果。`;

/** Stable identifier for an FAQ entry inside the conversation; citations point back to it. */
export function sourceFor(entry: FaqEntry): string {
  return `taipei-faq://${entry.id}`;
}

export function entryIdFromSource(source: string): string | null {
  const match = /^taipei-faq:\/\/(.+)$/.exec(source);
  return match?.[1] ?? null;
}

/**
 * One FAQ entry as a search result. Each paragraph is its own text block so
 * citations can point at the exact paragraph. Answers that are only an
 * attachment list the attachment names instead.
 */
export function searchResultFor(entry: FaqEntry): SearchResultBlock {
  const paragraphs = entry.a.split('\n').filter((line) => line.trim().length > 0);
  if (paragraphs.length === 0) {
    const attachments = (entry.links ?? []).map((link) => link.title).join('、');
    paragraphs.push(attachments ? `這題的答案放在附件：${attachments}` : '這題沒有文字答案。');
  }
  return {
    type: 'search_result',
    source: sourceFor(entry),
    title: `${entry.q}（${entry.dept}，${entry.date} 更新）`,
    content: paragraphs.map((text) => ({ type: 'text', text })),
    citations: { enabled: true },
  };
}

/** The visitor's turn: the retrieved FAQ entries, then the question itself. */
export function userTurn(question: string, entries: readonly FaqEntry[]): MessageParam {
  const intro =
    entries.length > 0
      ? `以上是從市政 FAQ 裡搜尋到最相關的 ${entries.length} 則。`
      : '市政 FAQ 裡沒有搜尋到相關的問答。';
  return {
    role: 'user',
    content: [...entries.map(searchResultFor), { type: 'text', text: `${intro}\n\n市民的問題：${question}` }],
  };
}
