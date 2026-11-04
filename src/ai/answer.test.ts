import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import type { FaqEntry } from '../data/types.ts';
import { AiError, askClaude, estimateCost, historyContent } from './answer.ts';
import { viewAnswer } from './citations.ts';
import { AI_EFFORT, AI_MAX_TOKENS, SERVER_FALLBACK_BETA } from './config.ts';
import { sourceFor } from './prompt.ts';

const ENTRY: FaqEntry = {
  id: '9142472',
  q: '敬老悠遊卡遺失該怎麼辦？',
  a: '請先打電話掛失。\n再到區公所申請補發。',
  dept: '臺北市政府社會局老人福利科',
  cat: 'welfare',
  date: '2026-03-20',
};

type Event = Record<string, unknown>;

/** The events of one streamed reply: optional thinking, then cited text. */
function replyEvents(options: { stopReason?: string; text?: string; cite?: boolean } = {}): Event[] {
  const { stopReason = 'end_turn', text = '請先掛失，再到區公所補辦。', cite = true } = options;
  return [
    {
      type: 'message_start',
      message: {
        id: 'msg_1',
        type: 'message',
        role: 'assistant',
        model: 'claude-opus-5-5',
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 1200, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      },
    },
    { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '', signature: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'sig' } },
    { type: 'content_block_stop', index: 0 },
    { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '', citations: null } },
    { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text } },
    ...(cite
      ? [
          {
            type: 'content_block_delta',
            index: 1,
            delta: {
              type: 'citations_delta',
              citation: {
                type: 'search_result_location',
                cited_text: '請先打電話掛失。',
                source: sourceFor(ENTRY),
                title: ENTRY.q,
                search_result_index: 0,
                start_block_index: 0,
                end_block_index: 1,
              },
            },
          },
        ]
      : []),
    { type: 'content_block_stop', index: 1 },
    { type: 'message_delta', delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 80 } },
    { type: 'message_stop' },
  ];
}

interface Captured {
  url: string;
  headers: Headers;
  body: Record<string, unknown>;
}

/** A fetch that records the request and answers with server-sent events or an error. */
function fakeFetch(reply: Event[] | { status: number; error: Record<string, unknown> }, captured: Captured[] = []) {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    captured.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    if (!Array.isArray(reply)) {
      return new Response(JSON.stringify({ type: 'error', error: reply.error }), {
        status: reply.status,
        headers: { 'content-type': 'application/json' },
      });
    }
    const sse = reply.map((event) => `event: ${String(event.type)}\ndata: ${JSON.stringify(event)}\n\n`).join('');
    return new Response(sse, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  }) as typeof fetch;
}

const base = { apiKey: 'sk-ant-test-key-0000000000000000', question: '敬老卡掉了怎麼辦', entries: [ENTRY], history: [] };

