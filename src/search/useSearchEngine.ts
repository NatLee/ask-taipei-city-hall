import { useEffect, useState } from 'react';
import { createSearchClient, datasetUrl, type SearchClient } from './client.ts';
import type { DatasetMeta } from './service.ts';

export type EngineState =
  | { status: 'loading' }
  | { status: 'ready'; meta: DatasetMeta }
  | { status: 'error'; message: string };

interface Engine {
  client: SearchClient;
  /** Resolves once the dataset is downloaded and indexed. */
  ready: Promise<DatasetMeta>;
}

let engine: Engine | null = null;

/** One worker per page, started on first use. */
export function getEngine(): Engine {
  if (!engine) {
    const client = createSearchClient();
    engine = { client, ready: client.call('load', datasetUrl()) };
  }
  return engine;
}

/** Wait for the index, then hand back the client. */
export async function readyClient(): Promise<SearchClient> {
  const { client, ready } = getEngine();
  await ready;
  return client;
}

export function useSearchEngine(): EngineState {
  const [state, setState] = useState<EngineState>({ status: 'loading' });
  useEffect(() => {
    let active = true;
    getEngine().ready.then(
      (meta) => active && setState({ status: 'ready', meta }),
      (error: unknown) => active && setState({ status: 'error', message: error instanceof Error ? error.message : String(error) }),
    );
    return () => {
      active = false;
    };
  }, []);
  return state;
}
