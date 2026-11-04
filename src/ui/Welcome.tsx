import { AlertTriangle, Sparkles } from 'lucide-react';
import { PERSONA, welcomeText } from '../chat/persona.ts';
import { EXAMPLE_QUESTIONS } from '../config/examples.ts';
import type { EngineState } from '../search/useSearchEngine.ts';
import { BotBubble, BotText, Typing } from './Bubbles.tsx';
import { CategoryIcon } from './categoryIcons.tsx';

interface WelcomeProps {
  engine: EngineState;
  aiActive: boolean;
  onAsk: (question: string) => void;
  onBrowse: (categoryId: string) => void;
  onOpenAi: () => void;
}

export function Welcome({ engine, aiActive, onAsk, onBrowse, onOpenAi }: WelcomeProps) {
  const meta = engine.status === 'ready' ? engine.meta : null;
  return (
    <BotBubble>
      <BotText>
        <p>{welcomeText(meta?.total ?? null)}</p>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          {aiActive
            ? 'AI 模式已開啟：我會先找出相關的 FAQ，再請 Claude 根據它們回答，並標出出處。'
            : '免費模式：直接在你的瀏覽器裡搜尋，不用帳號，也不會把問題送到任何地方。'}
        </p>
      </BotText>

      {engine.status === 'loading' && (
        <div className="pl-1">
          <Typing label={PERSONA.loading} />
        </div>
      )}
      {engine.status === 'error' && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="size-4" aria-hidden />
            {PERSONA.trouble}
          </p>
          <p className="mt-1 text-xs opacity-80">{engine.message} 請重新整理頁面再試一次。</p>
        </div>
      )}

      <section aria-labelledby="examples-title">
        <h2 id="examples-title" className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          試試看這些問題
        </h2>
        <ul className="flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((question) => (
            <li key={question}>
              <button
                type="button"
                onClick={() => onAsk(question)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:hover:text-brand-300"
              >
                {question}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {meta && (
        <section aria-labelledby="topics-title">
          <h2 id="topics-title" className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            或依主題瀏覽
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {meta.categories.map((category) => {
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    onClick={() => onBrowse(category.id)}
                    className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                      <CategoryIcon name={category.icon} className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{category.name}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{category.count.toLocaleString()} 題</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!aiActive && (
        <button
          type="button"
          onClick={onOpenAi}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-3 text-left text-sm hover:border-amber-400 dark:border-amber-700/60 dark:bg-amber-950/20"
        >
          <Sparkles className="size-5 shrink-0 text-amber-500" aria-hidden />
          <span>
            <span className="block font-medium">想讓 AI 幫你整理答案？</span>
            <span className="block text-slate-600 dark:text-slate-300">貼上你自己的 Claude API key 就能開啟 AI 模式，金鑰只留在你的瀏覽器。</span>
          </span>
        </button>
      )}
    </BotBubble>
  );
}
