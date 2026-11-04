import type { FaqEntry } from '../data/types.ts';
import {
  CHAR_PREFIX,
  normalizeText,
  type PreparedQuery,
  prepareQuery,
  tokenize,
  WORD_PREFIX,
  type WordSegmenter,
} from './tokenize.ts';
import { FINAL_PARTICLES, QUESTION_WORDS, SYNONYM_GROUPS, SYNONYM_WEIGHT } from './vocabulary.ts';

/**
 * BM25F ranking over three fields of each FAQ entry. The question counts
 * most; the answer and the publishing unit add evidence. See
 * https://en.wikipedia.org/wiki/Okapi_BM25 for the formula.
 */
export const RANKING = {
  k1: 1.2,
  fields: [
    { name: 'question', weight: 3, b: 0.6 },
    { name: 'answer', weight: 1, b: 0.75 },
    { name: 'unit', weight: 0.5, b: 0.3 },
  ],
  /** Single characters are weak evidence compared with bigrams and words. */
  charTermWeight: 0.3,
  /**
   * The best candidates by BM25 are re-ranked by how much of the query they
   * cover (like Lucene's classic "coord" factor): score × (floor + (1 − floor) × coverage).
   * Otherwise an answer that repeats one query word many times can beat one
   * that mentions every word.
   */
  coordFloor: 0.5,
  rerankDepth: 50,
} as const;

const QUESTION = 0;
const ANSWER = 1;
const UNIT = 2;
const FIELD_COUNT = RANKING.fields.length;
const HAN = /\p{Script=Han}/u;

export interface ScoredHit {
  /** Position in the entries array. */
  doc: number;
  score: number;
  /**
   * Share of the query (weighted by how rare each term is) that also appears
   * in the hit's question, 0–1. Used to decide whether to answer directly.
   */
  questionCoverage: number;
  /** Same, for the question and answer together. */
  coverage: number;
}

export interface SearchOptions {
  limit?: number;
  /** Only consider entries for which this returns true. */
  accept?: (doc: number) => boolean;
}

interface QueryTerm {
  term: string;
  /** 1 for what the visitor typed; lower for single characters and synonyms. */
  weight: number;
}

/** A piece of the query that a document either covers or not. */
interface CoverageUnit {
  idf: number;
  /** The document covers the unit if it contains any of these terms. */
  terms: string[];
}

export class FaqIndex {
  readonly size: number;
  private readonly entries: readonly FaqEntry[];
  private readonly segmenter: WordSegmenter | null;
  private readonly termIds = new Map<string, number>();
  /** postings[field][termId] = [doc, count, doc, count, …], docs ascending. */
  private readonly postings: number[][][] = RANKING.fields.map(() => []);
  /** Number of entries containing each term in any field. */
  private readonly docFrequency: Int32Array;
  private readonly lengths: Float64Array[];
  private readonly averages: number[];

  constructor(entries: readonly FaqEntry[], segmenter: WordSegmenter | null) {
    this.entries = entries;
    this.segmenter = segmenter;
    this.size = entries.length;
    this.lengths = RANKING.fields.map(() => new Float64Array(entries.length));

    // Units repeat a lot (about 230 distinct names), so tokenise each once.
    const unitTerms = new Map<string, string[]>();
    entries.forEach((entry, doc) => {
      this.addField(QUESTION, doc, this.fieldTerms(entry.q, QUESTION));
      this.addField(ANSWER, doc, this.fieldTerms(entry.a, ANSWER));
      let unit = unitTerms.get(entry.dept);
      if (!unit) unitTerms.set(entry.dept, (unit = this.fieldTerms(entry.dept, UNIT)));
      this.addField(UNIT, doc, unit);
    });

    this.averages = this.lengths.map((lengths) => {
      let sum = 0;
      for (const length of lengths) sum += length;
      return entries.length > 0 && sum > 0 ? sum / entries.length : 1;
    });
    this.docFrequency = this.countDocFrequency();
  }

