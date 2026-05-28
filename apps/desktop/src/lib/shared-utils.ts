// Shared utilities used across features.
// Import from here instead of from other feature directories.

/** Exact aliases only — never truncate custom names such as "RFI TEST 5.0.1". */
const CONTRACTOR_CANONICAL_ALIASES: Record<string, string> = {
  anas: "ANAS",
  "a.n.a.s.": "ANAS",
  rfi: "RFI",
  "rfi s.p.a.": "RFI",
  "rfi s.p.a": "RFI",
  "rfi spa": "RFI",
  "regione marche": "Regione Marche",
};

export function normalizeContractorName(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return "Appaltatore da assegnare";

  const canonical = CONTRACTOR_CANONICAL_ALIASES[normalized.toLowerCase()];
  return canonical ?? normalized;
}

export function readStringRecord(key: string): Record<string, string> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .filter((entry): entry is [string, string] => typeof entry[1] === "string")
        .map(([projectId, contractorName]) => [projectId, normalizeContractorName(contractorName)]),
    );
  } catch {
    return {};
  }
}

export function createDesktopVoiceKey(tariffBookId: string, voiceId: string): string {
  return `${tariffBookId}::${voiceId}`;
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is best-effort in browser preview mode.
  }
}
