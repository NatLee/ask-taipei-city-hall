/**
 * Where a visitor's Claude API key lives.
 *
 * By default only in this tab's memory: closing or reloading the page forgets
 * it. If the visitor ticks "remember on this device", it is also written to
 * localStorage, where it stays until they press "forget key" (or clear site
 * data). The key is never sent anywhere except the Anthropic API.
 */

export const STORAGE_KEY = 'ask-taipei-city-hall:anthropic-api-key';

/** Anthropic API keys look like `sk-ant-…`. Used for a gentle warning only, never to block. */
export function looksLikeApiKey(value: string): boolean {
  return /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(value.trim());
}

export interface KeyStore {
  get(): string | null;
  /** Whether the current key is also saved on this device. */
  remembered(): boolean;
  set(key: string, remember: boolean): void;
  /** Drop the key from memory and from this device. */
  forget(): void;
}

/** Storage can be missing or throw (private windows, blocked site data). */
function safely<T>(action: () => T, fallback: T): T {
  try {
    return action();
  } catch {
    return fallback;
  }
}

export function createKeyStore(storage: Storage | null): KeyStore {
  let key: string | null = storage ? safely(() => storage.getItem(STORAGE_KEY), null) : null;
  let remembered = key !== null;

  return {
    get: () => key,
    remembered: () => remembered,
    set(next, remember) {
      key = next.trim() || null;
      remembered = false;
      if (!storage) return;
      if (remember && key) remembered = safely(() => (storage.setItem(STORAGE_KEY, key as string), true), false);
      else safely(() => storage.removeItem(STORAGE_KEY), undefined);
    },
    forget() {
      key = null;
      remembered = false;
      if (storage) safely(() => storage.removeItem(STORAGE_KEY), undefined);
    },
  };
}

/** The browser's localStorage, or null where the browser refuses access. */
export function browserStorage(): Storage | null {
  return safely(() => (typeof window === 'undefined' ? null : window.localStorage), null);
}
