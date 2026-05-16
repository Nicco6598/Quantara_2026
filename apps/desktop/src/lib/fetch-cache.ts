import { DATA_CHANGED_EVENT } from "./sync-events";

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
  key: string;
};

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 5000;
const MAX_CACHE_ENTRIES = 50;

export function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  const existing = cache.get(key);
  if (existing && Date.now() < existing.expiresAt) {
    return Promise.resolve(existing.data as T);
  }

  const promise = fetchFn()
    .then((data) => {
      cache.set(key, { data, expiresAt: Date.now() + ttlMs, key });
      return data;
    })
    .catch((error) => {
      cache.delete(key);
      throw error;
    });

  if (cache.size >= MAX_CACHE_ENTRIES) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }

  cache.set(key, { data: promise, expiresAt: Date.now() + ttlMs, key } as never);
  return promise;
}

function invalidateCache(pattern?: string) {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (!pattern || key.includes(pattern)) {
      cache.delete(key);
    } else if (now >= entry.expiresAt) {
      cache.delete(key);
    }
  }
}

const cacheListenerFlag = "__quantaraFetchCacheListenerInstalled";

if (
  typeof window !== "undefined" &&
  !(window as unknown as Record<string, boolean>)[cacheListenerFlag]
) {
  (window as unknown as Record<string, boolean>)[cacheListenerFlag] = true;
  window.addEventListener(DATA_CHANGED_EVENT, () => invalidateCache());
}
