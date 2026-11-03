import { describe, expect, it } from 'vitest';
import { type MessageTarget, SearchClient } from './client.ts';
import type { RequestMessage, ResponseMessage } from './protocol.ts';

/** Answers like the worker would, but in-process. */
function fakeWorker(handle: (request: RequestMessage) => ResponseMessage): MessageTarget {
  let listener: ((event: MessageEvent<ResponseMessage>) => void) | null = null;
  return {
    addEventListener: (_type, fn) => {
      listener = fn;
    },
    postMessage: (request) => {
      queueMicrotask(() => listener?.({ data: handle(request) } as MessageEvent<ResponseMessage>));
    },
  };
}

describe('SearchClient', () => {
  it('matches replies to calls and passes results through', async () => {
    const client = new SearchClient(
      fakeWorker(({ id, method, args }) => ({ id, ok: true, result: `${method}:${String(args[0])}` })),
    );
    await expect(Promise.all([client.call('get', 'a'), client.call('related', 'b')])).resolves.toEqual([
      'get:a',
      'related:b',
    ]);
  });

  it('turns worker errors into rejected promises', async () => {
    const client = new SearchClient(fakeWorker(({ id }) => ({ id, ok: false, error: 'not loaded' })));
    await expect(client.call('get', 'x')).rejects.toThrow('not loaded');
  });
});
