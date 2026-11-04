import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FaqEntry } from '../data/types.ts';
import type { BrowsePage } from '../search/service.ts';
import { readyClient } from '../search/useSearchEngine.ts';
import { CategoryIcon } from './categoryIcons.tsx';
import { useDatasetMeta } from './DatasetContext.ts';
import { Dialog } from './Dialog.tsx';

const PAGE_SIZE = 30;

interface CategoryBrowserProps {
  open: boolean;
  /** Category to show, or null for the list of categories. */
  categoryId: string | null;
  onChoose: (categoryId: string | null) => void;
  onClose: () => void;
  onPick: (entry: FaqEntry) => void;
}

function QuestionList({ categoryId, onPick }: { categoryId: string; onPick: (entry: FaqEntry) => void }) {
  const [unit, setUnit] = useState('');
  const [page, setPage] = useState<BrowsePage | null>(null);
  const [entries, setEntries] = useState<FaqEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    readyClient()
      .then((client) => client.call('browse', categoryId, { unit: unit || undefined, limit: PAGE_SIZE }))
      .then(
        (result) => {
          if (!active) return;
          setPage(result);
          setEntries(result.entries);
        },
        (failure: unknown) => active && setError(failure instanceof Error ? failure.message : String(failure)),
      );
    return () => {
      active = false;
    };
  }, [categoryId, unit]);

  const loadMore = async () => {
    const client = await readyClient();
    const next = await client.call('browse', categoryId, { unit: unit || undefined, offset: entries.length, limit: PAGE_SIZE });
    setEntries((current) => [...current, ...next.entries]);
  };

  if (error) return <p role="alert">{error}</p>;
  if (!page) return <p className="text-sm text-slate-500">載入中…</p>;

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block text-slate-500 dark:text-slate-400">發布單位</span>
        <select
          value={unit}
          onChange={(event) => setUnit(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">全部單位</option>
          {page.units.map((option) => (
            <option key={option.name} value={option.name}>
              {option.name}（{option.count}）
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-slate-500 dark:text-slate-400">共 {page.total.toLocaleString()} 題，最近更新的在前面。</p>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {entries.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => onPick(entry)}
              className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:text-brand-700 dark:hover:text-brand-300"
            >
              <span className="min-w-0">
                <span className="block">{entry.q}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {entry.dept} · {entry.date}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {entries.length < page.total && (
        <button
          type="button"
          onClick={loadMore}
          className="w-full rounded-lg border border-slate-200 py-2 text-sm hover:border-brand-400 dark:border-slate-700"
        >
          再載入 {Math.min(PAGE_SIZE, page.total - entries.length)} 題
        </button>
      )}
    </div>
  );
}

export function CategoryBrowser({ open, categoryId, onChoose, onClose, onPick }: CategoryBrowserProps) {
  const meta = useDatasetMeta();
  const category = meta?.categories.find((candidate) => candidate.id === categoryId);
  const title = category ? (
    <span className="flex items-center gap-2">
      <button type="button" onClick={() => onChoose(null)} aria-label="回到主題列表" className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
        <ArrowLeft className="size-4" aria-hidden />
      </button>
      {category.name}
    </span>
  ) : (
    '依主題瀏覽'
  );

  return (
    <Dialog open={open} onClose={onClose} title={title} wide>
      {!meta ? (
        <p className="text-sm text-slate-500">市政 FAQ 還在載入…</p>
      ) : category ? (
        <QuestionList key={category.id} categoryId={category.id} onPick={onPick} />
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {meta.categories.map((option) => {
            return (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => onChoose(option.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left hover:border-brand-400 dark:border-slate-700"
                >
                  <CategoryIcon name={option.icon} className="size-5 text-brand-600 dark:text-brand-400" />
                  <span className="flex-1">{option.name}</span>
                  <span className="text-xs text-slate-500">{option.count.toLocaleString()} 題</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
