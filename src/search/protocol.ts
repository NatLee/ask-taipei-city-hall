import type { FaqEntry } from '../data/types.ts';
import type { BrowsePage, DatasetMeta, SearchResponse } from './service.ts';

/** What the search worker can do. The page calls these through `SearchClient`. */
export interface SearchApi {
  /** Download the dataset and build the index. */
  load(url: string): DatasetMeta;
  search(query: string, limit?: number): SearchResponse;
  related(id: string, limit?: number): FaqEntry[];
  browse(category: string, options?: { unit?: string; offset?: number; limit?: number }): BrowsePage;
  get(id: string): FaqEntry | undefined;
}

export type Method = keyof SearchApi;

export interface RequestMessage {
  id: number;
  method: Method;
  args: unknown[];
}

export type ResponseMessage = { id: number; ok: true; result: unknown } | { id: number; ok: false; error: string };
