import { AlertTriangle, KeyRound, Sparkles, Square } from 'lucide-react';
import { Fragment, useId } from 'react';
import { plainModelText, viewAnswer } from '../ai/citations.ts';
import { findModel } from '../ai/config.ts';
import { PERSONA } from '../chat/persona.ts';
import type { ChatMessage } from '../chat/types.ts';
import { BotText, Typing } from './Bubbles.tsx';
import { FaqCard } from './FaqCard.tsx';

type AiMessage = Extract<ChatMessage, { kind: 'ai' }>;

function formatUsd(usd: number): string {
  return usd < 0.01 ? `不到 US$0.01` : `約 US$${usd.toFixed(usd < 0.1 ? 3 : 2)}`;
}

export function AiReply({ message, onOpenSettings }: { message: AiMessage; onOpenSettings: () => void }) {
  const view = viewAnswer(message.content);
  const anchor = useId();
  const model = findModel(message.modelId);
  const cited = new Set(view.sources.map((source) => source.entryId));
  const uncited = message.entries.filter((entry) => !cited.has(entry.id));
  const writing = message.status === 'streaming';

  return (
    <>
      <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Sparkles className="size-3.5 text-amber-500" aria-hidden />
        AI 回答 · {model.label}
      </p>

      {(view.parts.length > 0 || writing) && (
        <BotText>
          {view.thinking && writing ? (
            <Typing label="正在讀 FAQ、整理答案…" />
          ) : (
            <p className="whitespace-pre-wrap" aria-busy={writing}>
              {view.parts.map((part, index) => (
                <Fragment key={index}>
                  {plainModelText(part.text)}
                  {part.refs.map((ref) => (
                    <sup key={ref} className="mx-0.5">
                      <a
                        href={`#${anchor}-${ref}`}
                        aria-label={`出處 ${ref}`}
                        className="rounded bg-brand-100 px-1 text-[0.7rem] font-semibold text-brand-800 no-underline hover:bg-brand-200 dark:bg-brand-900/60 dark:text-brand-200"
                      >
                        {ref}
                      </a>
                    </sup>
                  ))}
                </Fragment>
              ))}
              {writing && <span aria-hidden className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-brand-500 align-middle" />}
            </p>
          )}
        </BotText>
      )}

      {message.status === 'refused' && <BotText>{PERSONA.refused}</BotText>}
      {message.status === 'stopped' && (
        <p className="flex items-center gap-1.5 text-sm text-slate-500">
          <Square className="size-3.5" aria-hidden />
          已停止回答。
        </p>
      )}
      {message.truncated && <p className="text-sm text-amber-700 dark:text-amber-300">回答太長，已在上限處截斷。</p>}

      {message.status === 'error' && message.error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="size-4" aria-hidden />
            {message.error.message}
          </p>
          {message.error.detail && <p className="mt-1 break-words text-xs opacity-80">{message.error.detail}</p>}
          <button type="button" onClick={onOpenSettings} className="mt-2 inline-flex items-center gap-1 text-xs font-medium underline">
            <KeyRound className="size-3.5" aria-hidden />
            打開 AI 設定
          </button>
        </div>
      )}

      {view.sources.length > 0 && (
        <section aria-label="引用的 FAQ" className="space-y-2">
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">引用的 FAQ（點開看原文）</h3>
          {view.sources.map((source) => {
            const entry = message.entries.find((candidate) => candidate.id === source.entryId);
            return entry ? (
              <div key={source.number} id={`${anchor}-${source.number}`} className="scroll-mt-24">
                <FaqCard entry={entry} folded label={String(source.number)} />
              </div>
            ) : null;
          })}
        </section>
      )}

      {!writing && uncited.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer select-none text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300">
            也送給 AI 參考、但沒有引用的 {uncited.length} 則 FAQ
          </summary>
          <div className="mt-2 space-y-2">
            {uncited.map((entry) => (
              <FaqCard key={entry.id} entry={entry} folded />
            ))}
          </div>
        </details>
      )}

      {message.status === 'done' && (
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {PERSONA.aiDisclaimer}
          {message.cost && (
            <>
              {' '}
              這次{formatUsd(message.cost.usd)}（{message.cost.inputTokens.toLocaleString()} 輸入、
              {message.cost.outputTokens.toLocaleString()} 輸出 tokens{message.cost.complete ? '' : '，未含備援模型'}），由你的 API 帳戶支付。
            </>
          )}
        </p>
      )}
    </>
  );
}
