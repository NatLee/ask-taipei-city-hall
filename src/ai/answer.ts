import Anthropic from '@anthropic-ai/sdk';
import type { FaqEntry } from '../data/types.ts';
import {
  AI_EFFORT,
  AI_MAX_TOKENS,
  ANTHROPIC_API_ORIGIN,
  findModel,
  type ModelOption,
  SERVER_FALLBACK_BETA,
} from './config.ts';
import { AiError, type AiErrorKind } from './errors.ts';
import { SYSTEM_PROMPT, userTurn } from './prompt.ts';

type MessageParam = Anthropic.Beta.BetaMessageParam;
type ContentBlock = Anthropic.Beta.BetaContentBlock;
type Message = Anthropic.Beta.BetaMessage;

export { AiError, type AiErrorKind };

/** Map SDK errors (most specific first) to something a visitor understands. */
export function toAiError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  if (error instanceof Anthropic.APIUserAbortError) return new AiError('aborted', '已停止回答。');
  if (error instanceof Anthropic.AuthenticationError) {
    return new AiError('auth', 'API key 無效或已被撤銷，請檢查後重新輸入。', error.message);
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return new AiError('permission', '這把 API key 沒有權限使用這個模型，請換一個模型或檢查帳號設定。', error.message);
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new AiError('rate', '請求太頻繁或已達帳號的用量上限，請稍後再試。', error.message);
  }
  if (error instanceof Anthropic.BadRequestError) {
    return new AiError('request', 'Anthropic API 拒絕了這次請求（常見原因是帳戶餘額不足）。', error.message);
  }
  if (error instanceof Anthropic.InternalServerError) {
    return new AiError('overloaded', 'Anthropic 的服務暫時忙碌，請稍後再試。', error.message);
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new AiError('network', '連不上 Anthropic API，請檢查網路連線。', error.message);
  }
  if (error instanceof Anthropic.APIError) {
    return new AiError('unknown', `Anthropic API 回傳錯誤（${String(error.status)}）。`, error.message);
  }
  return new AiError('unknown', '發生未預期的錯誤。', error instanceof Error ? error.message : String(error));
}

export interface CostEstimate {
  usd: number;
  inputTokens: number;
  outputTokens: number;
  /** False when part of the work ran on a model this page has no price for (a safety fallback). */
  complete: boolean;
}

/**
 * Rough cost of one answer from the usage the API reports. Cache writes cost
 * 1.25× and cache reads 0.1× the input price (5-minute cache).
 */
export function estimateCost(usage: Anthropic.Beta.BetaUsage, requestedModel: string): CostEstimate {
  const attempts = (usage.iterations ?? []).flatMap((entry) =>
    entry.type === 'message' || entry.type === 'fallback_message' ? [entry] : [],
  );
  const rows =
    attempts.length > 0
      ? attempts.map((entry) => ({ ...entry, model: entry.model ?? requestedModel }))
      : [{ ...usage, model: requestedModel }];

  let usd = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let complete = true;
  for (const row of rows) {
    const cacheWrite = row.cache_creation_input_tokens ?? 0;
    const cacheRead = row.cache_read_input_tokens ?? 0;
    inputTokens += row.input_tokens + cacheWrite + cacheRead;
    outputTokens += row.output_tokens;
    const price = findModel(String(row.model));
    if (price.id !== String(row.model)) {
      complete = false;
      continue;
    }
    usd +=
      (row.input_tokens * price.inputPrice +
        cacheWrite * price.inputPrice * 1.25 +
        cacheRead * price.inputPrice * 0.1 +
        row.output_tokens * price.outputPrice) /
      1_000_000;
  }
  return { usd, inputTokens, outputTokens, complete };
}

/**
 * The assistant turn as it goes back into the conversation. Blocks are kept
 * unchanged (the API checks that earlier turns are not edited), except after
 * a safety fallback mid-answer: thinking blocks from before the last
 * `fallback` marker belong to the model that declined and must be left out.
 */
export function historyContent(content: readonly ContentBlock[]): ContentBlock[] {
  const lastFallback = content.map((block) => block.type).lastIndexOf('fallback');
  if (lastFallback < 0) return [...content];
  const dropped = new Set(['thinking', 'redacted_thinking', 'tool_use']);
  return content.filter((block, index) => index > lastFallback || !dropped.has(block.type));
}

export interface AskOptions {
  apiKey: string;
  modelId: string;
  /** Earlier AI turns of this conversation, exactly as returned by previous calls. */
  history: readonly MessageParam[];
  question: string;
  /** FAQ entries found for the question; sent as search results. */
  entries: readonly FaqEntry[];
  /** Called with the answer so far whenever the stream moves. */
  onUpdate?: (content: ContentBlock[]) => void;
  signal?: AbortSignal;
  /** Only for tests. */
  fetch?: typeof fetch;
}

export interface AskResult {
  message: Message;
  /** True when Anthropic's safety system declined to answer. */
  refused: boolean;
  /** The conversation including this turn; pass it as `history` next time. Unchanged after a refusal. */
  history: MessageParam[];
  cost: CostEstimate;
}

export function requestBody(model: ModelOption, messages: MessageParam[]) {
  return {
    model: model.id,
    max_tokens: AI_MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages,
    output_config: { effort: AI_EFFORT },
    // Caches the conversation so far, which makes follow-up questions cheaper.
    cache_control: { type: 'ephemeral' as const },
    ...(model.serverFallback ? { betas: [SERVER_FALLBACK_BETA], fallbacks: 'default' as const } : {}),
  };
}

/** Ask Claude to answer `question` from `entries`, streaming the answer. */
export async function askClaude(options: AskOptions): Promise<AskResult> {
  const model = findModel(options.modelId);
  const client = new Anthropic({
    apiKey: options.apiKey,
    baseURL: ANTHROPIC_API_ORIGIN,
    // The visitor brings their own key; see README "AI 模式的風險".
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
  const turn = userTurn(options.question, options.entries);
  const messages = [...options.history, turn];

  try {
    const stream = client.beta.messages.stream(requestBody(model, messages), { signal: options.signal });
    if (options.onUpdate) {
      const onUpdate = options.onUpdate;
      stream.on('streamEvent', (_event, snapshot) => onUpdate(snapshot.content));
    }
    const message = await stream.finalMessage();
    const refused = message.stop_reason === 'refusal';
    return {
      message,
      refused,
      history: refused
        ? [...options.history]
        : [...messages, { role: 'assistant', content: historyContent(message.content) }],
      cost: estimateCost(message.usage, model.id),
    };
  } catch (error) {
    throw toAiError(error);
  }
}
