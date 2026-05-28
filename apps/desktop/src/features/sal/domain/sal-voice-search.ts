/**
 * Unified SAL voice search: one parser, per-token channels, relevance scoring.
 * Optimized for large indexes (precomputed segments, single-pass rank, prepared queries).
 */

import type { SalVoiceDraft } from "../types";
import {
  isAmbiguousNumericCodeQuery,
  isCodeLikeSegment,
  normalizeVoiceCodeCompact,
  parseCodePathQuery,
  voiceCodeMatchesStructuredQuery,
} from "./sal-voice-code-search";

export type SalVoiceSearchQuery = {
  codePathParts: string[];
  isNumericOnly: boolean;
  isStructuredCode: boolean;
  isStructuredMultiPart: boolean;
  normalizedParts: string[];
  raw: string;
};

export type SalVoiceSearchOption = {
  id?: string;
  label: string;
  metadata?: string;
  value: string;
};

export type SalVoiceSearchCandidate = {
  codeSegments: string[];
  compactCode: string;
  fieldHaystack: string;
  haystack: string;
  option: SalVoiceSearchOption;
  tariffBookId: string;
  voice: SalVoiceDraft;
};

export type PreparedSalVoiceSearch = {
  parsed: SalVoiceSearchQuery;
  tariffBinding: { bookIds: Set<string>; textParts: string[] };
  tokenPatterns: RegExp[];
};

const SCORE = {
  CODE_COMPACT_PREFIX: 280,
  CODE_PREFIX: 400,
  CODE_SEGMENT: 320,
  DESCRIPTION_WORD: 140,
  STRUCTURED_FULL: 1000,
  TEXT_FIELD: 90,
  TARIFF_ONLY: 200,
} as const;

export function normalizeSalSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function parseSalVoiceSearchQuery(query: string): SalVoiceSearchQuery {
  const raw = query.trim();
  const normalizedParts = normalizeSalSearchText(raw).split(" ").filter(Boolean);
  const codePathParts = parseCodePathQuery(raw);
  const isNumericOnly = isAmbiguousNumericCodeQuery(normalizedParts);
  const isStructuredCode =
    !isNumericOnly &&
    codePathParts.length > 0 &&
    (raw.includes(".") || codePathParts.every(isCodeLikeSegment));
  const isStructuredMultiPart = isStructuredCode && (codePathParts.length > 1 || raw.includes("."));

  return {
    codePathParts,
    isNumericOnly,
    isStructuredCode,
    isStructuredMultiPart,
    normalizedParts,
    raw,
  };
}

