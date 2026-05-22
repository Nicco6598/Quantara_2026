import { BookOpen, Loader2 } from "lucide-react";
import { m } from "framer-motion";
import { useCallback, useDeferredValue, useMemo } from "react";
import { AutocompleteInput } from "@/components/shared/AutocompleteInput";
import { TemplatePicker } from "./TemplatePicker";
import type { SalVoiceDraft } from "../types";
import type { SalTemplate } from "@/store/template-store";
import { tariffTokenMatchesQuery } from "../utils/search-utils";

type SalAutocompleteOption = {
  id?: string;
  label: string;
  value: string;
  keywords?: string;
  metadata?: string;
};

type IndexedVoiceOption = {
  code: string;
  haystack: string;
  option: SalAutocompleteOption;
  tariffBookId: string;
  voice: SalVoiceDraft;
};

const MAX_SEARCH_RESULTS = 80;

function normalizeSalSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function buildTariffSearchTokens(voice: SalVoiceDraft) {
  const normalizedName = normalizeSalSearch(voice.tariffBookName);
  const normalizedId = normalizeSalSearch(voice.tariffBookId);
  const words = normalizedName.split(" ").filter(Boolean);
  const acronym = words
    .filter((word) => !/^\d+$/.test(word))
    .map((word) => word[0])
    .join("");
  return new Set([normalizedName, normalizedId, acronym, ...words].filter(Boolean));
}

function normalizeVoiceCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function looksLikeVoicePrefix(part: string) {
  return /^[a-z]{1,4}\d*$/.test(part);
}

function buildVoiceOption(voice: SalVoiceDraft): SalAutocompleteOption {
  return {
    id: voice.id,
    label: voice.description,
    metadata: `${voice.tariffBookName} · ${voice.category} · ${voice.unit} · ${voice.unitPrice.toLocaleString("it-IT", { currency: "EUR", style: "currency", minimumFractionDigits: 2 })}`,
    value: voice.code,
    keywords: `${voice.code} ${voice.description} ${voice.category} ${voice.tariffBookName} ${voice.tariffBookId}`,
  };
}

export function buildIndexedVoiceOptions(voices: SalVoiceDraft[]): IndexedVoiceOption[] {
  return voices.map((voice) => {
    const option = buildVoiceOption(voice);
    return {
      code: normalizeVoiceCode(voice.code),
      haystack: normalizeSalSearch(
        `${voice.code} ${voice.description} ${voice.category} ${voice.tariffBookName} ${voice.tariffBookId}`,
      ),
      option,
      tariffBookId: voice.tariffBookId,
      voice,
    };
  });
}

function limitResults(items: IndexedVoiceOption[]) {
  return items.slice(0, MAX_SEARCH_RESULTS).map((item) => item.option);
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
  const normalizedQuery = normalizeSalSearch(query);
  if (!normalizedQuery) return [];
  const queryParts = normalizedQuery.split(" ").filter(Boolean);

  const prefix = queryParts[0] ?? "";
  if (looksLikeVoicePrefix(prefix)) {
    const prefixMatches = index.filter((item) => item.code.startsWith(prefix));
    if (prefixMatches.length > 0) {
      const remainingQuery = queryParts.slice(1).join(" ");
      const remainingParts = queryParts.slice(1);
      const matches = remainingQuery
        ? prefixMatches.filter((item) =>
            remainingParts.every((part) => item.haystack.includes(part)),
          )
        : prefixMatches;
      return limitResults(
        matches.sort((left, right) => left.option.value.localeCompare(right.option.value, "it-IT")),
      );
    }
  }

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
    return limitResults(
      index.filter((item) => queryParts.every((part) => item.haystack.includes(part))),
    );
  }
  const remainingQuery = queryParts.filter((part) => !matchedQueryParts.has(part)).join(" ");
  const remainingParts = queryParts.filter((part) => !matchedQueryParts.has(part));
  return limitResults(
    index.filter((item) => {
      if (!matchedTariffIds.has(item.tariffBookId)) return false;
      return remainingQuery ? remainingParts.every((part) => item.haystack.includes(part)) : true;
    }),
  );
}

export function SalSearchBar({
  voices,
  tariffBookIds,
  linesCount,
  isLoading,
  onSelectVoice,
  onApplyTemplate,
  onOpenTemplateDialog,
}: {
  voices: SalVoiceDraft[];
  tariffBookIds: string[];
  linesCount: number;
  isLoading?: boolean;
  onSelectVoice: (v: SalVoiceDraft) => void;
  onApplyTemplate: (t: SalTemplate) => void;
  onOpenTemplateDialog: () => void;
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
    <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)]/30 bg-[var(--surface-base)] px-4 py-1.5 lg:flex-row lg:items-center lg:px-6">
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
