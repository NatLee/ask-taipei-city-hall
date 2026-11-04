import { MessageCircleQuestion, Phone, Search } from 'lucide-react';
import { PERSONA } from '../chat/persona.ts';
import { HOTLINE, SEARCH_LINKS } from '../config/links.ts';
import type { FaqEntry } from '../data/types.ts';
import type { SearchResponse } from '../search/service.ts';
import { ANSWER_RULES } from '../search/service.ts';
import { BotText } from './Bubbles.tsx';
import { FaqCard } from './FaqCard.tsx';

export function RelatedQuestions({ entries, onPick }: { entries: FaqEntry[]; onPick: (entry: FaqEntry) => void }) {
  if (entries.length === 0) return null;
  return (
    <section aria-label={PERSONA.relatedTitle}>
      <h3 className="mb-2 text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400">{PERSONA.relatedTitle}</h3>
      <ul className="flex flex-wrap gap-2">
        {entries.map((entry) => (
          <li key={entry.id} className="max-w-full">
            <button
              type="button"
              onClick={() => onPick(entry)}
              className="flex max-w-full items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50/70 px-3 py-1.5 text-left text-sm text-brand-800 hover:border-brand-400 hover:bg-brand-50 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200 dark:hover:border-brand-600"
            >
              <MessageCircleQuestion className="size-3.5 shrink-0" aria-hidden />
              <span className="line-clamp-1">{entry.q}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Where to look when the FAQ has no answer: city search, Google and the 1999 hotline. */
export function ElsewhereLinks({ query }: { query: string }) {
  return (
    <ul className="flex flex-wrap gap-2 text-sm">
      {SEARCH_LINKS.map((link) => (
        <li key={link.name}>
          <a
            href={link.url(query)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:hover:text-brand-300"
          >
            <Search className="size-3.5" aria-hidden />
            在{link.name}搜尋
          </a>
        </li>
      ))}
      <li>
        <a
          href={HOTLINE.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:hover:text-brand-300"
        >
          <Phone className="size-3.5" aria-hidden />
          {HOTLINE.name}（外縣市 {HOTLINE.outOfTown}）
        </a>
      </li>
    </ul>
  );
}

export function FaqReply({
  response,
  related,
  onPick,
}: {
  response: SearchResponse;
  related: FaqEntry[];
  onPick: (entry: FaqEntry) => void;
}) {
  const { verdict, hits, query } = response;

  if (verdict === 'direct' && hits[0]) {
    const others = hits.slice(1, 1 + ANSWER_RULES.suggestions).map((hit) => hit.entry);
    const extra = related.filter((entry) => !others.some((other) => other.id === entry.id));
    return (
      <>
        <BotText>{PERSONA.directTitle}</BotText>
        <FaqCard entry={hits[0].entry} />
        <RelatedQuestions entries={[...others, ...extra].slice(0, ANSWER_RULES.related)} onPick={onPick} />
      </>
    );
  }

  if (verdict === 'suggest') {
    return (
      <>
        <BotText>{PERSONA.suggestTitle}</BotText>
        <div className="space-y-2">
          {hits.slice(0, ANSWER_RULES.suggestions).map((hit) => (
            <FaqCard key={hit.entry.id} entry={hit.entry} folded />
          ))}
        </div>
        <details className="text-sm text-slate-600 dark:text-slate-300">
          <summary className="cursor-pointer select-none hover:text-brand-700 dark:hover:text-brand-300">都不是？到其他地方找找</summary>
          <div className="mt-2">
            <ElsewhereLinks query={query} />
          </div>
        </details>
      </>
    );
  }

  return (
    <>
      <BotText>
        <p>{PERSONA.notFound}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{PERSONA.notFoundTip}</p>
      </BotText>
      <ElsewhereLinks query={query} />
    </>
  );
}

export function EntryReply({ entry, related, onPick }: { entry: FaqEntry; related: FaqEntry[]; onPick: (entry: FaqEntry) => void }) {
  return (
    <>
      <FaqCard entry={entry} />
      <RelatedQuestions entries={related} onPick={onPick} />
    </>
  );
}
