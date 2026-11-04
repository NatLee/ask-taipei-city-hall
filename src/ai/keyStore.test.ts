import { describe, expect, it } from 'vitest';
import { createKeyStore, looksLikeApiKey, STORAGE_KEY } from './keyStore.ts';

/** In-memory Storage; `broken` makes every call throw like a blocked localStorage. */
function memoryStorage(broken = false): Storage {
  const data = new Map<string, string>();
  const guard = () => {
    if (broken) throw new DOMException('denied', 'SecurityError');
  };
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => (guard(), data.get(key) ?? null),
    setItem: (key, value) => (guard(), void data.set(key, value)),
    removeItem: (key) => (guard(), void data.delete(key)),
  };
}

const KEY = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz';

describe('createKeyStore', () => {
  it('keeps the key in memory only, unless asked to remember it', () => {
    const storage = memoryStorage();
    const store = createKeyStore(storage);
    store.set(KEY, false);
    expect(store.get()).toBe(KEY);
    expect(store.remembered()).toBe(false);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    // A new page load starts empty.
    expect(createKeyStore(storage).get()).toBeNull();
  });

  it('remembers the key on this device when asked, and loads it next time', () => {
    const storage = memoryStorage();
    createKeyStore(storage).set(KEY, true);
    const next = createKeyStore(storage);
    expect(next.get()).toBe(KEY);
    expect(next.remembered()).toBe(true);
  });

  it('removes a remembered key when the visitor stops remembering it', () => {
    const storage = memoryStorage();
    const store = createKeyStore(storage);
    store.set(KEY, true);
    store.set(KEY, false);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(store.get()).toBe(KEY);
  });

  it('forgets the key everywhere', () => {
    const storage = memoryStorage();
    const store = createKeyStore(storage);
    store.set(KEY, true);
    store.forget();
    expect(store.get()).toBeNull();
    expect(store.remembered()).toBe(false);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('still works in memory when storage is blocked', () => {
    const store = createKeyStore(memoryStorage(true));
    store.set(KEY, true);
    expect(store.get()).toBe(KEY);
    expect(store.remembered()).toBe(false);
    expect(() => store.forget()).not.toThrow();
  });

  it('trims whitespace and treats an empty key as no key', () => {
    const store = createKeyStore(null);
    store.set(`  ${KEY}\n`, false);
    expect(store.get()).toBe(KEY);
    store.set('   ', false);
    expect(store.get()).toBeNull();
  });
});

describe('looksLikeApiKey', () => {
  it('recognises the sk-ant- prefix', () => {
    expect(looksLikeApiKey(KEY)).toBe(true);
    expect(looksLikeApiKey('sk-proj-123')).toBe(false);
    expect(looksLikeApiKey('')).toBe(false);
  });
});
