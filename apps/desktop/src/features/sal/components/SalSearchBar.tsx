import { BookOpen } from "lucide-react";
import { m } from "framer-motion";
import { useCallback, useMemo } from "react";
import { AutocompleteInput } from "@/components/shared/AutocompleteInput";
import { TemplatePicker } from "./TemplatePicker";
import type { SalVoiceDraft } from "../types";
import type { SalTemplate } from "@/store/template-store";
import { useTariffSearch } from "../hooks/useTariffSearch";
import { tariffTokenMatchesQuery } from "../utils/search-utils";

type SalAutocompleteOption = {
  id?: string;
  label: string;
  value: string;
  keywords?: string;
  metadata?: string;
};

function normalizeSalSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildTariffSearchTokens(voice: SalVoiceDraft) {
  const normalizedName = normalizeSalSearch(voice.tariffBookName);
  const normalizedId = normalizeSalSearch(voice.tariffBookId);
  const words = normalizedName.split(" ").filter(Boolean);
  const acronym = words
    .filter((word) => !/^\d+$/.test(word))
    .map((word) => word[0])
    .join("");
  return new Set([normalizedName, normalizedId, acronym, ...words].filter(Boolean));
}

function defaultSalVoiceOptionMatches(option: SalAutocompleteOption, normalizedQuery: string) {
  return (
    option.value.toLowerCase().includes(normalizedQuery) ||
    option.label.toLowerCase().includes(normalizedQuery) ||
    Boolean(option.keywords?.toLowerCase().includes(normalizedQuery))
  );
}

function filterSalVoiceOptionsByTariffIntent({
  options,
  query,
  tariffTokensByBookId,
  voiceByOptionId,
}: {
  options: SalAutocompleteOption[];
  query: string;
  tariffTokensByBookId: Map<string, Set<string>>;
  voiceByOptionId: Map<string, SalVoiceDraft>;
}) {
  const normalizedQuery = normalizeSalSearch(query);
  if (!normalizedQuery) return [];
  const queryParts = normalizedQuery.split(" ").filter(Boolean);
  const matchedTariffIds = new Set<string>();
  const matchedQueryParts = new Set<string>();
  for (const part of queryParts) {
    for (const [tariffBookId, tokens] of tariffTokensByBookId) {
      if ([...tokens].some((token) => tariffTokenMatchesQuery(token, part))) {
        matchedTariffIds.add(tariffBookId);
        matchedQueryParts.add(part);
      }
    }
  }
  if (matchedTariffIds.size === 0) {
    return options.filter((option) => defaultSalVoiceOptionMatches(option, normalizedQuery));
  }
  const remainingQuery = queryParts.filter((part) => !matchedQueryParts.has(part)).join(" ");
  return options.filter((option) => {
    const voice = option.id ? voiceByOptionId.get(option.id) : undefined;
    if (!voice || !matchedTariffIds.has(voice.tariffBookId)) return false;
    return remainingQuery ? defaultSalVoiceOptionMatches(option, remainingQuery) : true;
  });
}

export function SalSearchBar({
  voices,
  tariffBookIds,
  linesCount,
  onSelectVoice,
  onApplyTemplate,
  onOpenTemplateDialog,
}: {
  voices: SalVoiceDraft[];
  tariffBookIds: string[];
  linesCount: number;
  onSelectVoice: (v: SalVoiceDraft) => void;
  onApplyTemplate: (t: SalTemplate) => void;
  onOpenTemplateDialog: () => void;
}) {
  const { setQuery: setSearchQuery, results: searchResults } = useTariffSearch(tariffBookIds);

  const autocompleteOptions = useMemo(() => {
    if (searchResults.length > 0) {
      return searchResults.map((r) => ({
        id: r.id,
        label: r.description,
        value: r.officialCode,
        keywords: `${r.officialCode} ${r.description} ${r.category}`,
        metadata: `${r.tariffBookId} · ${r.category} · ${r.unitOfMeasure} · ${(r.unitPriceCents / 100).toLocaleString("it-IT", { currency: "EUR", style: "currency", minimumFractionDigits: 2 })}`,
      }));
    }
    return voices.map((v) => ({
      id: v.id,
      label: v.description,
      metadata: `${v.tariffBookName} · ${v.category} · ${v.unit} · ${v.unitPrice.toLocaleString("it-IT", { currency: "EUR", style: "currency", minimumFractionDigits: 2 })}`,
      value: v.code,
      keywords: `${v.code} ${v.description} ${v.category} ${v.tariffBookName} ${v.tariffBookId}`,
    }));
  }, [searchResults, voices]);

  const voiceByOptionId = useMemo(() => new Map(voices.map((v) => [v.id, v])), [voices]);
  const tariffTokensByBookId = useMemo(() => {
    const result = new Map<string, Set<string>>();
    for (const voice of voices) {
      if (!result.has(voice.tariffBookId)) {
        result.set(voice.tariffBookId, buildTariffSearchTokens(voice));
      }
    }
    return result;
  }, [voices]);

  const hasSearchResults = searchResults.length > 0;

  const filterOptions = useCallback(
    (options: SalAutocompleteOption[], query: string) => {
      if (hasSearchResults) {
        return query.trim() ? options : [];
      }
      return filterSalVoiceOptionsByTariffIntent({
        options,
        query,
        tariffTokensByBookId,
        voiceByOptionId,
      });
    },
    [hasSearchResults, tariffTokensByBookId, voiceByOptionId],
  );

  return (
    <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)]/30 bg-[var(--surface-base)] px-4 py-1.5 lg:flex-row lg:items-center lg:px-6">
      <div className="min-w-0 flex-1">
        <AutocompleteInput
          options={autocompleteOptions}
          onQueryChange={setSearchQuery}
          onSelect={(o) => {
            const v =
              (o.id ? voiceByOptionId.get(o.id) : undefined) ??
              voices.find((x) => x.code === o.value);
            if (v) onSelectVoice(v);
          }}
          placeholder={`Cerca codice, descrizione o categoria (${voices.length} voci)...`}
          filterOptions={filterOptions}
        />
      </div>
      <div className="flex shrink-0 items-center gap-2">
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
