import { ArrowUp, Search, Sparkles, Square } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useRef, useState } from 'react';
import { findModel } from '../ai/config.ts';

interface ComposerProps {
  busy: boolean;
  /** An AI answer is being written and can be stopped. */
  canStop: boolean;
  aiActive: boolean;
  modelId: string;
  onSend: (text: string) => void;
  onStop: () => void;
  /** Switch modes; switching to AI without a key opens the settings. */
  onMode: (ai: boolean) => void;
}

export function Composer({ busy, canStop, aiActive, modelId, onSend, onStop, onMode }: ComposerProps) {
  const [text, setText] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);

  const send = (event?: FormEvent) => {
    event?.preventDefault();
    if (!text.trim() || busy) return;
    onSend(text);
    setText('');
    input.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter adds a line. Never send while a Chinese IME is composing.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) send(event);
  };

  const modeButton = (ai: boolean, label: string, Icon: typeof Search) => (
    <button
      type="button"
      aria-pressed={aiActive === ai}
      onClick={() => onMode(ai)}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
        aiActive === ai
          ? ai
            ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200'
            : 'bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200'
          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
      }`}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </button>
  );

  return (
    <form onSubmit={send} className="mx-auto w-full max-w-3xl">
      <div className="mb-2 flex flex-wrap items-center gap-1" role="group" aria-label="回答方式">
        {modeButton(false, '免費搜尋', Search)}
        {modeButton(true, aiActive ? `AI · ${findModel(modelId).label}` : 'AI 回答', Sparkles)}
      </div>
      <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900">
        <label htmlFor="question" className="sr-only">
          輸入你的問題
        </label>
        <textarea
          id="question"
          ref={input}
          rows={1}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="例如：敬老卡遺失怎麼辦？"
          className="field-sizing-content max-h-36 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 leading-6 placeholder:text-slate-400 focus:outline-none"
        />
        {canStop ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="停止回答"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900"
          >
            <Square className="size-4" aria-hidden />
          </button>
        ) : (
          <button
            type="submit"
            disabled={busy || !text.trim()}
            aria-label="送出"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-brand-600 dark:disabled:bg-slate-700"
          >
            <ArrowUp className="size-5" aria-hidden />
          </button>
        )}
      </div>
      <p className="mt-1.5 text-center text-[0.7rem] text-slate-500 dark:text-slate-400">
        答案來自臺北市政府公開的常見問答，可能不是最新；重要的事請以機關公告為準。
      </p>
    </form>
  );
}
