import { useCallback, useState } from 'react';
import { DEFAULT_MODEL_ID, findModel } from './config.ts';
import { browserStorage, createKeyStore } from './keyStore.ts';

/** One store per page, so every component sees the same key. */
const keyStore = createKeyStore(browserStorage());
/** The chosen model is not secret; it is remembered for convenience. */
const MODEL_PREF_KEY = 'ask-taipei-city-hall:model';

function readModelPreference(): string {
  try {
    return findModel(window.localStorage.getItem(MODEL_PREF_KEY) ?? DEFAULT_MODEL_ID).id;
  } catch {
    return DEFAULT_MODEL_ID;
  }
}

export interface AiSettings {
  apiKey: string | null;
  remembered: boolean;
  modelId: string;
  /** AI mode is on: the visitor switched it on and a key is present. */
  active: boolean;
  setActive(on: boolean): void;
  saveKey(key: string, remember: boolean): void;
  forgetKey(): void;
  setModel(id: string): void;
}

export function useAiSettings(): AiSettings {
  const [apiKey, setApiKey] = useState(keyStore.get());
  const [remembered, setRemembered] = useState(keyStore.remembered());
  const [modelId, setModelId] = useState(readModelPreference);
  // A remembered key means the visitor used AI mode before, so start in it.
  const [wantsAi, setWantsAi] = useState(keyStore.get() !== null);

  const saveKey = useCallback((key: string, remember: boolean) => {
    keyStore.set(key, remember);
    setApiKey(keyStore.get());
    setRemembered(keyStore.remembered());
    setWantsAi(keyStore.get() !== null);
  }, []);

  const forgetKey = useCallback(() => {
    keyStore.forget();
    setApiKey(null);
    setRemembered(false);
    setWantsAi(false);
  }, []);

  const setModel = useCallback((id: string) => {
    const model = findModel(id).id;
    setModelId(model);
    try {
      window.localStorage.setItem(MODEL_PREF_KEY, model);
    } catch {
      // Not remembered; the choice still applies to this visit.
    }
  }, []);

  return {
    apiKey,
    remembered,
    modelId,
    active: wantsAi && apiKey !== null,
    setActive: setWantsAi,
    saveKey,
    forgetKey,
    setModel,
  };
}
