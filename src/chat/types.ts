import type Anthropic from '@anthropic-ai/sdk';
import type { CostEstimate } from '../ai/answer.ts';
import type { FaqEntry } from '../data/types.ts';
import type { SearchResponse } from '../search/service.ts';

export type AiStatus = 'streaming' | 'done' | 'refused' | 'stopped' | 'error';

export type ChatMessage =
  | { id: string; role: 'user'; text: string }
  /** Free mode: the search result, judged as direct / suggest / none. */
  | { id: string; role: 'bot'; kind: 'faq'; response: SearchResponse; related: FaqEntry[] }
  /** One FAQ entry the visitor picked (from suggestions, related questions or browsing). */
  | { id: string; role: 'bot'; kind: 'entry'; entry: FaqEntry; related: FaqEntry[] }
  | { id: string; role: 'bot'; kind: 'smalltalk'; text: string }
  | {
      id: string;
      role: 'bot';
      kind: 'ai';
      modelId: string;
      /** FAQ entries sent to the model; citations point into these. */
      entries: FaqEntry[];
      content: Anthropic.Beta.BetaContentBlock[];
      status: AiStatus;
      cost?: CostEstimate;
      truncated?: boolean;
      error?: { message: string; detail: string };
    }
  | { id: string; role: 'bot'; kind: 'error'; text: string; detail?: string };

export type BotMessage = Extract<ChatMessage, { role: 'bot' }>;
