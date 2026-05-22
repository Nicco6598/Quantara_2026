import type { StatusTone } from "@/components/shared/StatusBadge";
import type { LaneTone, PortfolioProject } from "@/features/projects/types";
import { isTauriRuntime } from "@/lib/tauri-wrapper";

export type TonePalette = {
  accent: string;
  border: string;
  panel: string;
  soft: string;
  surface: string;
};

import { normalizeContractorName, readStringRecord, writeJson } from "@/lib/shared-utils";

export { normalizeContractorName, readStringRecord, writeJson };

export function getTonePalette(tone: StatusTone): TonePalette {
  if (tone === "danger") {
    return {
      accent: "var(--danger-base)",
      border: "color-mix(in srgb, var(--danger-base) 16%, var(--border-subtle))",
      panel:
        "linear-gradient(180deg, color-mix(in srgb, var(--danger-soft) 72%, var(--surface-base)), var(--surface-base))",
      soft: "var(--danger-soft)",
      surface:
        "linear-gradient(180deg, color-mix(in srgb, var(--danger-soft) 52%, var(--surface-base)), var(--surface-base))",
    };
  }

  if (tone === "warning") {
    return {
      accent: "var(--warning-base)",
      border: "color-mix(in srgb, var(--warning-base) 16%, var(--border-subtle))",
      panel:
        "linear-gradient(180deg, color-mix(in srgb, var(--warning-soft) 78%, var(--surface-base)), var(--surface-base))",
      soft: "var(--warning-soft)",
      surface:
        "linear-gradient(180deg, color-mix(in srgb, var(--warning-soft) 56%, var(--surface-base)), var(--surface-base))",
    };
  }

  if (tone === "success") {
    return {
      accent: "var(--success-base)",
      border: "color-mix(in srgb, var(--success-base) 14%, var(--border-subtle))",
      panel:
        "linear-gradient(180deg, color-mix(in srgb, var(--success-soft) 78%, var(--surface-base)), var(--surface-base))",
      soft: "var(--success-soft)",
      surface:
        "linear-gradient(180deg, color-mix(in srgb, var(--success-soft) 54%, var(--surface-base)), var(--surface-base))",
    };
  }

  if (tone === "info") {
    return {
      accent: "var(--info-base)",
      border: "color-mix(in srgb, var(--info-base) 14%, var(--border-subtle))",
      panel:
        "linear-gradient(180deg, color-mix(in srgb, var(--info-soft) 78%, var(--surface-base)), var(--surface-base))",
      soft: "var(--info-soft)",
      surface:
        "linear-gradient(180deg, color-mix(in srgb, var(--info-soft) 54%, var(--surface-base)), var(--surface-base))",
    };
  }

  return {
    accent: "var(--text-secondary)",
    border: "var(--border-subtle)",
    panel:
      "linear-gradient(180deg, color-mix(in srgb, var(--bg-muted) 74%, var(--surface-base)), var(--surface-base))",
    soft: "var(--bg-muted)",
    surface:
      "linear-gradient(180deg, color-mix(in srgb, var(--bg-muted) 56%, var(--surface-base)), var(--surface-base))",
  };
}

export function formatDueWindow(days: number): string {
  if (days <= 0) return "Oggi";
  if (days === 1) return "Domani";
  return `${days} giorni`;
}

export function formatForecastDelta(days: number): string {
  if (days === 0) return "In data";
  if (days < 0) return `${days} gg`;
  return `+${days} gg`;
}

export function isSalWindow(project: PortfolioProject): boolean {
  return (
    project.salDays <= 7 ||
    project.salState.toLowerCase().includes("blocc") ||
    project.salState.toLowerCase().includes("document")
  );
}

export function matchesSearch(value: string, query: string): boolean {
  return query.length === 0 || value.toLowerCase().includes(query);
}

export function matchesProjectSearch(project: PortfolioProject, query: string): boolean {
  return matchesSearch(
    `${project.title} ${project.contractor} ${project.lot} ${project.location} ${project.manager} ${project.phase} ${project.materialRisk} ${project.nextMilestone}`,
    query,
  );
}

