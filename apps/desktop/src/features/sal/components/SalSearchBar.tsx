import { BookOpen, Loader2 } from "lucide-react";
import { m } from "framer-motion";
import { useCallback, useDeferredValue, useMemo } from "react";
import { AutocompleteInput } from "@/components/shared/AutocompleteInput";
import { cn } from "@/lib/utils";
import { TemplatePicker } from "./TemplatePicker";
import type { SalVoiceDraft } from "../types";
import type { SalTemplate } from "@/store/template-store";
import { tariffTokenMatchesQuery } from "../utils/search-utils";

export type SalAutocompleteOption = {
  id?: string;
  label: string;
  value: string;
  keywords?: string;
  metadata?: string;
};

export type IndexedVoiceOption = {
  code: string;
  codeSegments: string[];
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

export function splitVoiceCodeSegments(code: string): string[] {
  return code
    .split(".")
    .map((segment) =>
      segment
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase(),
    )
    .filter(Boolean);
}

export function parseCodePathQuery(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/[.\s]+/)
    .map((part) =>
      part
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase(),
    )
    .filter(Boolean);
}

export function matchesCodePathSegments(voiceSegments: string[], querySegments: string[]): boolean {
  for (let index = 0; index < querySegments.length; index++) {
    const querySegment = querySegments[index];
    if (!querySegment) return false;
    const voiceSegment = voiceSegments[index];
    if (voiceSegment == null) return false;
    if (index === querySegments.length - 1) {
      if (!voiceSegment.startsWith(querySegment)) return false;
    } else if (voiceSegment !== querySegment) {
      return false;
    }
  }
  return true;
}

function looksLikeVoicePrefix(part: string) {
  return /^[a-z]{1,4}\d*$/.test(part);
}

function shouldUseCodePathSearch(query: string, codePathParts: string[]): boolean {
  if (codePathParts.length === 0) return false;
  if (query.includes(".")) return true;
  const first = codePathParts[0];
  return first != null && looksLikeVoicePrefix(first);
}

/** Lighter option for bulk index build (no per-voice currency formatting). */
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
    return {
      code: normalizeVoiceCode(voice.code),
      codeSegments: splitVoiceCodeSegments(voice.code),
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
  const codePathParts = parseCodePathQuery(query);

  if (shouldUseCodePathSearch(query, codePathParts)) {
    const pathMatches = index.filter((item) =>
      matchesCodePathSegments(item.codeSegments, codePathParts),
    );
    if (pathMatches.length > 0) {
      const remainingParts = query.includes(".")
        ? []
        : queryParts.filter((part) => !codePathParts.includes(part));
      const matches =
        remainingParts.length > 0
          ? pathMatches.filter((item) =>
              remainingParts.every((part) => item.haystack.includes(part)),
            )
          : pathMatches;
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
