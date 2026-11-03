/// <reference lib="webworker" />
/**
 * Runs the FAQ search off the main thread: downloading ~7 MB of JSON and
 * indexing 8,000+ questions takes a moment, and the page should stay
 * responsive meanwhile.
 */
import type { FaqDataset } from '../data/types.ts';
import type { RequestMessage, ResponseMessage, SearchApi } from './protocol.ts';
import { SearchService } from './service.ts';
import { createWordSegmenter } from './tokenize.ts';

let service: SearchService | null = null;

function ready(): SearchService {
  if (!service) throw new Error('The FAQ data is not loaded yet.');
  return service;
}

const api: { [M in keyof SearchApi]: (...args: Parameters<SearchApi[M]>) => ReturnType<SearchApi[M]> | Promise<ReturnType<SearchApi[M]>> } = {
  async load(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not download the FAQ data (HTTP ${response.status}).`);
    const dataset = (await response.json()) as FaqDataset;
    service = new SearchService(dataset, createWordSegmenter());
    return service.meta();
  },
  search: (query, limit) => ready().search(query, limit),
  related: (id, limit) => ready().related(id, limit),
  browse: (category, options) => ready().browse(category, options),
  get: (id) => ready().get(id),
};

self.onmessage = async (event: MessageEvent<RequestMessage>) => {
  const { id, method, args } = event.data;
  let reply: ResponseMessage;
  try {
    const handler = api[method] as (...a: unknown[]) => unknown;
    reply = { id, ok: true, result: await handler(...args) };
  } catch (error) {
    reply = { id, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  self.postMessage(reply);
};
