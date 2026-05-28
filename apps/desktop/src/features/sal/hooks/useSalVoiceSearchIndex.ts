import { useEffect, useMemo, useRef, useState } from "react";
import type { IndexedVoiceOption, SalAutocompleteOption } from "../components/SalSearchBar";
import {
  EMPTY_SAL_VOICE_SEARCH_INDEX,
  getCachedSalVoiceSearchIndex,
  getSalVoiceSearchIndexCacheKey,
  resolveSalVoiceSearchIndex,
  type SalVoiceSearchIndex,
} from "../domain/sal-voice-search-index-cache";
import type { SalVoiceDraft } from "../types";

export {
  resolveSalVoiceSearchIndex,
  scheduleSalVoiceSearchIndexWarmup,
} from "../domain/sal-voice-search-index-cache";
export type { IndexedVoiceOption, SalAutocompleteOption, SalVoiceSearchIndex };

export function useSalVoiceSearchIndex(
  voices: SalVoiceDraft[],
  tariffBookIds: string[],
): SalVoiceSearchIndex {
  const cacheKey = useMemo(
    () => getSalVoiceSearchIndexCacheKey(voices, tariffBookIds),
    [voices, tariffBookIds],
  );

  const [index, setIndex] = useState<SalVoiceSearchIndex>(() => {
    if (voices.length === 0) return EMPTY_SAL_VOICE_SEARCH_INDEX;
    return getCachedSalVoiceSearchIndex(cacheKey) ?? EMPTY_SAL_VOICE_SEARCH_INDEX;
  });

  const voicesRef = useRef(voices);
  const tariffBookIdsRef = useRef(tariffBookIds);
  voicesRef.current = voices;
  tariffBookIdsRef.current = tariffBookIds;

  useEffect(() => {
    if (voices.length === 0) {
      setIndex(EMPTY_SAL_VOICE_SEARCH_INDEX);
      return;
    }

    const cached = getCachedSalVoiceSearchIndex(cacheKey);
    if (cached) {
      setIndex((prev) => (prev === cached ? prev : cached));
      return;
    }

    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      setIndex(resolveSalVoiceSearchIndex(voicesRef.current, tariffBookIdsRef.current));
    };

    if (voices.length <= 2500) {
      queueMicrotask(run);
      return () => {
        cancelled = true;
      };
    }

    if (typeof requestIdleCallback === "function") {
      const idleId = requestIdleCallback(run, { timeout: 2000 });
      return () => {
        cancelled = true;
        cancelIdleCallback(idleId);
      };
    }

    const timeoutId = setTimeout(run, 0);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [cacheKey, voices.length]);

  return index;
}