  /** Questions and units are short, so they also get words; questions also get single characters. */
  private fieldTerms(text: string, field: number): string[] {
    if (field === ANSWER) return tokenize(text);
    return tokenize(text, { segmenter: this.segmenter, chars: field === QUESTION });
  }

  private addField(field: number, doc: number, terms: string[]): void {
    (this.lengths[field] as Float64Array)[doc] = terms.length;
    const lists = this.postings[field] as number[][];
    for (const term of terms) {
      let id = this.termIds.get(term);
      if (id === undefined) {
        id = this.termIds.size;
        this.termIds.set(term, id);
      }
      let list = lists[id];
      if (!list) lists[id] = list = [];
      // Docs arrive in order, so a repeated term in this doc is the last pair.
      if (list.length > 0 && list[list.length - 2] === doc) list[list.length - 1] = (list[list.length - 1] as number) + 1;
      else list.push(doc, 1);
    }
  }

  private countDocFrequency(): Int32Array {
    const df = new Int32Array(this.termIds.size);
    for (let id = 0; id < df.length; id += 1) {
      const lists = this.postings.map((field) => field[id]).filter((list): list is number[] => list !== undefined);
      if (lists.length === 1) {
        df[id] = (lists[0] as number[]).length / 2;
        continue;
      }
      const docs = new Set<number>();
      for (const list of lists) for (let i = 0; i < list.length; i += 2) docs.add(list[i] as number);
      df[id] = docs.size;
    }
    return df;
  }

  /** Inverse document frequency; terms the index has never seen get the maximum. */
  private idf(term: string): number {
    const id = this.termIds.get(term);
    const df = id === undefined ? 0 : (this.docFrequency[id] as number);
    return Math.log(1 + (this.size - df + 0.5) / (df + 0.5));
  }

  private queryTerms(prepared: PreparedQuery): QueryTerm[] {
    const weights = new Map<string, number>();
    const add = (term: string, weight: number) => weights.set(term, (weights.get(term) ?? 0) + weight);
    for (const term of tokenize(prepared.text, { segmenter: this.segmenter, chars: true })) {
      add(term, term.startsWith(CHAR_PREFIX) ? RANKING.charTermWeight : 1);
    }
    // A synonym group is one idea: every member counts the same, whichever one the
    // visitor typed. Otherwise a rare colloquial word (「不見」) outweighs the
    // word the FAQ actually uses (「遺失」).
    for (const { typed, others } of prepared.synonyms) {
      for (const member of typed) for (const term of this.memberTerms(member)) if (weights.has(term)) weights.set(term, SYNONYM_WEIGHT);
      for (const member of others) for (const term of this.memberTerms(member)) add(term, SYNONYM_WEIGHT);
    }
    return [...weights].map(([term, weight]) => ({ term, weight }));
  }

  /** Terms for one synonym; a one-character synonym (犬) only exists in the index as a character term. */
  private memberTerms(member: string): string[] {
    return [...member].length === 1 ? [CHAR_PREFIX + member] : tokenize(member, { segmenter: this.segmenter });
  }

