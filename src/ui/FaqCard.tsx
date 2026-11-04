import { Check, ChevronDown, ExternalLink, Link2, Paperclip, Search, Share2 } from 'lucide-react';
import { useId, useState } from 'react';
import { SEARCH_LINKS } from '../config/links.ts';
import type { FaqEntry, FaqLink } from '../data/types.ts';
import { AnswerText } from './AnswerText.tsx';
import { CategoryIcon } from './categoryIcons.tsx';
import { useCategory } from './DatasetContext.ts';
import { shareQuestion } from './share.ts';

/** Answers longer than this start folded, like the 2017 bot split long answers into several messages. */
const FOLD_AFTER_CHARS = 320;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function isFile(link: FaqLink): boolean {
  return /\.(pdf|docx?|xlsx?|odt|ods|png|jpe?g|zip)(\?|$)/i.test(link.url) || /Download\.ashx/i.test(link.url);
}

function LinkChips({ links }: { links: FaqLink[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {links.map((link) => {
        const Icon = isFile(link) ? Paperclip : Link2;
        return (
          <li key={link.url} className="max-w-full">
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-700 hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:text-slate-200 dark:hover:text-brand-300"
            >
              <Icon className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{link.title}</span>
              <span className="shrink-0 text-xs text-slate-400">{hostOf(link.url)}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function ShareButton({ question }: { question: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  return (
    <button
      type="button"
      onClick={async () => {
        const result = await shareQuestion(question);
        if (result !== 'shared') setState(result);
        window.setTimeout(() => setState('idle'), 2000);
      }}
      className="inline-flex items-center gap-1 hover:text-brand-700 dark:hover:text-brand-300"
    >
      {state === 'copied' ? <Check className="size-3.5" aria-hidden /> : <Share2 className="size-3.5" aria-hidden />}
      {state === 'copied' ? '已複製連結' : state === 'failed' ? '無法分享' : '分享'}
    </button>
  );
}

interface FaqCardProps {
  entry: FaqEntry;
  /** Folded cards show only the question until clicked (used for "did you mean"). */
  folded?: boolean;
  /** A small number shown before the question, for citations. */
  label?: string;
}

export function FaqCard({ entry, folded = false, label }: FaqCardProps) {
  const [open, setOpen] = useState(!folded);
  const [full, setFull] = useState(entry.a.length <= FOLD_AFTER_CHARS);
  const bodyId = useId();
  const category = useCategory(entry.cat);
  const searchLink = SEARCH_LINKS[0];

  const question = (
    <span className="flex items-start gap-2 text-left">
      {label ? (
        <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
          {label}
        </span>
      ) : (
        <span aria-hidden className="mt-px shrink-0 font-bold text-brand-600 dark:text-brand-400">
          Q
        </span>
      )}
      <span className="font-semibold leading-snug">{entry.q}</span>
    </span>
  );

  return (
    <article className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      {folded ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen(!open)}
          className="flex w-full items-start justify-between gap-3 rounded-xl px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60"
        >
          {question}
          <ChevronDown className={`mt-0.5 size-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      ) : (
        <h3 className="px-4 pt-3">{question}</h3>
      )}

      <div id={bodyId} hidden={!open} className="px-4 pt-1 pb-3">
        <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
            <CategoryIcon name={category?.icon ?? ''} className="size-3" />
            {category?.name ?? '市政'}
          </span>
          <span>{entry.dept}</span>
        </p>

        {entry.a ? (
          <div className="relative">
            <div className={full ? '' : 'max-h-44 overflow-hidden'}>
              <AnswerText text={entry.a} className="text-[0.95rem] text-slate-700 dark:text-slate-200" />
            </div>
            {!full && (
              <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-white pt-8 dark:from-slate-900">
                <button
                  type="button"
                  onClick={() => setFull(true)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-brand-700 shadow-sm hover:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-brand-300"
                >
                  展開全文
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">這題的答案在附件或連結裡：</p>
        )}

        {entry.links && entry.links.length > 0 && <LinkChips links={entry.links} />}

        <footer className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-2.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {entry.date && <span>{entry.date} 更新</span>}
          {entry.url ? (
            <a href={entry.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-brand-700 dark:hover:text-brand-300">
              <ExternalLink className="size-3.5" aria-hidden />
              原始網頁
            </a>
          ) : (
            searchLink && (
              <a href={searchLink.url(entry.q)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-brand-700 dark:hover:text-brand-300">
                <Search className="size-3.5" aria-hidden />
                到{searchLink.name}找這題
              </a>
            )
          )}
          <ShareButton question={entry.q} />
        </footer>
      </div>
    </article>
  );
}
