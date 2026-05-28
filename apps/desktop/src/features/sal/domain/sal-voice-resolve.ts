import { createDesktopVoiceKey } from "@/lib/shared-utils";
import type { SalLine, SalVoiceDraft } from "../types";
import { isSafetyVoice } from "./sal-safety";
import type { SalDocument } from "./sal-workflow";

type SnapshotVoice = {
  category?: string;
  code?: string;
  description?: string;
  id: string;
  laborPercentage?: number;
  projectYear?: number;
  tariffBookId?: string;
  unit?: string;
  unitPrice?: number;
};

/** Voices embedded in SQLite `source_snapshot` (may be absent on older saves). */
export function extractSnapshotVoicesFromSal(sal: SalDocument): SalVoiceDraft[] {
  const raw = sal as SalDocument & { voices?: SnapshotVoice[] };
  if (!Array.isArray(raw.voices) || raw.voices.length === 0) {
    return [];
  }

  return raw.voices.map((voice) => ({
    category: voice.category ?? "",
    code: voice.code ?? "",
    description: voice.description ?? "",
    id: voice.id,
    isSafetyCost: isSafetyVoice({
      category: voice.category ?? "",
      code: voice.code ?? "",
      description: voice.description ?? "",
    }),
    laborPercentage: voice.laborPercentage ?? 0,
    source: voice as never,
    tariffBookId: voice.tariffBookId ?? "",
    tariffBookName: "",
    tariffYear: voice.projectYear ?? new Date().getFullYear(),
    unit: voice.unit ?? "",
    unitPrice: voice.unitPrice ?? 0,
  }));
}

/** Match tariff voice ids with or without `bookId::` prefix. */
export function voiceIdsMatch(left: string, right: string): boolean {
  if (left === right) return true;
  const leftSuffix = left.split("::").pop() ?? left;
  const rightSuffix = right.split("::").pop() ?? right;
  if (leftSuffix === rightSuffix) return true;
  return left.endsWith(`::${right}`) || right.endsWith(`::${left}`);
}

export function resolveVoiceForSalLine(
  voiceId: string,
  catalog: readonly SalVoiceDraft[],
): SalVoiceDraft | undefined {
  const byId = new Map(catalog.map((voice) => [voice.id, voice]));
  const direct = byId.get(voiceId);
  if (direct) return direct;

  const legacySuffix = catalog.find(
    (voice) => voice.id.endsWith(`::${voiceId}`) || voice.id.split("::").pop() === voiceId,
  );
  if (legacySuffix) return legacySuffix;

  const legacyPrefix = catalog.find((voice) => voiceId.endsWith(`::${voice.id}`));
  if (legacyPrefix) return legacyPrefix;

  return undefined;
}

/** Rebuild minimal voice drafts from persisted sal_lines when snapshot has no `voices` array. */
export function voicesFromSalLines(
  lines: readonly SalLine[],
  catalog: readonly SalVoiceDraft[],
): SalVoiceDraft[] {
  const result = new Map<string, SalVoiceDraft>();

  for (const line of lines) {
    const resolved = resolveVoiceForSalLine(line.voiceId, catalog);
    if (resolved) {
      result.set(resolved.id, resolved);
      continue;
    }

    const bookId =
      catalog.find((voice) => line.voiceId.startsWith(`${voice.tariffBookId}::`))?.tariffBookId ??
      "";
    const rawId = line.voiceId.includes("::")
      ? (line.voiceId.split("::").pop() ?? line.voiceId)
      : line.voiceId;
    const id = bookId ? createDesktopVoiceKey(bookId, rawId) : line.voiceId;

    if (!result.has(id)) {
      result.set(id, {
        category: "",
        code: rawId,
        description: `Voce ${rawId}`,
        id,
        isSafetyCost: false,
        laborPercentage: 0,
        source: {} as never,
        tariffBookId: bookId,
        tariffBookName: "",
        tariffYear: new Date().getFullYear(),
        unit: "",
        unitPrice: 0,
      });
    }
  }

  return [...result.values()];
}
