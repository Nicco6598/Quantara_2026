// Shared utilities used across features.
// Import from here instead of from other feature directories.

export function normalizeContractorName(value: string): string {
  const normalized = value.trim();
  const lowerValue = normalized.toLowerCase();
  if (lowerValue.includes("rfi")) return "RFI";
  if (lowerValue.includes("anas")) return "ANAS";
  if (lowerValue.includes("regione marche") || lowerValue.includes("adriatica"))
    return "Regione Marche";
  if (lowerValue.includes("regione")) return normalized;
  return normalized || "Appaltatore da assegnare";
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
