import { memo, useCallback, useRef } from "react";
import { AutocompleteInput } from "@/components/shared/AutocompleteInput";
import type { SalVoiceSearchIndex } from "../hooks/useSalVoiceSearchIndex";
import type { SalVoiceDraft } from "../types";
import { filterIndexedVoiceOptions, type SalAutocompleteOption } from "./SalSearchBar";

export const SalVoiceSearchField = memo(function SalVoiceSearchField({
  isLoading,
  searchIndex,
  tariffBookIds,
  voicesCount,
  onSelectVoice,
  onOptionContextMenu,
}: {
  isLoading?: boolean;
  searchIndex: SalVoiceSearchIndex;
  tariffBookIds: readonly string[];
  voicesCount: number;
  onSelectVoice: (voice: SalVoiceDraft) => void;
  onOptionContextMenu?: (voice: SalVoiceDraft, event: React.MouseEvent) => void;
}) {
  const searchIndexRef = useRef(searchIndex);
  searchIndexRef.current = searchIndex;

  const filterOptions = useCallback((_options: SalAutocompleteOption[], query: string) => {
    const index = searchIndexRef.current;
    return filterIndexedVoiceOptions({
      index: index.index,
      query,
      tariffTokensByBookId: index.tariffTokensByBookId,
    });
  }, []);

  const handleSelect = useCallback(
    (option: SalAutocompleteOption) => {
      const voice =
        (option.id ? searchIndexRef.current.voiceById.get(option.id) : undefined) ??
        searchIndexRef.current.index.find((item) => item.option.value === option.value)?.voice;
      if (voice) onSelectVoice(voice);
    },
    [onSelectVoice],
  );

  const handleContextMenu = useCallback(
    (option: SalAutocompleteOption, event: React.MouseEvent) => {
      if (!onOptionContextMenu) return;
      const voice =
        (option.id ? searchIndexRef.current.voiceById.get(option.id) : undefined) ??
        searchIndexRef.current.index.find((item) => item.option.value === option.value)?.voice;
      if (voice) onOptionContextMenu(voice, event);
    },
    [onOptionContextMenu],
  );

  return (
    <AutocompleteInput
      options={[]}
      onSelect={handleSelect}
      {...(onOptionContextMenu ? { onOptionContextMenu: handleContextMenu } : {})}
      placeholder={
        isLoading
          ? `Caricamento voci (${tariffBookIds.length} tariffari)...`
          : `Cerca codice, descrizione o categoria (${voicesCount} voci)`
      }
      filterOptions={filterOptions}
    />
  );
});
