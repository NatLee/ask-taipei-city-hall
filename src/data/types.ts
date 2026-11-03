/**
 * Shape of `public/data/faq.json`, written by `scripts/data/build.ts` at build
 * time and read by the search worker in the browser. Keys on entries are short
 * because the file holds about 8,000 of them.
 */

export interface FaqLink {
  title: string;
  url: string;
}

export interface FaqEntry {
  /** DataSN from the open data, unique across all sources. */
  id: string;
  /** The question as published. */
  q: string;
  /** Plain-text answer; paragraphs are separated by `\n`. May be empty when the answer is only an attachment. */
  a: string;
  /** Publishing unit (發布單位), e.g. 臺北市政府社會局社會救助科. */
  dept: string;
  /** Category id from `data/categories.json`. */
  cat: string;
  /** Last update, YYYY-MM-DD. */
  date: string;
  /** The FAQ's own page on a Taipei City Government site, when a source provides it. */
  url?: string;
  /** Related links, attachments and images. */
  links?: FaqLink[];
}

export interface SourceInfo {
  id: string;
  name: string;
  provider: string;
  datasetUrl: string;
  license: FaqLink;
  /** When the data was downloaded (ISO 8601). */
  fetchedAt: string;
  /** Records read from this source before merging. */
  records: number;
  /** True when the source could not be reached and a cached copy was used. */
  stale?: boolean;
}

export interface Category {
  id: string;
  name: string;
  /** Icon name understood by the UI (see `src/ui/categoryIcons.ts`). */
  icon: string;
  count: number;
}

export interface FaqDataset {
  version: 1;
  generatedAt: string;
  sources: SourceInfo[];
  categories: Category[];
  entries: FaqEntry[];
}