describe('askClaude', () => {
  it('calls the Messages API from the browser with the FAQ entries as cited search results', async () => {
    const captured: Captured[] = [];
    await askClaude({ ...base, modelId: 'claude-opus-5-5', fetch: fakeFetch(replyEvents(), captured) });
    const [request] = captured;
    expect(request?.url).toMatch(/^https:\/\/api\.anthropic\.com\/v1\/messages/);
    expect(request?.headers.get('anthropic-dangerous-direct-browser-access')).toBe('true');
    expect(request?.headers.get('anthropic-beta')).toContain(SERVER_FALLBACK_BETA);
    expect(request?.body).toMatchObject({
      model: 'claude-opus-5-5',
      max_tokens: AI_MAX_TOKENS,
      stream: true,
      fallbacks: 'default',
      output_config: { effort: AI_EFFORT },
    });
    const [turn] = request?.body.messages as Anthropic.Beta.BetaMessageParam[];
    const blocks = turn?.content as Anthropic.Beta.BetaContentBlockParam[];
    expect(blocks[0]).toEqual({
      type: 'search_result',
      source: 'taipei-faq://9142472',
      title: '敬老悠遊卡遺失該怎麼辦？（臺北市政府社會局老人福利科，2026-03-20 更新）',
      content: [
        { type: 'text', text: '請先打電話掛失。' },
        { type: 'text', text: '再到區公所申請補發。' },
      ],
      citations: { enabled: true },
    });
    expect(blocks.at(-1)).toMatchObject({ type: 'text', text: expect.stringContaining('敬老卡掉了怎麼辦') });
  });

  it('leaves out server-side fallbacks for Haiku, which has none', async () => {
    const captured: Captured[] = [];
    await askClaude({ ...base, modelId: 'claude-haiku-5-5', fetch: fakeFetch(replyEvents(), captured) });
    expect(captured[0]?.body.fallbacks).toBeUndefined();
    expect(captured[0]?.headers.get('anthropic-beta') ?? '').not.toContain(SERVER_FALLBACK_BETA);
  });

  it('streams the answer and maps citations back to FAQ entries', async () => {
    const updates: string[] = [];
    const result = await askClaude({
      ...base,
      modelId: 'claude-opus-5-5',
      fetch: fakeFetch(replyEvents()),
      onUpdate: (content) => updates.push(viewAnswer(content).parts.map((part) => part.text).join('')),
    });
    expect(updates.at(-1)).toBe('請先掛失，再到區公所補辦。');
    const view = viewAnswer(result.message.content);
    expect(view.parts).toEqual([{ text: '請先掛失，再到區公所補辦。', refs: [1] }]);
    expect(view.sources).toEqual([{ number: 1, entryId: '9142472', quotes: ['請先打電話掛失。'] }]);
  });

  it('appends the turn to the history unchanged, thinking blocks included', async () => {
    const result = await askClaude({ ...base, modelId: 'claude-opus-5-5', fetch: fakeFetch(replyEvents()) });
    expect(result.history).toHaveLength(2);
    expect(result.history[1]).toEqual({ role: 'assistant', content: result.message.content });
    expect(result.message.content.map((block) => block.type)).toEqual(['thinking', 'text']);

    const captured: Captured[] = [];
    await askClaude({ ...base, history: result.history, modelId: 'claude-opus-5-5', fetch: fakeFetch(replyEvents(), captured) });
    expect((captured[0]?.body.messages as unknown[]).length).toBe(3);
  });

  it('reports a refusal and keeps it out of the history', async () => {
    const result = await askClaude({
      ...base,
      modelId: 'claude-opus-5-5',
      fetch: fakeFetch(replyEvents({ stopReason: 'refusal', text: '', cite: false })),
    });
    expect(result.refused).toBe(true);
    expect(result.history).toEqual([]);
  });

  it('turns API errors into messages a visitor can act on', async () => {
    const attempt = askClaude({
      ...base,
      modelId: 'claude-opus-5-5',
      fetch: fakeFetch({ status: 401, error: { type: 'authentication_error', message: 'invalid x-api-key' } }),
    });
    await expect(attempt).rejects.toBeInstanceOf(AiError);
    await expect(attempt).rejects.toMatchObject({ kind: 'auth', detail: expect.stringContaining('invalid x-api-key') });
  });

  it('reports a stopped answer as aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      askClaude({ ...base, modelId: 'claude-opus-5-5', fetch: fakeFetch(replyEvents()), signal: controller.signal }),
    ).rejects.toMatchObject({ kind: 'aborted' });
  });
});

describe('estimateCost', () => {
  it('prices input, cache and output tokens with the model price list', () => {
    const cost = estimateCost(
      {
        input_tokens: 1_000_000,
        output_tokens: 100_000,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 1_000_000,
        iterations: null,
      } as unknown as Anthropic.Beta.BetaUsage,
      'claude-opus-5-5',
    );
    // Opus 5.5: $4 per million input, $0.40 per million cache reads, $20 per million output.
    expect(cost.usd).toBeCloseTo(4 + 0.4 + 2, 6);
    expect(cost.complete).toBe(true);
  });

  it('marks the estimate incomplete when a fallback model it cannot price ran', () => {
    const cost = estimateCost(
      {
        input_tokens: 10,
        output_tokens: 10,
        iterations: [
          { type: 'message', model: 'claude-opus-5-5', input_tokens: 10, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
          { type: 'fallback_message', model: 'claude-opus-4-8', input_tokens: 10, output_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
        ],
      } as unknown as Anthropic.Beta.BetaUsage,
      'claude-opus-5-5',
    );
    expect(cost.complete).toBe(false);
    expect(cost.inputTokens).toBe(20);
  });
});

describe('historyContent', () => {
  it('drops thinking from before a mid-answer fallback, keeps text and later blocks', () => {
    const content = [
      { type: 'thinking', thinking: '', signature: 'a' },
      { type: 'text', text: '部分', citations: null },
      { type: 'fallback', from: { model: 'claude-opus-5-5' }, to: { model: 'claude-opus-5' } },
      { type: 'thinking', thinking: '', signature: 'b' },
      { type: 'text', text: '其餘', citations: null },
    ] as unknown as Anthropic.Beta.BetaContentBlock[];
    expect(historyContent(content).map((block) => block.type)).toEqual(['text', 'fallback', 'thinking', 'text']);
  });

  it('keeps everything when there was no fallback', () => {
    const content = [{ type: 'thinking', thinking: '', signature: 'a' }] as unknown as Anthropic.Beta.BetaContentBlock[];
    expect(historyContent(content)).toEqual(content);
  });
});