export function matchesFocus(
  project: PortfolioProject,
  focus: "all" | "critical" | "sal",
): boolean {
  if (focus === "critical") return project.tone !== "success";
  if (focus === "sal") return isSalWindow(project);
  return true;
}

export function compareProjects(left: PortfolioProject, right: PortfolioProject): number {
  const toneOrder: Record<LaneTone, number> = { danger: 0, warning: 1, success: 2 };
  if (toneOrder[left.tone] !== toneOrder[right.tone])
    return toneOrder[left.tone] - toneOrder[right.tone];
  if (left.salDays !== right.salDays) return left.salDays - right.salDays;
  return right.progress - left.progress;
}

export function buildManagerLoad(projects: PortfolioProject[]) {
  const managerMap = new Map<string, { count: number; urgentWindow: number }>();

  for (const project of projects) {
    const current = managerMap.get(project.manager);
    if (!current) {
      managerMap.set(project.manager, { count: 1, urgentWindow: project.salDays });
      continue;
    }
    current.count += 1;
    current.urgentWindow = Math.min(current.urgentWindow, project.salDays);
  }

  return [...managerMap.entries()]
    .map(([name, value]) => ({ count: value.count, name, urgentWindow: value.urgentWindow }))
    .sort((left, right) => {
      if (left.count !== right.count) return right.count - left.count;
      return left.urgentWindow - right.urgentWindow;
    })
    .slice(0, 4);
}

export function isPlaceholderContractorName(value: string): boolean {
  const normalized = normalizeContractorName(value).toLowerCase();
  return (
    normalized === "appaltatore da assegnare" ||
    normalized === "impresa da contratto" ||
    normalized === "senza appaltatore"
  );
}

const contractorIdCache = new Map<string, string>();

export function createContractorId(contractor: string): string {
  const normalized = normalizeContractorName(contractor);
  const cached = contractorIdCache.get(normalized);
  if (cached !== undefined) return cached;

  const id = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  contractorIdCache.set(normalized, id);
  return id;
}

export function mergeContractorRegistry(current: string[], contractorName: string): string[] {
  const normalized = normalizeContractorName(contractorName);
  const normalizedId = createContractorId(normalized);
  if (!normalized || current.some((item) => createContractorId(item) === normalizedId)) {
    return current;
  }
  return [...current, normalized].sort((left, right) => left.localeCompare(right));
}

export function readStringList(key: string): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed)
      ? parsed
          .filter((item): item is string => typeof item === "string")
          .map(normalizeContractorName)
      : [];
  } catch {
    return [];
  }
}

export function countValidationIssues(
  validation: { issues: Array<{ severity: string }> },
  severity: "error" | "warning",
): number {
  return validation.issues.filter((issue) => issue.severity === severity).length;
}

export function waitForUiPaint(): Promise<void> {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

export function downloadWorkbook(bytes: Uint8Array, fileName: string): void {
  downloadExportFile(
    bytes,
    fileName,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}

export function downloadExportFile(bytes: Uint8Array, fileName: string, mimeType: string): void {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export async function saveWorkbookAs(bytes: Uint8Array, fileName: string): Promise<string | null> {
  return saveExportFileAs(bytes, fileName, {
    extensions: ["xlsx"],
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    name: "Excel",
  });
}

export async function savePdfAs(bytes: Uint8Array, fileName: string): Promise<string | null> {
  return saveExportFileAs(bytes, fileName, {
    extensions: ["pdf"],
    mimeType: "application/pdf",
    name: "PDF",
  });
}

async function saveExportFileAs(
  bytes: Uint8Array,
  fileName: string,
  filter: { extensions: string[]; mimeType: string; name: string },
): Promise<string | null> {
  if (!isTauriRuntime()) {
    downloadExportFile(bytes, fileName, filter.mimeType);
    return fileName;
  }

  const [{ invoke }, { save }] = await Promise.all([
    import("@tauri-apps/api/core"),
    import("@tauri-apps/plugin-dialog"),
  ]);
  const path = await save({
    defaultPath: fileName,
    filters: [{ name: filter.name, extensions: filter.extensions }],
  });

  if (!path) {
    return null;
  }

  return invoke<string>("write_export_file", {
    bytes: Array.from(bytes),
    path,
  });
}
