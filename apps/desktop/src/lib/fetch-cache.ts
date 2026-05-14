import { DATA_CHANGED_EVENT } from "./sync-events";

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
  key: string;
};

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 5000;

export function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  const existing = cache.get(key);
  if (existing && Date.now() < existing.expiresAt) {
    return Promise.resolve(existing.data as T);
  }

  const promise = fetchFn().then((data) => {
    cache.set(key, { data, expiresAt: Date.now() + ttlMs, key });
    return data;
  });

  cache.set(key, { data: promise, expiresAt: Date.now() + ttlMs, key } as never);
  return promise;
}

function invalidateCache(pattern?: string) {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

// Auto-invalidate cache when data changes
if (typeof window !== "undefined") {
  window.addEventListener(DATA_CHANGED_EVENT, () => invalidateCache());
}
