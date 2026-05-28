/**
 * Structured voice-code matching (e.g. SS.AC.A.2 02.A, SS.AC.A.2102.A).
 * Kept separate from UI so search rules stay testable.
 */

export function normalizeVoiceCodeCompact(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
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

/** Split dotted code; also splits spaces inside a segment (e.g. "2 02" → "2", "02"). */
export function expandVoiceCodeSegments(code: string): string[] {
  return code
    .split(".")
    .flatMap((segment) => segment.trim().split(/\s+/))
    .map((part) =>
      part
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase(),
    )
    .filter(Boolean);
}

export function splitVoiceCodeSegments(code: string): string[] {
  return expandVoiceCodeSegments(code);
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

export function isCodeLikeSegment(part: string): boolean {
  return /^[a-z]{1,4}\d*$/i.test(part) || /^\d{1,8}$/.test(part);
}

/** Query targets tariff voice codes (not free-text haystack). */
export function looksLikeStructuredVoiceCodeQuery(query: string, codePathParts: string[]): boolean {
  if (codePathParts.length === 0) return false;
  if (query.includes(".")) return true;
  return codePathParts.every(isCodeLikeSegment);
}

/** Prefix walk on code segments; skips single-letter bridge segments (e.g. A in SS.AC.A.2). */
export function matchesStructuredCodePrefix(voiceCode: string, query: string): boolean {
  const voiceSegments = expandVoiceCodeSegments(voiceCode);
  const querySegments = parseCodePathQuery(query);
  if (querySegments.length === 0) return false;

  let voiceIndex = 0;
  let queryIndex = 0;

  while (queryIndex < querySegments.length && voiceIndex < voiceSegments.length) {
    const querySegment = querySegments[queryIndex];
    const voiceSegment = voiceSegments[voiceIndex];
    if (!querySegment || voiceSegment == null) return false;

    const isLastQuery = queryIndex === querySegments.length - 1;
    if (voiceSegment === querySegment || (isLastQuery && voiceSegment.startsWith(querySegment))) {
      voiceIndex++;
      queryIndex++;
      continue;
    }

    if (voiceSegment.length === 1 && /^[a-z]$/i.test(voiceSegment)) {
      voiceIndex++;
      continue;
    }

    return false;
  }

  return queryIndex === querySegments.length;
}

function firstVoiceSegmentMatchesQueryPart(voiceSegments: string[], querySegment: string): boolean {
  const first = voiceSegments[0];
  if (!first || !querySegment) return false;
  return first === querySegment || first.startsWith(querySegment);
}

/**
 * Matches each query segment in order. The first segment must anchor on the voice code
 * prefix (SS AC → SS.… only). Later segments may skip bridge parts (FA 3001 → FA.AU.A.3001.A).
 */
export function matchesFlexibleCodePath(voiceCode: string, query: string): boolean {
  const voiceSegments = expandVoiceCodeSegments(voiceCode);
  const querySegments = parseCodePathQuery(query);
  if (querySegments.length === 0) return false;

  const firstQuery = querySegments[0];
  if (!firstQuery || !firstVoiceSegmentMatchesQueryPart(voiceSegments, firstQuery)) {
    return false;
  }

  let voiceIndex = 1;
  for (let queryIndex = 1; queryIndex < querySegments.length; queryIndex++) {
    const querySegment = querySegments[queryIndex];
    if (!querySegment) return false;

    const isLastQuery = queryIndex === querySegments.length - 1;
    let matched = false;

    while (voiceIndex < voiceSegments.length) {
      const voiceSegment = voiceSegments[voiceIndex];
      if (!voiceSegment) break;

      if (voiceSegment === querySegment || (isLastQuery && voiceSegment.startsWith(querySegment))) {
        voiceIndex++;
        matched = true;
        break;
      }

      voiceIndex++;
    }

    if (!matched) return false;
  }

  return true;
}

/**
 * Compact subsequence match, but only when the first query segment anchors the voice prefix.
 * Avoids SS AC matching AS.SI… (ssac scattered in assia…).
 */
export function compactCodeContainsQueryInOrder(voiceCode: string, query: string): boolean {
  const querySegments = parseCodePathQuery(query);
  const voiceSegments = expandVoiceCodeSegments(voiceCode);
  const firstQuery = querySegments[0];
  if (!firstQuery || !firstVoiceSegmentMatchesQueryPart(voiceSegments, firstQuery)) {
    return false;
  }

  const compactVoice = normalizeVoiceCodeCompact(voiceCode);
  const compactQuery = normalizeVoiceCodeCompact(query);
  if (compactQuery.length < 4) return false;

  let queryIndex = 0;
  for (
    let voiceIndex = 0;
    voiceIndex < compactVoice.length && queryIndex < compactQuery.length;
    voiceIndex++
  ) {
    if (compactVoice[voiceIndex] === compactQuery[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === compactQuery.length;
}

export function shouldUseCodePathSearch(query: string, codePathParts: string[]): boolean {
  return looksLikeStructuredVoiceCodeQuery(query, codePathParts);
}

/** Match query segments as a consecutive run anywhere in the voice code path. */
export function matchesConsecutiveCodeSegments(
  voiceSegments: string[],
  querySegments: string[],
): boolean {
  if (querySegments.length === 0) return false;
  for (let start = 0; start <= voiceSegments.length - querySegments.length; start++) {
    let matched = true;
    for (let index = 0; index < querySegments.length; index++) {
      const querySegment = querySegments[index];
      const voiceSegment = voiceSegments[start + index];
      if (!querySegment || voiceSegment == null) {
        matched = false;
        break;
      }
      const isLast = index === querySegments.length - 1;
      if (isLast) {
        if (!voiceSegment.startsWith(querySegment)) matched = false;
      } else if (voiceSegment !== querySegment) {
        matched = false;
      }
    }
    if (matched) return true;
  }
  return false;
}

/** Token matches any dotted/spaced segment (e.g. MG in SS.MG.001.A), not only the first. */
export function matchesAnyCodeSegment(voiceCode: string, token: string): boolean {
  const normalized = token.trim().toLowerCase();
  if (!normalized) return false;
  return expandVoiceCodeSegments(voiceCode).some(
    (segment) => segment === normalized || segment.startsWith(normalized),
  );
}

export function voiceCodeMatchesStructuredQuery(voiceCode: string, query: string): boolean {
  const codePathParts = parseCodePathQuery(query);
  if (codePathParts.length === 0) return false;

  const expanded = expandVoiceCodeSegments(voiceCode);
  if (matchesStructuredCodePrefix(voiceCode, query)) return true;
  if (matchesFlexibleCodePath(voiceCode, query)) return true;
  if (matchesCodePathSegments(expanded, codePathParts)) return true;

  if (
    codePathParts.length === 1 &&
    codePathParts[0] &&
    matchesAnyCodeSegment(voiceCode, codePathParts[0])
  ) {
    return true;
  }

  const compactVoice = normalizeVoiceCodeCompact(voiceCode);
  const compactQuery = normalizeVoiceCodeCompact(query);
  if (compactQuery.length >= 4) {
    if (compactVoice.startsWith(compactQuery)) return true;
    if (compactCodeContainsQueryInOrder(voiceCode, query)) return true;
  }

  if (isAmbiguousNumericCodeQuery(codePathParts)) {
    return matchesConsecutiveCodeSegments(expanded, codePathParts);
  }

  return false;
}

/** Numeric-only fragments (e.g. "2 02") must not match descriptions/prices in haystack. */
export function isAmbiguousNumericCodeQuery(queryParts: string[]): boolean {
  return queryParts.length > 0 && queryParts.every((part) => /^\d{1,4}$/.test(part) || part === "");
}
