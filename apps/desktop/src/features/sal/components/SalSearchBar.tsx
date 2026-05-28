import { m } from "framer-motion";
import { BookOpen, Loader2 } from "lucide-react";
import { useCallback, useDeferredValue, useMemo } from "react";
import { AutocompleteInput } from "@/components/shared/AutocompleteInput";
import { cn } from "@/lib/utils";
import type { SalTemplate } from "@/store/template-store";
import {
  expandVoiceCodeSegments,
  normalizeVoiceCodeCompact,
} from "../domain/sal-voice-code-search";
import {
  normalizeSalSearchText,
  prepareSalVoiceSearch,
  rankSalVoiceMatchesPrepared,
  type SalVoiceSearchCandidate,
} from "../domain/sal-voice-search";
import type { SalVoiceDraft } from "../types";
import { tariffTokenMatchesQuery } from "../utils/search-utils";
import { TemplatePicker } from "./TemplatePicker";

export type SalAutocompleteOption = {
  id?: string;
  label: string;
  value: string;
  keywords?: string;
  metadata?: string;
};

export type IndexedVoiceOption = SalVoiceSearchCandidate & {
  code: string;
  codeSegments: string[];
  option: SalAutocompleteOption;
};

const MAX_SEARCH_RESULTS = 80;

export function buildTariffSearchTokens(voice: SalVoiceDraft) {
  const normalizedName = normalizeSalSearchText(voice.tariffBookName);
  const normalizedId = normalizeSalSearchText(voice.tariffBookId);
  const words = normalizedName.split(" ").filter(Boolean);
  const acronym = words
    .filter((word) => !/^\d+$/.test(word))
    .map((word) => word[0])
    .join("");
  return new Set([normalizedName, normalizedId, acronym, ...words].filter(Boolean));
}

export function splitVoiceCodeSegments(code: string): string[] {
  return expandVoiceCodeSegments(code);
}

export { matchesCodePathSegments, parseCodePathQuery } from "../domain/sal-voice-code-search";

function buildVoiceOptionForIndex(voice: SalVoiceDraft): SalAutocompleteOption {
  return {
    id: voice.id,
    label: voice.description,
    metadata: `${voice.tariffBookName} · ${voice.category} · ${voice.unit}`,
    value: voice.code,
    keywords: `${voice.code} ${voice.description} ${voice.category} ${voice.tariffBookName} ${voice.tariffBookId}`,
  };
}

export function buildIndexedVoiceOptions(voices: readonly SalVoiceDraft[]): IndexedVoiceOption[] {
  return voices.map((voice) => {
    const option = buildVoiceOptionForIndex(voice);
    const compactCode = normalizeVoiceCodeCompact(voice.code);
    return {
      code: compactCode,
      codeSegments: expandVoiceCodeSegments(voice.code),
      compactCode,
      fieldHaystack: normalizeSalSearchText(`${voice.code} ${voice.description} ${voice.category}`),
      haystack: normalizeSalSearchText(
        `${voice.code} ${voice.description} ${voice.category} ${voice.tariffBookName} ${voice.tariffBookId}`,
      ),
      option,
      tariffBookId: voice.tariffBookId,
      voice,
    };
  });
}

export function filterIndexedVoiceOptions({
  index,
  query,
  tariffTokensByBookId,
}: {
  index: IndexedVoiceOption[];
  query: string;
  tariffTokensByBookId: Map<string, Set<string>>;
}) {
  const prepared = prepareSalVoiceSearch(query, tariffTokensByBookId, tariffTokenMatchesQuery);
  if (!prepared) return [];
  const ranked = rankSalVoiceMatchesPrepared(index, prepared, MAX_SEARCH_RESULTS);
  return ranked.map((item) => item.option);
}

export function SalSearchBar({
  voices,
  tariffBookIds,
  linesCount,
  isLoading,
  onSelectVoice,
  onApplyTemplate,
  onOpenTemplateDialog,
  className,
}: {
  voices: SalVoiceDraft[];
  tariffBookIds: string[];
  linesCount: number;
  isLoading?: boolean;
  onSelectVoice: (v: SalVoiceDraft) => void;
  onApplyTemplate: (t: SalTemplate) => void;
  onOpenTemplateDialog: () => void;
  className?: string;
}) {
  const deferredVoices = useDeferredValue(voices);
  const searchIndex = useMemo(() => buildIndexedVoiceOptions(deferredVoices), [deferredVoices]);
  const voiceByOptionId = useMemo(
    () => new Map(deferredVoices.map((v) => [v.id, v])),
    [deferredVoices],
  );
  const tariffTokensByBookId = useMemo(() => {
    const result = new Map<string, Set<string>>();
    for (const voice of deferredVoices) {
      if (result.size >= tariffBookIds.length) break;
      if (!result.has(voice.tariffBookId)) {
        result.set(voice.tariffBookId, buildTariffSearchTokens(voice));
      }
    }
    return result;
  }, [deferredVoices, tariffBookIds.length]);

  const filterOptions = useCallback(
    (_options: SalAutocompleteOption[], query: string) => {
      return filterIndexedVoiceOptions({
        index: searchIndex,
        query,
        tariffTokensByBookId,
      });
    },
    [searchIndex, tariffTokensByBookId],
  );

  return (
    <div className={cn("flex flex-col gap-2 lg:flex-row lg:items-center", className)}>
      <div className="min-w-0 flex-1">
        <AutocompleteInput
          options={[]}
          onSelect={(o) => {
            const v =
              (o.id ? voiceByOptionId.get(o.id) : undefined) ??
              voices.find((x) => x.code === o.value);
            if (v) onSelectVoice(v);
          }}
          placeholder={
            isLoading
              ? `Caricamento voci (${tariffBookIds.length} tariffari)...`
              : `Cerca codice, descrizione o categoria (${voices.length} voci · ${tariffBookIds.length} tariffari)...`
          }
          filterOptions={filterOptions}
        />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isLoading && (
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--bg-muted)] px-3 text-11px font-medium text-[var(--text-tertiary)]">
            <Loader2 className="size-3.5 animate-spin" />
            Caricamento...
          </span>
        )}
        <TemplatePicker onApply={onApplyTemplate} tariffBookId={tariffBookIds[0] ?? ""} />
        {linesCount > 0 && (
          <m.button
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--bg-muted)] px-3 text-11px font-medium text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]"
            onClick={onOpenTemplateDialog}
            type="button"
          >
            <BookOpen className="size-3.5" />
            Salva template
          </m.button>
        )}
      </div>
    </div>
  );
}
