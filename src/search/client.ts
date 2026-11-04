import type { Method, RequestMessage, ResponseMessage, SearchApi } from './protocol.ts';

/** Anything that can carry messages to the search worker (a Worker, or a fake in tests). */
export interface MessageTarget {
  postMessage(message: RequestMessage): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<ResponseMessage>) => void): void;
}

/** Promise-based calls into the search worker. */
export class SearchClient {
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private readonly target: MessageTarget;

  constructor(target: MessageTarget) {
    this.target = target;
    target.addEventListener('message', (event) => {
      const reply = event.data;
      const waiter = this.pending.get(reply.id);
      if (!waiter) return;
      this.pending.delete(reply.id);
      if (reply.ok) waiter.resolve(reply.result);
      else waiter.reject(new Error(reply.error));
    });
  }

  call<M extends Method>(method: M, ...args: Parameters<SearchApi[M]>): Promise<ReturnType<SearchApi[M]>> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      this.target.postMessage({ id, method, args });
    });
  }
}

export function createSearchClient(): SearchClient {
  return new SearchClient(new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }));
}

/** Where the build puts the dataset, relative to the page (works under a GitHub Pages sub-path). */
export function datasetUrl(): string {
  return new URL(`${import.meta.env.BASE_URL}data/faq.json`, window.location.href).href;
}
