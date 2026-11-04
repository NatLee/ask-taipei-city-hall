import type { Category, FaqDataset, FaqEntry, SourceInfo } from '../data/types.ts';
import { FaqIndex, type ScoredHit } from './index.ts';
import type { WordSegmenter } from './tokenize.ts';

/**
 * When to answer directly, when to ask "did you mean…?", and when to admit
 * there is no match. The 2017 bot answered directly above a similarity of
 * 0.65 and offered up to three suggestions; these numbers play the same role
 * for BM25 and were tuned on real questions (see README, 檢索怎麼運作).
 */
export const ANSWER_RULES = {
  /** The best hit's question must cover this much of the query… */
  directCoverage: 0.8,
  /** …and score clearly above the runner-up, or several answers are equally likely. */
  directMargin: 1.15,
  /** Below this coverage (question and answer) nothing is close enough to suggest. */
  suggestCoverage: 0.35,
  suggestions: 3,
  related: 4,
} as const;

export type Verdict = 'direct' | 'suggest' | 'none';

export interface FaqHit {
  entry: FaqEntry;
  score: number;
  questionCoverage: number;
  coverage: number;
}

export interface SearchResponse {
  query: string;
  verdict: Verdict;
  /** Best first. For `direct`, the first hit is the answer and the rest are alternatives. */
  hits: FaqHit[];
}

export interface DatasetMeta {
  generatedAt: string;
  total: number;
  sources: SourceInfo[];
  categories: Category[];
}

export interface BrowsePage {
  total: number;
  entries: FaqEntry[];
  /** Publishing units in this category, most questions first. */
  units: { name: string; count: number }[];
}

export function judge(hits: readonly Pick<ScoredHit, 'score' | 'questionCoverage' | 'coverage'>[]): Verdict {
  const [best, second] = hits;
  if (!best || best.coverage < ANSWER_RULES.suggestCoverage) return 'none';
  const clearWinner = !second || best.score >= second.score * ANSWER_RULES.directMargin;
  return best.questionCoverage >= ANSWER_RULES.directCoverage && clearWinner ? 'direct' : 'suggest';
}

export class SearchService {
  private readonly dataset: FaqDataset;
  private readonly index: FaqIndex;
  private readonly byId: Map<string, number>;

  constructor(dataset: FaqDataset, segmenter: WordSegmenter | null) {
    this.dataset = dataset;
    this.index = new FaqIndex(dataset.entries, segmenter);
    this.byId = new Map(dataset.entries.map((entry, doc) => [entry.id, doc]));
  }

  meta(): DatasetMeta {
    const { generatedAt, sources, categories, entries } = this.dataset;
    return { generatedAt, sources, categories, total: entries.length };
  }

  get(id: string): FaqEntry | undefined {
    const doc = this.byId.get(id);
    return doc === undefined ? undefined : this.dataset.entries[doc];
  }

  private toHit(hit: ScoredHit): FaqHit {
    return {
      entry: this.dataset.entries[hit.doc] as FaqEntry,
      score: hit.score,
      questionCoverage: hit.questionCoverage,
      coverage: hit.coverage,
    };
  }

  /** Answer a visitor's question. `limit` is how many hits to return (at least enough to judge). */
  search(query: string, limit: number = ANSWER_RULES.suggestions + ANSWER_RULES.related): SearchResponse {
    const scored = this.index.search(query, { limit: Math.max(limit, 2) });
    const verdict = judge(scored);
    return { query, verdict, hits: scored.slice(0, limit).map((hit) => this.toHit(hit)) };
  }

  /** Other questions close to this one, for "you may also want to ask". */
  related(id: string, limit: number = ANSWER_RULES.related): FaqEntry[] {
    const self = this.byId.get(id);
    const entry = this.get(id);
    if (self === undefined || !entry) return [];
    return this.index
      .search(entry.q, { limit, accept: (doc) => doc !== self && this.dataset.entries[doc]?.q !== entry.q })
      .map((hit) => this.dataset.entries[hit.doc] as FaqEntry);
  }

  /** Newest questions in a category, optionally from one publishing unit. */
  browse(category: string, options: { unit?: string; offset?: number; limit?: number } = {}): BrowsePage {
    const { unit, offset = 0, limit = 20 } = options;
    const inCategory = this.dataset.entries.filter((entry) => entry.cat === category);
    const counts = new Map<string, number>();
    for (const entry of inCategory) counts.set(entry.dept, (counts.get(entry.dept) ?? 0) + 1);
    const matching = unit ? inCategory.filter((entry) => entry.dept === unit) : inCategory;
    return {
      total: matching.length,
      entries: matching.slice(offset, offset + limit),
      units: [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    };
  }
}
