import { useCallback, useEffect, useRef, useState } from "react";
import { searchTariffVoices, type TariffVoiceSearchResult } from "@/lib/desktopData";

export function useTariffSearch(tariffBookIds: string[]) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TariffVoiceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await searchTariffVoices(tariffBookIds, query.trim(), 50);
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, tariffBookIds]);

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
  }, []);

  return { query, setQuery, results, isSearching, clearSearch };
}