function compileTokenPattern(token: string): RegExp {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[\\s.,;:/_\\-])${escaped}(?=$|[\\s.,;:/_\\-])`, "i");
}

function resolveTariffBinding(
  parts: string[],
  tariffTokensByBookId: Map<string, Set<string>>,
  tariffTokenMatchesQuery: (token: string, query: string) => boolean,
): { bookIds: Set<string>; textParts: string[] } {
  const bookIds = new Set<string>();
  const textParts: string[] = [];

  for (const part of parts) {
    if (isCodeLikeSegment(part)) {
      textParts.push(part);
      continue;
    }

    let matchedTariff = false;
    for (const [bookId, tokens] of tariffTokensByBookId) {
      for (const token of tokens) {
        if (tariffTokenMatchesQuery(token, part)) {
          bookIds.add(bookId);
          matchedTariff = true;
          break;
        }
      }
      if (matchedTariff) break;
    }
    if (!matchedTariff) textParts.push(part);
  }

  return { bookIds, textParts };
}

export function prepareSalVoiceSearch(
  query: string,
  tariffTokensByBookId: Map<string, Set<string>>,
  tariffTokenMatchesQuery: (token: string, query: string) => boolean,
): PreparedSalVoiceSearch | null {
  const parsed = parseSalVoiceSearchQuery(query);
  if (parsed.normalizedParts.length === 0) return null;

  const tariffBinding = resolveTariffBinding(
    parsed.normalizedParts,
    tariffTokensByBookId,
    tariffTokenMatchesQuery,
  );

  const partsToScore =
    tariffBinding.bookIds.size > 0 ? tariffBinding.textParts : parsed.normalizedParts;

  return {
    parsed,
    tariffBinding,
    tokenPatterns: partsToScore.map((part) => compileTokenPattern(part)),
  };
}

function segmentMatchesToken(segments: string[], token: string): boolean {
  return segments.some((segment) => segment === token || segment.startsWith(token));
}

function scoreCodeTokenFast(item: SalVoiceSearchCandidate, token: string): number {
  const first = item.codeSegments[0];
  if (first === token || (first?.startsWith(token) ?? false)) return SCORE.CODE_PREFIX;
  if (segmentMatchesToken(item.codeSegments, token)) return SCORE.CODE_SEGMENT;

  const compactToken = normalizeVoiceCodeCompact(token);
  if (compactToken.length >= 3 && item.compactCode.startsWith(compactToken)) {
    return SCORE.CODE_COMPACT_PREFIX;
  }

  return 0;
}

function scoreTextTokenFast(item: SalVoiceSearchCandidate, token: string, pattern: RegExp): number {
  if (pattern.test(item.voice.description) || pattern.test(item.voice.category)) {
    return SCORE.DESCRIPTION_WORD;
  }
  if (item.fieldHaystack.includes(token)) return SCORE.TEXT_FIELD;
  return 0;
}

function scoreQueryTokenFast(
  item: SalVoiceSearchCandidate,
  token: string,
  pattern: RegExp,
): number {
  if (isCodeLikeSegment(token)) {
    return Math.max(scoreCodeTokenFast(item, token), scoreTextTokenFast(item, token, pattern));
  }
  return scoreTextTokenFast(item, token, pattern);
}

function scoreSalVoiceMatchFast(
  item: SalVoiceSearchCandidate,
  prepared: PreparedSalVoiceSearch,
): number {
  const { parsed, tariffBinding, tokenPatterns } = prepared;

  if (parsed.isNumericOnly) {
    return voiceCodeMatchesStructuredQuery(item.option.value, parsed.raw)
      ? SCORE.STRUCTURED_FULL
      : 0;
  }

  if (parsed.isStructuredMultiPart) {
    return voiceCodeMatchesStructuredQuery(item.option.value, parsed.raw)
      ? SCORE.STRUCTURED_FULL
      : 0;
  }

  if (tariffBinding.bookIds.size > 0 && !tariffBinding.bookIds.has(item.tariffBookId)) {
    return 0;
  }

  const partsToScore =
    tariffBinding.bookIds.size > 0 ? tariffBinding.textParts : parsed.normalizedParts;

  if (partsToScore.length === 0) {
    return tariffBinding.bookIds.size > 0 ? SCORE.TARIFF_ONLY : 0;
  }

  let total = tariffBinding.bookIds.size > 0 ? SCORE.TARIFF_ONLY / 2 : 0;
  for (let index = 0; index < partsToScore.length; index++) {
    const part = partsToScore[index];
    if (!part) return 0;
    const partScore = scoreQueryTokenFast(
      item,
      part,
      tokenPatterns[index] ?? compileTokenPattern(part),
    );
    if (partScore === 0) return 0;
    total += partScore;
  }

  return total;
}

export function rankSalVoiceMatchesPrepared(
  index: SalVoiceSearchCandidate[],
  prepared: PreparedSalVoiceSearch,
  maxResults: number,
): SalVoiceSearchCandidate[] {
  const matches: { item: SalVoiceSearchCandidate; score: number }[] = [];

  for (const item of index) {
    const score = scoreSalVoiceMatchFast(item, prepared);
    if (score <= 0) continue;
    matches.push({ item, score });
  }

  matches.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.item.option.value.localeCompare(right.item.option.value, "it-IT");
  });

  return matches.slice(0, maxResults).map((entry) => entry.item);
}

export function rankSalVoiceMatches(
  index: SalVoiceSearchCandidate[],
  query: string,
  tariffTokensByBookId: Map<string, Set<string>>,
  tariffTokenMatchesQuery: (token: string, query: string) => boolean,
  maxResults: number,
): SalVoiceSearchCandidate[] {
  const prepared = prepareSalVoiceSearch(query, tariffTokensByBookId, tariffTokenMatchesQuery);
  if (!prepared) return [];
  return rankSalVoiceMatchesPrepared(index, prepared, maxResults);
}

/** @deprecated Use fieldHaystack + token patterns via prepareSalVoiceSearch */
export function textFieldContainsWord(text: string, token: string): boolean {
  return compileTokenPattern(token).test(text);
}
