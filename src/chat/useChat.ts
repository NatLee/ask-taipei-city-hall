import type Anthropic from '@anthropic-ai/sdk';
import { useCallback, useRef, useState } from 'react';
import type { AskOptions, AskResult } from '../ai/answer.ts';
import { AI_CONTEXT_ENTRIES } from '../ai/config.ts';
import { AiError } from '../ai/errors.ts';
import type { FaqEntry } from '../data/types.ts';
import type { SearchClient } from '../search/client.ts';
import { readyClient } from '../search/useSearchEngine.ts';
import { PERSONA } from './persona.ts';
import { smalltalkReply } from './smalltalk.ts';
import type { ChatMessage } from './types.ts';

export interface ChatDependencies {
  client: () => Promise<SearchClient>;
  ask: (options: AskOptions) => Promise<AskResult>;
  smalltalk: (text: string) => string | null;
  /** Schedules a UI update; batches stream updates to one per frame in the browser. */
  schedule: (callback: () => void) => void;
}

const browserDependencies: ChatDependencies = {
  client: readyClient,
  // The Anthropic SDK is only downloaded the first time AI mode is used.
  ask: async (options) => (await import('../ai/answer.ts')).askClaude(options),
  smalltalk: (text) => smalltalkReply(text),
  schedule: (callback) => requestAnimationFrame(callback),
};

export interface AiMode {
  apiKey: string;
  modelId: string;
}

let counter = 0;
const nextId = () => `m${(counter += 1)}`;

export interface Chat {
  messages: ChatMessage[];
  busy: boolean;
  /** Ask a question. `ai` switches to AI mode for this question. */
  ask(question: string, ai: AiMode | null): Promise<void>;
  /** Show one FAQ entry as if the visitor had asked exactly that question. */
  showEntry(entry: FaqEntry): Promise<void>;
  /** Stop the AI answer being written. */
  stop(): void;
  /** Start a new conversation (the AI forgets earlier turns too). */
  reset(): void;
}

export function useChat(deps: ChatDependencies = browserDependencies): Chat {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const aiHistory = useRef<Anthropic.Beta.BetaMessageParam[]>([]);
  const abort = useRef<AbortController | null>(null);

  const push = useCallback((message: ChatMessage) => setMessages((list) => [...list, message]), []);
  const patch = useCallback(
    (id: string, changes: Partial<ChatMessage>) =>
      setMessages((list) => list.map((m) => (m.id === id ? ({ ...m, ...changes } as ChatMessage) : m))),
    [],
  );

  /** Run one exchange; only one at a time, like a conversation. */
  const exchange = useCallback(async (userText: string, reply: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    push({ id: nextId(), role: 'user', text: userText });
    try {
      await reply();
    } catch (error) {
      push({ id: nextId(), role: 'bot', kind: 'error', text: PERSONA.trouble, detail: error instanceof Error ? error.message : String(error) });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [push]);

  const answerWithAi = useCallback(
    async (question: string, client: SearchClient, ai: AiMode) => {
      const found = await client.call('search', question, AI_CONTEXT_ENTRIES);
      // Entries that share no word with the question would only distract the model.
      const entries = found.hits.filter((hit) => hit.coverage > 0).map((hit) => hit.entry);
      const id = nextId();
      push({ id, role: 'bot', kind: 'ai', modelId: ai.modelId, entries, content: [], status: 'streaming' });

      const controller = new AbortController();
      abort.current = controller;
      let latest: Anthropic.Beta.BetaContentBlock[] | null = null;
      let scheduled = false;
      try {
        const result = await deps.ask({
          apiKey: ai.apiKey,
          modelId: ai.modelId,
          history: aiHistory.current,
          question,
          entries,
          signal: controller.signal,
          onUpdate: (content) => {
            latest = content;
            if (scheduled) return;
            scheduled = true;
            deps.schedule(() => {
              scheduled = false;
              if (latest) patch(id, { content: latest });
            });
          },
        });
        latest = null;
        aiHistory.current = result.history;
        patch(id, {
          content: result.message.content,
          status: result.refused ? 'refused' : 'done',
          cost: result.cost,
          truncated: result.message.stop_reason === 'max_tokens',
        });
      } catch (error) {
        latest = null;
        const failure = error instanceof AiError ? error : new AiError('unknown', PERSONA.trouble, String(error));
        patch(id, {
          status: failure.kind === 'aborted' ? 'stopped' : 'error',
          error: { message: failure.message, detail: failure.detail },
        });
      } finally {
        abort.current = null;
      }
    },
    [deps, patch, push],
  );

  const ask = useCallback(
    (raw: string, ai: AiMode | null) => {
      const question = raw.trim();
      if (!question) return Promise.resolve();
      return exchange(question, async () => {
        const chat = deps.smalltalk(question);
        if (chat) {
          push({ id: nextId(), role: 'bot', kind: 'smalltalk', text: chat });
          return;
        }
        const client = await deps.client();
        if (ai) {
          await answerWithAi(question, client, ai);
          return;
        }
        const response = await client.call('search', question);
        const best = response.hits[0];
        const related = response.verdict === 'direct' && best ? await client.call('related', best.entry.id) : [];
        push({ id: nextId(), role: 'bot', kind: 'faq', response, related });
      });
    },
    [answerWithAi, deps, exchange, push],
  );

  const showEntry = useCallback(
    (entry: FaqEntry) =>
      exchange(entry.q, async () => {
        const client = await deps.client();
        const related = await client.call('related', entry.id);
        push({ id: nextId(), role: 'bot', kind: 'entry', entry, related });
      }),
    [deps, exchange, push],
  );

  const stop = useCallback(() => abort.current?.abort(), []);

  const reset = useCallback(() => {
    abort.current?.abort();
    aiHistory.current = [];
    setMessages([]);
  }, []);

  return { messages, busy, ask, showEntry, stop, reset };
}
