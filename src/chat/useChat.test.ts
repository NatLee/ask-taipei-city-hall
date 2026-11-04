import type Anthropic from '@anthropic-ai/sdk';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AiError, type AskOptions, type AskResult } from '../ai/answer.ts';
import type { SearchClient } from '../search/client.ts';
import { SearchService } from '../search/service.ts';
import { createWordSegmenter } from '../search/tokenize.ts';
import { fixtureDataset } from '../test/fixtureDataset.ts';
import { PERSONA } from './persona.ts';
import { type ChatDependencies, useChat } from './useChat.ts';

const service = new SearchService(fixtureDataset(), createWordSegmenter());

/** A SearchClient that calls the service directly instead of a worker. */
const client = {
  call: async (method: string, ...args: unknown[]) =>
    (service as unknown as Record<string, (...a: unknown[]) => unknown>)[method]?.(...args),
} as unknown as SearchClient;

function deps(overrides: Partial<ChatDependencies> = {}): ChatDependencies {
  return {
    client: async () => client,
    ask: vi.fn(),
    smalltalk: () => null,
    schedule: (callback) => callback(),
    ...overrides,
  };
}

const AI = { apiKey: 'sk-ant-test', modelId: 'claude-opus-5-5' };

function fakeAnswer(text: string): AskResult {
  const content = [{ type: 'text', text, citations: null }] as unknown as Anthropic.Beta.BetaContentBlock[];
  return {
    message: { content, stop_reason: 'end_turn' } as unknown as Anthropic.Beta.BetaMessage,
    refused: false,
    history: [{ role: 'user', content: 'q' }, { role: 'assistant', content }],
    cost: { usd: 0.01, inputTokens: 100, outputTokens: 20, complete: true },
  };
}

describe('useChat', () => {
  it('answers small talk without searching', async () => {
    const clientSpy = vi.fn(async () => client);
    const { result } = renderHook(() => useChat(deps({ smalltalk: () => '嗨！', client: clientSpy })));
    await act(() => result.current.ask('你好', null));
    expect(result.current.messages.map((m) => (m.role === 'user' ? m.text : m.kind))).toEqual(['你好', 'smalltalk']);
    expect(clientSpy).not.toHaveBeenCalled();
  });

  it('searches the FAQ in free mode and adds related questions to a direct answer', async () => {
    const { result } = renderHook(() => useChat(deps()));
    await act(() => result.current.ask('酒駕累犯怎麼罰', null));
    const reply = result.current.messages[1];
    expect(reply).toMatchObject({ kind: 'faq', response: { verdict: 'direct' } });
    expect(reply?.role === 'bot' && reply.kind === 'faq' && reply.related.length).toBeGreaterThan(0);
  });

  it('ignores empty questions and questions sent while busy', async () => {
    let release: () => void = () => {};
    const slowClient = () => new Promise<SearchClient>((resolve) => (release = () => resolve(client)));
    const { result } = renderHook(() => useChat(deps({ client: slowClient })));
    await act(() => result.current.ask('   ', null));
    expect(result.current.messages).toEqual([]);
    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.ask('房屋稅', null);
    });
    await act(() => result.current.ask('地價稅', null));
    await act(async () => {
      release();
      await first;
    });
    expect(result.current.messages.filter((m) => m.role === 'user')).toHaveLength(1);
  });

  it('streams an AI answer and keeps the conversation for follow-ups', async () => {
    const ask = vi.fn(async (options: AskOptions) => {
      options.onUpdate?.([{ type: 'text', text: '先掛', citations: null }] as unknown as Anthropic.Beta.BetaContentBlock[]);
      return fakeAnswer('先掛失再補辦。');
    });
    const { result } = renderHook(() => useChat(deps({ ask })));
    await act(() => result.current.ask('敬老卡掉了', AI));
    const reply = result.current.messages[1];
    expect(reply).toMatchObject({ kind: 'ai', status: 'done', cost: { usd: 0.01 } });
    expect(ask.mock.calls[0]?.[0].entries.length).toBeGreaterThan(0);

    await act(() => result.current.ask('那要多久', AI));
    expect(ask.mock.calls[1]?.[0].history).toHaveLength(2);
  });

  it('shows AI errors in the reply and keeps going', async () => {
    const ask = vi.fn(async () => {
      throw new AiError('auth', 'API key 無效', '401');
    });
    const { result } = renderHook(() => useChat(deps({ ask })));
    await act(() => result.current.ask('敬老卡', AI));
    expect(result.current.messages[1]).toMatchObject({ kind: 'ai', status: 'error', error: { message: 'API key 無效' } });
    expect(result.current.busy).toBe(false);
  });

  it('falls back to the 2017 trouble message when the search fails', async () => {
    const broken = async () => {
      throw new Error('worker crashed');
    };
    const { result } = renderHook(() => useChat(deps({ client: broken })));
    await act(() => result.current.ask('房屋稅', null));
    expect(result.current.messages[1]).toMatchObject({ kind: 'error', text: PERSONA.trouble, detail: 'worker crashed' });
  });

  it('shows a picked entry with related questions, and resets', async () => {
    const entry = service.get('9395231');
    const { result } = renderHook(() => useChat(deps()));
    await act(() => result.current.showEntry(entry!));
    expect(result.current.messages[0]).toMatchObject({ role: 'user', text: entry?.q });
    expect(result.current.messages[1]).toMatchObject({ kind: 'entry', entry: { id: '9395231' } });
    act(() => result.current.reset());
    expect(result.current.messages).toEqual([]);
  });
});
