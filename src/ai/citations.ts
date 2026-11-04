import type Anthropic from '@anthropic-ai/sdk';
import { entryIdFromSource } from './prompt.ts';

type ContentBlock = Anthropic.Beta.BetaContentBlock;

export interface AnswerPart {
  text: string;
  /** Source numbers cited by this part, in order. */
  refs: number[];
}

export interface AnswerSource {
  number: number;
  entryId: string;
  /** The passages the answer quoted from this entry. */
  quotes: string[];
}

export interface AnswerView {
  parts: AnswerPart[];
  sources: AnswerSource[];
  /** True while the model is still thinking and has not written any text. */
  thinking: boolean;
}

/**
 * Turn the model's content blocks into text parts with numbered references.
 * Sources are numbered in the order the answer first cites them.
 */
export function viewAnswer(content: readonly ContentBlock[]): AnswerView {
  const sources = new Map<string, AnswerSource>();
  const parts: AnswerPart[] = [];
  for (const block of content) {
    if (block.type !== 'text') continue;
    const refs: number[] = [];
    for (const citation of block.citations ?? []) {
      if (citation.type !== 'search_result_location') continue;
      const entryId = entryIdFromSource(citation.source);
      if (!entryId) continue;
      let source = sources.get(entryId);
      if (!source) sources.set(entryId, (source = { number: sources.size + 1, entryId, quotes: [] }));
      if (!source.quotes.includes(citation.cited_text)) source.quotes.push(citation.cited_text);
      if (!refs.includes(source.number)) refs.push(source.number);
    }
    parts.push({ text: block.text, refs });
  }
  const hasText = parts.some((part) => part.text.trim().length > 0);
  return { parts, sources: [...sources.values()], thinking: !hasText };
}

/**
 * The model is asked for plain text; if it still uses Markdown emphasis or
 * headings, show the words without the symbols.
 */
export function plainModelText(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,6}\s+/gm, '');
}