  search(query: string, options: SearchOptions = {}): ScoredHit[] {
    const { limit = 10, accept } = options;
    const prepared = prepareQuery(query, {
      questionWords: QUESTION_WORDS,
      finalParticles: FINAL_PARTICLES,
      synonymGroups: SYNONYM_GROUPS,
    });
    const scores = new Map<number, number>();

    for (const { term, weight } of this.queryTerms(prepared)) {
      const id = this.termIds.get(term);
      if (id === undefined) continue;
      const termTf = new Map<number, number>();
      for (let field = 0; field < FIELD_COUNT; field += 1) {
        const list = this.postings[field]?.[id];
        if (!list) continue;
        const { weight: fieldWeight, b } = RANKING.fields[field] as (typeof RANKING.fields)[number];
        const lengths = this.lengths[field] as Float64Array;
        const average = this.averages[field] as number;
        for (let i = 0; i < list.length; i += 2) {
          const doc = list[i] as number;
          const norm = 1 - b + (b * (lengths[doc] as number)) / average;
          termTf.set(doc, (termTf.get(doc) ?? 0) + (fieldWeight * (list[i + 1] as number)) / norm);
        }
      }
      const termWeight = this.idf(term) * weight;
      for (const [doc, tf] of termTf) {
        scores.set(doc, (scores.get(doc) ?? 0) + (termWeight * tf * (RANKING.k1 + 1)) / (RANKING.k1 + tf));
      }
    }

    const units = this.coverageUnits(prepared);
    const byScore = (x: ScoredHit, y: ScoredHit) => y.score - x.score || x.doc - y.doc;
    return [...scores.entries()]
      .filter(([doc]) => !accept || accept(doc))
      .map(([doc, score]) => ({ doc, score, questionCoverage: 0, coverage: 0 }))
      .sort(byScore)
      .slice(0, Math.max(limit, RANKING.rerankDepth))
      .map((hit) => {
        const coverage = this.coverage(units, hit.doc);
        const coord = RANKING.coordFloor + (1 - RANKING.coordFloor) * coverage.coverage;
        return { ...hit, ...coverage, score: hit.score * coord };
      })
      .sort(byScore)
      .slice(0, limit);
  }

  /**
   * Split what the visitor typed into units for measuring coverage. A unit is
   * a whole word (from the segmenter) or a Latin token; a document covers it
   * when its text contains the word or one of the word's synonyms. Single
   * characters are used only when the query has no words at all (「狗」).
   * Without a segmenter, the known bigrams stand in for words.
   */
  private coverageUnits(prepared: PreparedQuery): CoverageUnit[] {
    let words: string[];
    if (this.segmenter) {
      words = [...this.segmenter.segment(prepared.text)]
        .filter(({ segment, isWordLike }) => isWordLike && ([...segment].length >= 2 || !HAN.test(segment)))
        .map(({ segment }) => segment);
    } else {
      words = tokenize(prepared.text).filter((term) => !HAN.test(term) || this.termIds.has(term));
    }
    if (words.length === 0) words = [...prepared.text].filter((char) => HAN.test(char));

    const units = new Map<string, CoverageUnit>();
    for (const word of words) {
      if (units.has(word)) continue;
      const alternatives = new Set([word]);
      for (const { typed, others } of prepared.synonyms) {
        if (typed.some((member) => word.includes(member) || member.includes(word))) {
          for (const other of others) alternatives.add(other);
        }
      }
      units.set(word, { idf: this.wordIdf(word), terms: [...alternatives] });
    }
    return [...units.values()];
  }

  /** Rarity of a word: its own word term if indexed, else its rarest known bigram, else the maximum. */
  private wordIdf(word: string): number {
    if (this.termIds.has(WORD_PREFIX + word)) return this.idf(WORD_PREFIX + word);
    const known = tokenize(word).filter((term) => this.termIds.has(term));
    return known.length > 0 ? Math.max(...known.map((term) => this.idf(term))) : this.idf(word);
  }

  private coverage(units: CoverageUnit[], doc: number): { questionCoverage: number; coverage: number } {
    const entry = this.entries[doc] as FaqEntry;
    const question = normalizeText(entry.q);
    const answer = normalizeText(entry.a);
    let total = 0;
    let inQuestion = 0;
    let anywhere = 0;
    for (const { idf, terms } of units) {
      total += idf;
      const q = terms.some((term) => question.includes(term));
      if (q) inQuestion += idf;
      if (q || terms.some((term) => answer.includes(term))) anywhere += idf;
    }
    return total > 0
      ? { questionCoverage: inQuestion / total, coverage: anywhere / total }
      : { questionCoverage: 0, coverage: 0 };
  }
}
