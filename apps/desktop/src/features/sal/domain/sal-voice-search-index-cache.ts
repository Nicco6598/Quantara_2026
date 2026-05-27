import {
  buildIndexedVoiceOptions,
  buildTariffSearchTokens,
  type IndexedVoiceOption,
} from "../components/SalSearchBar";
import type { SalVoiceDraft } from "../types";

export type SalVoiceSearchIndex = {
  index: IndexedVoiceOption[];
  tariffTokensByBookId: Map<string, Set<string>>;
  voiceById: Map<string, SalVoiceDraft>;
};

export const EMPTY_SAL_VOICE_SEARCH_INDEX: SalVoiceSearchIndex = {
  index: [],
  tariffTokensByBookId: new Map(),
  voiceById: new Map(),
};

const indexCache = new Map<string, SalVoiceSearchIndex>();
let warmupTask: { key: string; cancel: () => void } | null = null;

export function getSalVoiceSearchIndexCacheKey(
  voices: readonly SalVoiceDraft[],
  tariffBookIds: readonly string[],
): string {
  if (voices.length === 0) return "empty";
  const first = voices[0];
  const last = voices[voices.length - 1];
  return `${voices.length}:${tariffBookIds.join(",")}:${first?.id ?? ""}:${last?.id ?? ""}`;
}

export function buildSalVoiceSearchIndex(
  voices: readonly SalVoiceDraft[],
  tariffBookIds: readonly string[],
): SalVoiceSearchIndex {
  const index = buildIndexedVoiceOptions(voices);
  const voiceById = new Map(voices.map((voice) => [voice.id, voice]));
  const tariffTokensByBookId = new Map<string, Set<string>>();
  for (const voice of voices) {
    if (tariffBookIds.length > 0 && tariffTokensByBookId.size >= tariffBookIds.length) break;
    if (!tariffTokensByBookId.has(voice.tariffBookId)) {
      tariffTokensByBookId.set(voice.tariffBookId, buildTariffSearchTokens(voice));
    }
  }
  return { index, tariffTokensByBookId, voiceById };
}

export function getCachedSalVoiceSearchIndex(cacheKey: string): SalVoiceSearchIndex | undefined {
  return indexCache.get(cacheKey);
}

export function cacheSalVoiceSearchIndex(
  cacheKey: string,
  index: SalVoiceSearchIndex,
): SalVoiceSearchIndex {
  indexCache.set(cacheKey, index);
  return index;
}

function buildAndCache(
  voices: readonly SalVoiceDraft[],
  tariffBookIds: readonly string[],
  cacheKey: string,
): SalVoiceSearchIndex {
  const cached = indexCache.get(cacheKey);
  if (cached) return cached;
  return cacheSalVoiceSearchIndex(cacheKey, buildSalVoiceSearchIndex(voices, tariffBookIds));
}

/** Pre-build search index while the user is still on step 1 (project). */
export function scheduleSalVoiceSearchIndexWarmup(
  voices: readonly SalVoiceDraft[],
  tariffBookIds: readonly string[],
): void {
  if (voices.length === 0) return;
  const cacheKey = getSalVoiceSearchIndexCacheKey(voices, tariffBookIds);
  if (indexCache.has(cacheKey)) return;

  warmupTask?.cancel();
  const run = () => {
    warmupTask = null;
    buildAndCache(voices, tariffBookIds, cacheKey);
  };

  if (voices.length <= 2500) {
    const id = queueMicrotask(run);
    warmupTask = {
      key: cacheKey,
      cancel: () => {
        void id;
      },
    };
    return;
  }

  if (typeof requestIdleCallback === "function") {
    const idleId = requestIdleCallback(run, { timeout: 4000 });
    warmupTask = {
      key: cacheKey,
      cancel: () => cancelIdleCallback(idleId),
    };
    return;
  }

  const timeoutId = setTimeout(run, 0);
  warmupTask = {
    key: cacheKey,
    cancel: () => clearTimeout(timeoutId),
  };
}

export function resolveSalVoiceSearchIndex(
  voices: readonly SalVoiceDraft[],
  tariffBookIds: readonly string[],
): SalVoiceSearchIndex {
  if (voices.length === 0) return EMPTY_SAL_VOICE_SEARCH_INDEX;
  const cacheKey = getSalVoiceSearchIndexCacheKey(voices, tariffBookIds);
  return buildAndCache(voices, tariffBookIds, cacheKey);
}
