import { parseEuroAmount } from "@quantara/domain-utils";
import { m } from "framer-motion";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronRight,
  FileWarning,
  Gauge,
  Link2,
  List,
  ListChecks,
  MapPinned,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/shared/Button";
import { Dialog, DialogActions } from "@/components/shared/Dialog";
import { useToast } from "@/components/shared/ToastProvider";

import type { DesktopTariffVoice, TariffPdfMetadata } from "@/lib/desktopData";

import type { ImportValidation } from "../tariffs-types";
import { groupEditableTariffVoices, type VoiceGroup } from "../utils/tariff-grouping";
import type { ImportDraft } from "../utils/tariff-import-drafts";
import {
  createDraftName,
  createDraftSignature,
  deleteTariffImportDraft,
  loadImportDraft,
  saveImportDraftRecord,
} from "../utils/tariff-import-drafts";
import { getImportValidation, parseOptionalPercent } from "../utils/tariffs-validation";
import {
  EditableTariffVoicesGrid,
  type EditableTariffVoicesGridHandle,
  type TariffGridDraftChange,
  type TariffGridScrollTarget,
  type TariffGridSectionSummary,
} from "./EditableTariffVoicesGrid";
import { ValidationLine } from "./ValidationLine";

type InspectorTab = "checks" | "categories" | "issues" | "warnings";

type ImportReviewSummary = {
  blockingIssueCount: number;
  completionPercent: number;
  filesWithoutVoices: number;
  hasVoices: boolean;
  issueCount: number;
  isReviewReady: boolean;
  maggiorazioniCount: number;
  sourceIssues: number;
  validation: ImportValidation;
  warningRows: number;
  yearIssues: number;
};

type ExtractionSummary = {
  averageConfidence: number | null;
  issueRows: number;
  linkedRows: number;
  lowConfidenceRows: number;
  maggiorazioneRules: number;
  pagesLabel: string;
  parserIssues: number;
  sourceMappedRows: number;
  warningLibraryRows: number;
};

const emptyImportValidation: ImportValidation = {
  duplicateCount: 0,
  duplicateExamples: [],
  duplicateRows: [],
  invalidCount: 0,
  invalidExamples: [],
  invalidRows: [],
  validCount: 0,
  warningCount: 0,
};

function readRecordValue(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  return record[key] ?? record[key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)];
}

function readNumberMap(value: unknown, key: string): Record<string, number> {
  const map = readRecordValue(value, key);
  if (!map || typeof map !== "object") return {};
  return Object.fromEntries(
    Object.entries(map as Record<string, unknown>).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number",
    ),
  );
}

function getArrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function buildExtractionSummary(
  metadata: TariffPdfMetadata | undefined,
  voices: readonly DesktopTariffVoice[],
): ExtractionSummary {
  const report = metadata?.validationReport as unknown;
  const counts = readNumberMap(report, "counts");
  const confidence = readNumberMap(report, "confidence");
  const issueRows = voices.filter((voice) => (voice.issues?.length ?? 0) > 0).length;
  const lowConfidenceRows = voices.filter((voice) => (voice.confidence ?? 1) < 0.85).length;
  const sourceMappedRows = voices.filter((voice) => voice.source?.page != null).length;
  const linkedRows = voices.filter((voice) => (voice.linkedMaggiorazioni?.length ?? 0) > 0).length;
  const parserIssues =
    Object.values(readNumberMap(report, "issuesByType")).reduce((sum, count) => sum + count, 0) +
    Object.values(readNumberMap(report, "warningIssuesByType")).reduce(
      (sum, count) => sum + count,
      0,
    );
  const pageCount = metadata?.pagesParsed ?? metadata?.pagesTotal ?? counts.pages_total ?? 0;
  const totalPages = metadata?.pagesTotal ?? pageCount;

  return {
    averageConfidence:
      confidence.average_record_confidence ??
      (voices.length > 0
        ? Math.round(
            (voices.reduce((sum, voice) => sum + (voice.confidence ?? 1), 0) / voices.length) *
              1000,
          ) / 1000
        : null),
    issueRows,
    linkedRows,
    lowConfidenceRows: counts.low_confidence_records ?? lowConfidenceRows,
    maggiorazioneRules:
      counts.maggiorazione_rules ?? getArrayLength(metadata?.maggiorazioneRules as unknown),
    pagesLabel: pageCount > 0 ? `${pageCount}/${totalPages || pageCount}` : "-",
    parserIssues,
    sourceMappedRows: counts.source_index_codes ?? sourceMappedRows,
    warningLibraryRows: counts.warnings ?? getArrayLength(metadata?.warnings as unknown),
  };
}

function isMaggiorazioneVoice(voice: DesktopTariffVoice): boolean {
  return voice.isMaggiorazione === true || voice.officialCode?.includes(".MG.");
}

function buildImportReviewSummary(
  metadatas: readonly TariffPdfMetadata[],
  editableVoicesList: readonly DesktopTariffVoice[][],
  validations: readonly ImportValidation[],
): ImportReviewSummary {
  const duplicateExamples = new Set<string>();
  let duplicateCount = 0;
  let filesWithoutVoices = 0;
  let invalidCount = 0;
  let maggiorazioniCount = 0;
  let sourceIssues = 0;
  let totalVoices = 0;
  let validCount = 0;
  let warningRows = 0;
  let yearIssues = 0;

  metadatas.forEach((metadata, index) => {
    const voices = editableVoicesList[index] ?? [];
    const validation = validations[index] ?? emptyImportValidation;

    totalVoices += voices.length;
    maggiorazioniCount += voices.filter((voice) => isMaggiorazioneVoice(voice)).length;
    warningRows += voices.filter((voice) => (voice.warnings?.length ?? 0) > 0).length;
    validCount += validation.validCount;
    invalidCount += validation.invalidCount;
    duplicateCount += validation.duplicateCount;
    validation.duplicateExamples.forEach((code) => {
      duplicateExamples.add(code);
    });

    if (voices.length === 0) filesWithoutVoices += 1;
    if (metadata.sourceName === "Ente da confermare") sourceIssues += 1;
    if (metadata.year < 1900 || metadata.year > 2200) yearIssues += 1;
  });

  const blockingIssueCount = invalidCount + duplicateCount;
  const metadataIssues = sourceIssues + yearIssues;
  const issueCount = filesWithoutVoices + blockingIssueCount + metadataIssues;

  return {
    blockingIssueCount,
    completionPercent: totalVoices > 0 ? Math.round((validCount / totalVoices) * 100) : 0,
    filesWithoutVoices,
    hasVoices: filesWithoutVoices === 0,
    issueCount,
    isReviewReady: metadatas.length > 0 && issueCount === 0,
    maggiorazioniCount,
    sourceIssues,
    validation: {
      ...emptyImportValidation,
      duplicateCount,
      duplicateExamples: [...duplicateExamples].slice(0, 8),
      invalidCount,
      validCount,
      warningCount: warningRows,
    },
    warningRows,
    yearIssues,
  };
}

function isMacPlatform() {
  if (typeof navigator === "undefined") return false;
  return /mac|iphone|ipad|ipod/i.test(navigator.platform);
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-base)] px-1.5 py-0.5 text-10px font-bold leading-none text-[var(--text-secondary)] shadow-[inset_0_-1px_0_color-mix(in_srgb,var(--border-subtle)_70%,transparent)]">
      {children}
    </kbd>
  );
}

function ShortcutHint({ action, keys }: { action: string; keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span>{action}</span>
      <span className="inline-flex items-center gap-1">
        {keys.map((key) => (
          <Kbd key={key}>{key}</Kbd>
        ))}
      </span>
    </span>
  );
}

function ImportShortcutLegend({ compact = false }: { compact?: boolean }) {
  const modKey = isMacPlatform() ? "⌘" : "Ctrl";
  const deleteKey = isMacPlatform() ? "⌫" : "Del";
  const groups = [
    {
      label: "Navigazione",
      hints: [{ action: "File", keys: [modKey, "Shift", "←/→"] }],
    },
    {
      label: "Stato",
      hints: [
        { action: "Revisiona", keys: [modKey, "Shift", "R"] },
        { action: "Bozza", keys: [modKey, "Shift", "B"] },
      ],
    },
    {
      label: "Azioni",
      hints: [
        { action: "Conferma", keys: [modKey, "Shift", "Enter"] },
        { action: "Rimuovi", keys: [modKey, "Shift", deleteKey] },
      ],
    },
  ];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-2 text-11px font-semibold text-[var(--text-secondary)]",
        compact &&
          "rounded-14px border border-[var(--border-subtle)]/60 bg-[var(--surface-base)]/70 px-3 py-2",
      )}
    >
      {groups.map((group) => (
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5" key={group.label}>
          <span className="text-10px font-bold uppercase tracking-caption text-[var(--text-tertiary)]">
            {group.label}
          </span>
          {group.hints.map((hint) => (
            <ShortcutHint action={hint.action} keys={hint.keys} key={hint.action} />
          ))}
        </span>
      ))}
    </div>
  );
}

function ExtractionAuditStrip({ summary }: { summary: ExtractionSummary }) {
  const confidencePercent =
    summary.averageConfidence == null ? null : Math.round(summary.averageConfidence * 100);
  const cells = [
    {
      icon: Gauge,
      label: "Confidenza",
      tone:
        confidencePercent == null
          ? "neutral"
          : confidencePercent >= 90
            ? "success"
            : confidencePercent >= 80
              ? "warning"
              : "danger",
      value: confidencePercent == null ? "-" : `${confidencePercent}%`,
    },
    {
      icon: MapPinned,
      label: "Source map",
      tone: summary.sourceMappedRows > 0 ? "success" : "neutral",
      value: summary.sourceMappedRows.toLocaleString("it-IT"),
    },
    {
      icon: FileWarning,
      label: "Avvertenze",
      tone: summary.warningLibraryRows > 0 ? "warning" : "neutral",
      value: summary.warningLibraryRows.toLocaleString("it-IT"),
    },
    {
      icon: Link2,
      label: "Regole MG",
      tone: summary.maggiorazioneRules > 0 ? "warning" : "neutral",
      value: summary.maggiorazioneRules.toLocaleString("it-IT"),
    },
    {
      icon: ShieldCheck,
      label: "Audit",
      tone: summary.parserIssues > 0 || summary.lowConfidenceRows > 0 ? "warning" : "success",
      value: (summary.parserIssues + summary.lowConfidenceRows).toLocaleString("it-IT"),
    },
  ] as const;

  return (
    <div className="grid gap-2 border-y border-[var(--border-subtle)]/70 py-2 sm:grid-cols-2 lg:grid-cols-5">
      {cells.map(({ icon: Icon, label, tone, value }) => (
        <div
          className="flex min-w-0 items-center gap-2 rounded-12px bg-[var(--surface-base)]/42 px-3 py-2 ring-1 ring-[var(--border-subtle)]/44"
          key={label}
        >
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-lg",
              tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
              tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
              tone === "danger" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
              tone === "neutral" && "bg-[var(--surface-base)] text-[var(--text-secondary)]",
            )}
          >
            <Icon className="size-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-10px font-bold uppercase tracking-caption text-[var(--text-tertiary)]">
              {label}
            </span>
            <span className="block text-13px font-bold tabular-nums text-[var(--text-primary)]">
              {value}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function ImportWorkspaceHeader({
  metadata,
  regularCount,
  maggiorazioniCount,
  summary,
}: {
  metadata: TariffPdfMetadata | undefined;
  regularCount: number;
  maggiorazioniCount: number;
  summary: ExtractionSummary;
}) {
  return (
    <div className="border-b border-[var(--border-subtle)]/70 pb-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-10px font-bold uppercase tracking-0_14em text-[var(--text-tertiary)]">
            <span>{metadata?.sourceName ?? "Sorgente"}</span>
            <span className="h-1 w-1 rounded-full bg-[var(--text-tertiary)]/60" />
            <span>{metadata?.year ?? "-"}</span>
            <span className="h-1 w-1 rounded-full bg-[var(--text-tertiary)]/60" />
            <span>pagine {summary.pagesLabel}</span>
          </div>
          <h3 className="mt-2 truncate text-24px font-semibold leading-tight tracking-neg-0_035em text-[var(--text-primary)]">
            {metadata?.name ?? "Preview importazione"}
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
          <HeaderStat label="Voci" value={regularCount} />
          <HeaderStat label="Maggioraz." value={maggiorazioniCount} tone="warning" />
          <HeaderStat label="Audit" value={summary.issueRows + summary.lowConfidenceRows} />
        </div>
      </div>
    </div>
  );
}

function HeaderStat({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "neutral" | "warning";
  value: number;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-base)]/44 px-3 py-2 ring-1 ring-[var(--border-subtle)]/50">
      <div className="text-9px font-bold uppercase tracking-caption text-[var(--text-tertiary)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-18px font-bold leading-none tabular-nums",
          tone === "warning" ? "text-[var(--warning-base)]" : "text-[var(--text-primary)]",
        )}
      >
        {value.toLocaleString("it-IT")}
      </div>
    </div>
  );
}

function VoicesPanel({
  duplicateCodes,
  editableGroups,
  handleAddVoice,
  updateVoice,
  askDeleteVoice,
  updateCategorySections,
  gridRef,
  gridScrollTarget,
  activeValidation,
  hasVoices,
}: {
  duplicateCodes: Set<string>;
  editableGroups: VoiceGroup[];
  handleAddVoice: () => void;
  updateVoice: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  askDeleteVoice: (index: number) => void;
  updateCategorySections: (next: TariffGridSectionSummary[]) => void;
  gridRef: React.RefObject<EditableTariffVoicesGridHandle | null>;
  gridScrollTarget: TariffGridScrollTarget | null;
  activeValidation: ImportValidation;
  hasVoices: boolean;
}) {
  return (
    <>
      <div className="min-w-0 self-start">
        <EditableTariffVoicesGrid
          duplicateCodes={duplicateCodes}
          groups={editableGroups}
          onAddVoice={handleAddVoice}
          onChange={updateVoice}
          onDelete={askDeleteVoice}
          onSectionsChange={updateCategorySections}
          ref={gridRef}
          scrollTarget={gridScrollTarget}
          validation={activeValidation}
        />
      </div>
      {!hasVoices ? (
        <div className="mt-4 rounded-2xl bg-[var(--warning-soft)] px-4 py-3 text-13px font-semibold text-[var(--warning-base)]">
          Nessuna voce tariffaria importabile trovata nel PDF. Verifica che il documento contenga
          codici, unita di misura e prezzi leggibili.
        </div>
      ) : null}
    </>
  );
}

function FileTabs({
  metadatas,
  validations,
  editableVoicesList,
  modalReviewedFiles,
  draftedFiles,
  switchFile,
  localActiveIndex,
}: {
  metadatas: TariffPdfMetadata[];
  validations: ImportValidation[];
  editableVoicesList: DesktopTariffVoice[][];
  modalReviewedFiles: Set<number>;
  draftedFiles: Set<number>;
  switchFile: (index: number) => void;
  localActiveIndex: number;
}) {
  return (
    <div className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-muted)]/25 px-5 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-11px font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
          File import
        </div>
        <div className="text-12px font-semibold text-[var(--text-secondary)]">
          {metadatas.length}/{metadatas.length} in revisione
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {metadatas.map((meta, i) => {
          const v = validations[i];
          const voices = editableVoicesList[i];
          const hasErrors = (v?.invalidCount ?? 0) > 0 || (v?.duplicateCount ?? 0) > 0;
          const isValid = (voices?.length ?? 0) > 0 && !hasErrors;
          const isReviewed = modalReviewedFiles.has(i);
          return (
            <m.button
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-1.5 text-12px font-semibold transition-all duration-[var(--duration-fast)]",
                i === localActiveIndex
                  ? "bg-[var(--accent-primary)] text-[var(--text-inverse)] shadow-sm"
                  : draftedFiles.has(i)
                    ? "bg-[var(--warning-soft)] text-[var(--warning-base)] ring-1 ring-[var(--warning-base)]/30"
                    : isReviewed
                      ? "bg-[var(--success-soft)] text-[var(--success-base)] ring-1 ring-[var(--success-base)]/30"
                      : "bg-[var(--surface-base)] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] hover:text-[var(--text-primary)]",
              )}
              key={meta.name}
              onClick={() => switchFile(i)}
              type="button"
            >
              {draftedFiles.has(i) ? (
                <Save className="size-3.5 shrink-0" />
              ) : isReviewed ? (
                <CheckCircle2 className="size-3.5 shrink-0" />
              ) : isValid ? (
                <CheckCircle2 className="size-3.5 shrink-0 text-[var(--success-base)]" />
              ) : hasErrors ? (
                <span className="size-3.5 shrink-0 rounded-full bg-[var(--warning-base)]" />
              ) : null}
              <span className="min-w-0 truncate">{meta.name}</span>
              {draftedFiles.has(i) ? (
                <span className="shrink-0 rounded-full bg-[var(--warning-base)]/15 px-1.5 py-0.5 text-9px font-bold uppercase tracking-wider text-[var(--warning-base)]">
                  Bozza
                </span>
              ) : isReviewed ? (
                <span className="shrink-0 rounded-full bg-[var(--success-base)]/15 px-1.5 py-0.5 text-9px font-bold uppercase tracking-wider text-[var(--success-base)]">
                  Rev.
                </span>
              ) : null}
            </m.button>
          );
        })}
      </div>
    </div>
  );
}

function ModalFooter({
  onCancel,
  saveDraft,
  loadedDraft,
  discardDraft,
  removeActiveFile,
  toggleActiveFileDraft,
  draftedFiles,
  localActiveIndex,
  markActiveFileReviewed,
  modalReviewedFiles,
  metadatas,
  canConfirm,
  isBusy,
  confirmChanges,
}: {
  onCancel: () => void;
  saveDraft: () => void;
  loadedDraft: ImportDraft | null;
  discardDraft: () => void;
  removeActiveFile: () => void;
  toggleActiveFileDraft: () => void;
  draftedFiles: Set<number>;
  localActiveIndex: number;
  markActiveFileReviewed: () => void;
  modalReviewedFiles: Set<number>;
  metadatas: TariffPdfMetadata[];
  canConfirm: boolean;
  isBusy: boolean;
  confirmChanges: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)]/70 px-5 py-4">
      <ImportShortcutLegend />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onCancel} variant="outline">
            Annulla
          </Button>
          <Button icon={Save} onClick={saveDraft} variant="secondary">
            Salva bozza
          </Button>
          {loadedDraft ? (
            <Button icon={Archive} onClick={discardDraft} variant="outline">
              Elimina bozza
            </Button>
          ) : null}
          {metadatas.length > 0 ? (
            <Button icon={Trash2} onClick={removeActiveFile} variant="outline">
              Cancella file
            </Button>
          ) : null}
          {metadatas.length > 1 ? (
            <Button icon={Save} onClick={toggleActiveFileDraft} variant="secondary">
              {draftedFiles.has(localActiveIndex) ? "Salvato in bozza" : "Salva in bozza"}
            </Button>
          ) : null}
          {metadatas.length > 1 && !modalReviewedFiles.has(localActiveIndex) ? (
            <Button
              disabled={draftedFiles.has(localActiveIndex)}
              icon={CheckCircle2}
              onClick={markActiveFileReviewed}
              variant="secondary"
            >
              Segna come revisionato
            </Button>
          ) : null}
          {metadatas.length > 1 && (modalReviewedFiles.size > 0 || draftedFiles.size > 0) ? (
            <span className="text-12px font-medium text-[var(--text-secondary)]">
              <span className="text-[var(--success-base)]">{modalReviewedFiles.size}</span>/
              {metadatas.length} revisionati{" "}
              <span className="text-[var(--warning-base)]">{draftedFiles.size}</span>/
              {metadatas.length} in bozza
            </span>
          ) : null}
        </div>
        <Button
          disabled={!canConfirm || isBusy}
          icon={CheckCircle2}
          onClick={confirmChanges}
          variant="primary"
        >
          {metadatas.length > 1
            ? modalReviewedFiles.size === metadatas.length
              ? `Conferma tutti (${metadatas.length})`
              : `Revisiona prima di confermare (${modalReviewedFiles.size}/${metadatas.length})`
            : "Conferma importazione"}
        </Button>
      </div>
    </div>
  );
}

export type TariffImportPreviewResult = TariffPdfMetadata & {
  importStatus: "active" | "draft";
  existingBookId?: string;
};

type ImportPreviewState = {
  editableVoicesList: DesktopTariffVoice[][];
  excludedFiles: Set<number>;
  draftedFiles: Set<number>;
  modalReviewedFiles: Set<number>;
  modalActiveIndex: number;
};

type ImportPreviewAction =
  | { type: "LOAD_DRAFT"; loadedDraft: ImportDraft | null; metadatas: TariffPdfMetadata[] }
  | {
      type: "UPDATE_VOICE";
      activeIndex: number;
      voiceIndex: number;
      field: keyof DesktopTariffVoice;
      value: string | number | null;
    }
  | { type: "APPLY_DRAFTS"; activeIndex: number; changes: ParsedDraftChange[] }
  | { type: "ADD_VOICE"; activeIndex: number; voice: DesktopTariffVoice }
  | { type: "DELETE_VOICE"; activeIndex: number; voiceIndex: number }
  | { type: "REMOVE_FILE"; removedIndex: number }
  | { type: "TOGGLE_DRAFT"; index: number }
  | { type: "SAVE_AS_DRAFT"; index: number }
  | { type: "MARK_REVIEWED"; index: number }
  | { type: "TOGGLE_REVIEWED"; index: number }
  | { type: "SWITCH_FILE"; index: number };

type ParsedDraftChange = {
  field: keyof DesktopTariffVoice;
  rowIndex: number;
  value: string | number | null;
};

function areSectionSummariesEqual(
  left: TariffGridSectionSummary[],
  right: TariffGridSectionSummary[],
) {
  return (
    left.length === right.length &&
    left.every((section, index) => {
      const nextSection = right[index];
      return (
        nextSection &&
        section.id === nextSection.id &&
        section.categoria === nextSection.categoria &&
        section.groupsCount === nextSection.groupsCount &&
        section.rowsCount === nextSection.rowsCount &&
        section.warningCount === nextSection.warningCount
      );
    })
  );
}

function importPreviewReducer(
  state: ImportPreviewState,
  action: ImportPreviewAction,
): ImportPreviewState {
  switch (action.type) {
    case "LOAD_DRAFT":
      return {
        editableVoicesList: action.loadedDraft?.metadatas
          ? action.loadedDraft.metadatas.map((m) => m.voices)
          : (action.loadedDraft?.editableVoicesList ?? action.metadatas.map((m) => m.voices)),
        excludedFiles: new Set(action.loadedDraft?.excludedFiles ?? []),
        draftedFiles: new Set(action.loadedDraft?.draftedFiles ?? []),
        modalReviewedFiles: new Set(
          action.loadedDraft?.reviewedFiles ?? (action.metadatas.length === 1 ? [0] : []),
        ),
        modalActiveIndex: 0,
      };
    case "APPLY_DRAFTS":
      if (action.changes.length === 0) return state;
      return {
        ...state,
        editableVoicesList: applyDraftChangesToVoicesList(
          state.editableVoicesList,
          action.activeIndex,
          action.changes,
        ),
      };
    case "UPDATE_VOICE":
      return {
        ...state,
        editableVoicesList: state.editableVoicesList.map((voices, i) =>
          i !== action.activeIndex
            ? voices
            : voices.map((voice, vi) =>
                vi !== action.voiceIndex ? voice : { ...voice, [action.field]: action.value },
              ),
        ),
      };
    case "ADD_VOICE":
      return {
        ...state,
        editableVoicesList: state.editableVoicesList.map((voices, i) =>
          i !== action.activeIndex ? voices : [...voices, action.voice],
        ),
      };
    case "DELETE_VOICE":
      return {
        ...state,
        editableVoicesList: state.editableVoicesList.map((voices, i) =>
          i !== action.activeIndex ? voices : voices.filter((_, vi) => vi !== action.voiceIndex),
        ),
      };
    case "REMOVE_FILE": {
      const adjustIndex = (set: Set<number>): Set<number> => {
        const next = new Set<number>();
        for (const idx of set) {
          if (idx < action.removedIndex) next.add(idx);
          if (idx > action.removedIndex) next.add(idx - 1);
        }
        return next;
      };
      return {
        ...state,
        editableVoicesList: state.editableVoicesList.filter((_, i) => i !== action.removedIndex),
        excludedFiles: adjustIndex(state.excludedFiles),
        draftedFiles: adjustIndex(state.draftedFiles),
        modalReviewedFiles: adjustIndex(state.modalReviewedFiles),
        modalActiveIndex: 0,
      };
    }
    case "TOGGLE_DRAFT": {
      const nextDrafted = new Set(state.draftedFiles);
      if (nextDrafted.has(action.index)) nextDrafted.delete(action.index);
      else nextDrafted.add(action.index);
      const nextReviewed = new Set(state.modalReviewedFiles);
      nextReviewed.delete(action.index);
      return { ...state, draftedFiles: nextDrafted, modalReviewedFiles: nextReviewed };
    }
    case "SAVE_AS_DRAFT": {
      const nextDrafted = new Set(state.draftedFiles);
      nextDrafted.add(action.index);
      const nextReviewed = new Set(state.modalReviewedFiles);
      nextReviewed.delete(action.index);
      return { ...state, draftedFiles: nextDrafted, modalReviewedFiles: nextReviewed };
    }
    case "MARK_REVIEWED": {
      const nextDrafted = new Set(state.draftedFiles);
      nextDrafted.delete(action.index);
      const nextReviewed = new Set(state.modalReviewedFiles);
      nextReviewed.add(action.index);
      return { ...state, draftedFiles: nextDrafted, modalReviewedFiles: nextReviewed };
    }
    case "TOGGLE_REVIEWED": {
      const nextDrafted = new Set(state.draftedFiles);
      if (nextDrafted.has(action.index)) nextDrafted.delete(action.index);
      const nextReviewed = new Set(state.modalReviewedFiles);
      if (nextReviewed.has(action.index)) nextReviewed.delete(action.index);
      else nextReviewed.add(action.index);
      return { ...state, draftedFiles: nextDrafted, modalReviewedFiles: nextReviewed };
    }
    case "SWITCH_FILE":
      return { ...state, modalActiveIndex: action.index };
    default:
      return state;
  }
}

function parseDraftChange(change: TariffGridDraftChange): ParsedDraftChange {
  return {
    field: change.field,
    rowIndex: change.rowIndex,
    value:
      change.field === "unitPrice"
        ? change.value.trim() === ""
          ? Number.NaN
          : parseEuroAmount(change.value)
        : change.field === "laborPercentage"
          ? change.value.trim() === ""
            ? null
            : parseOptionalPercent(change.value)
          : change.value,
  };
}

function applyDraftChangesToVoicesList(
  editableVoicesList: DesktopTariffVoice[][],
  activeIndex: number,
  changes: ParsedDraftChange[],
) {
  if (changes.length === 0) return editableVoicesList;

  return editableVoicesList.map((voices, index) => {
    if (index !== activeIndex) return voices;
    return voices.map((voice, voiceIndex) => {
      const voiceChanges = changes.filter((change) => change.rowIndex === voiceIndex);
      if (voiceChanges.length === 0) return voice;
      return voiceChanges.reduce(
        (nextVoice, change) => Object.assign(nextVoice, { [change.field]: change.value }),
        { ...voice },
      );
    });
  });
}

export function TariffImportPreviewModal({
  activeIndex = 0,
  existingBookIds,
  isBusy,
  metadatas,
  onCancel,
  onConfirm,
  onActiveIndexChange,
  onDraftedFilesChange,
  onMetadatasChange,
  onPageCanConfirmChange,
  onReviewedFilesChange,
  pageView = false,
}: {
  activeIndex?: number;
  existingBookIds?: (string | undefined)[];
  isBusy: boolean;
  metadatas: TariffPdfMetadata[];
  onCancel: () => void;
  onConfirm: (metadatas: TariffImportPreviewResult[]) => void;
  onActiveIndexChange?: (index: number) => void;
  onDraftedFilesChange?: (draftedFiles: Set<number>) => void;
  onMetadatasChange?: (metadatas: TariffPdfMetadata[]) => void;
  onPageCanConfirmChange?: (canConfirm: boolean) => void;
  onReviewedFilesChange?: (reviewedFiles: Set<number>) => void;
  pageView?: boolean;
}) {
  const { notify } = useToast();
  const onDraftedFilesChangeRef = useRef(onDraftedFilesChange);
  onDraftedFilesChangeRef.current = onDraftedFilesChange;
  const onReviewedFilesChangeRef = useRef(onReviewedFilesChange);
  onReviewedFilesChangeRef.current = onReviewedFilesChange;
  const onPageCanConfirmChangeRef = useRef(onPageCanConfirmChange);
  onPageCanConfirmChangeRef.current = onPageCanConfirmChange;
  const pageViewRef = useRef(pageView);
  pageViewRef.current = pageView;
  const confirmChangesRef = useRef<() => void>(() => {});
  const isEditingExistingTariff = existingBookIds?.some(Boolean) ?? false;
  const draftSignature = createDraftSignature(metadatas);
  const draftStorageKey = `quantara:tariff-import-preview:${draftSignature}`;
  const loadedDraft = useMemo(
    () =>
      isEditingExistingTariff
        ? null
        : loadImportDraft(draftStorageKey, draftSignature, metadatas.length),
    [draftSignature, draftStorageKey, isEditingExistingTariff, metadatas.length],
  );
  const [importState, dispatch] = useReducer(importPreviewReducer, undefined, () => ({
    editableVoicesList: loadedDraft?.metadatas
      ? loadedDraft.metadatas.map((metadata) => metadata.voices)
      : (loadedDraft?.editableVoicesList ?? metadatas.map((m) => m.voices)),
    excludedFiles: new Set(loadedDraft?.excludedFiles ?? []),
    draftedFiles: new Set(loadedDraft?.draftedFiles ?? []),
    modalReviewedFiles: new Set(loadedDraft?.reviewedFiles ?? (metadatas.length === 1 ? [0] : [])),
    modalActiveIndex: 0,
  }));
  const { editableVoicesList, excludedFiles, draftedFiles, modalReviewedFiles, modalActiveIndex } =
    importState;
  const [warningDetailVoice, setWarningDetailVoice] = useState<DesktopTariffVoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    code: string;
    description: string;
    index: number;
  } | null>(null);
  const [categorySections, setCategorySections] = useState<TariffGridSectionSummary[]>([]);
  const [gridScrollTarget, setGridScrollTarget] = useState<TariffGridScrollTarget | null>(null);
  const gridRef = useRef<EditableTariffVoicesGridHandle>(null);
  const updateCategorySections = useCallback((next: TariffGridSectionSummary[]) => {
    setCategorySections((current) => (areSectionSummariesEqual(current, next) ? current : next));
  }, []);
  const scrollToVoiceIdRef = useRef<string | null>(null);
  const [voiceAddedNonce, setVoiceAddedNonce] = useState(0);
  const localActiveIndex = pageView ? activeIndex : modalActiveIndex;
  const activeMetadata = metadatas[localActiveIndex];
  const activeVoices = editableVoicesList[localActiveIndex] ?? [];
  const regularVoices = useMemo(
    () => activeVoices.filter((v) => !isMaggiorazioneVoice(v)),
    [activeVoices],
  );
  const maggiorazioniVoices = useMemo(
    () => activeVoices.filter((v) => isMaggiorazioneVoice(v)),
    [activeVoices],
  );
  const validations = useMemo(
    () => metadatas.map((_, i) => getImportValidation(editableVoicesList[i] ?? [])),
    [metadatas, editableVoicesList],
  );
  const activeValidation = validations[localActiveIndex] ?? emptyImportValidation;
  const reviewSummary = useMemo(
    () => buildImportReviewSummary(metadatas, editableVoicesList, validations),
    [editableVoicesList, metadatas, validations],
  );
  const activeExtractionSummary = useMemo(
    () => buildExtractionSummary(activeMetadata, activeVoices),
    [activeMetadata, activeVoices],
  );
  const hasVoices = regularVoices.length > 0;
  const canConfirm =
    metadatas.length > 0 &&
    metadatas.every((_, i) => {
      const voices = editableVoicesList[i];
      const v = validations[i];
      const isDrafted = draftedFiles.has(i);
      return (
        voices &&
        voices.length > 0 &&
        v &&
        (isDrafted || (v.invalidCount === 0 && modalReviewedFiles.has(i)))
      );
    });
  const duplicateCodes = useMemo(
    () => new Set<string>(activeValidation.duplicateExamples),
    [activeValidation],
  );
  const editableGroups = useMemo(() => groupEditableTariffVoices(regularVoices), [regularVoices]);
  const regularIndexMap = useMemo(() => {
    const map = new Map<number, number>();
    let displayIndex = 0;
    activeVoices.forEach((v, i) => {
      if (!isMaggiorazioneVoice(v)) {
        map.set(displayIndex, i);
        displayIndex++;
      }
    });
    return map;
  }, [activeVoices]);

  const voicesWithWarnings = useMemo(
    () => activeVoices.filter((v) => (v.warnings?.length ?? 0) > 0),
    [activeVoices],
  );

  const invalidRows = useMemo(
    () =>
      activeValidation.invalidRows
        .concat(
          activeValidation.duplicateRows.map((r) => ({
            ...r,
            field: r.field as keyof DesktopTariffVoice,
          })),
        )
        .slice(0, 8),
    [activeValidation],
  );

  const updateVoice = useCallback(
    (displayIndex: number, field: keyof DesktopTariffVoice, value: string) => {
      const originalIndex = regularIndexMap.get(displayIndex) ?? displayIndex;
      dispatch({
        type: "UPDATE_VOICE",
        activeIndex: localActiveIndex,
        voiceIndex: originalIndex,
        field,
        value:
          field === "unitPrice"
            ? value.trim() === ""
              ? Number.NaN
              : parseEuroAmount(value)
            : field === "laborPercentage"
              ? value.trim() === ""
                ? null
                : parseOptionalPercent(value)
              : value,
      });
    },
    [localActiveIndex, regularIndexMap],
  );

  const flushGridDraftChanges = useCallback(() => {
    const parsedChanges = (gridRef.current?.drainDraftChanges() ?? []).map(parseDraftChange);
    if (parsedChanges.length > 0) {
      dispatch({ type: "APPLY_DRAFTS", activeIndex: localActiveIndex, changes: parsedChanges });
    }
    return applyDraftChangesToVoicesList(editableVoicesList, localActiveIndex, parsedChanges);
  }, [editableVoicesList, localActiveIndex]);

  const handleAddVoice = useCallback(() => {
    const now = Date.now();
    const voiceId = `voice_custom_${now}`;
    const bookId = existingBookIds?.[localActiveIndex] ?? `tariff_custom_${now}`;
    const newVoice: DesktopTariffVoice = {
      category: "",
      description: "",
      id: voiceId,
      laborPercentage: null,
      officialCode: `CUSTOM-${now}`,
      tariffBookId: bookId,
      unitOfMeasure: "",
      unitPrice: 0,
    };
    scrollToVoiceIdRef.current = voiceId;
    dispatch({ type: "ADD_VOICE", activeIndex: localActiveIndex, voice: newVoice });
    setVoiceAddedNonce((n) => n + 1);
  }, [localActiveIndex, existingBookIds]);

  // Scroll to newly added voice row
  // biome-ignore lint/correctness/useExhaustiveDependencies: voiceAddedNonce is a trigger that fires after ADD_VOICE dispatch sets scrollToVoiceIdRef
  useEffect(() => {
    const voiceId = scrollToVoiceIdRef.current;
    if (!voiceId) return;
    scrollToVoiceIdRef.current = null;

    const frameId = requestAnimationFrame(() => {
      const row = document.querySelector(`[data-voice-id="${voiceId}"]`);
      if (row) {
        row.scrollIntoView({ block: "center", behavior: "smooth" });
        const firstInput = row.querySelector("input, textarea");
        if (firstInput instanceof HTMLElement) firstInput.focus();
      }
    });
    return () => cancelAnimationFrame(frameId);
  }, [voiceAddedNonce]);

  const buildConfirmableMetadatas = useCallback(
    (nextEditableVoicesList: DesktopTariffVoice[][]) => {
      return metadatas.map((meta, i) => {
        const existingBookId = existingBookIds?.[i];
        return {
          ...meta,
          ...(existingBookId ? { existingBookId } : {}),
          importStatus: draftedFiles.has(i) ? ("draft" as const) : ("active" as const),
          voices: nextEditableVoicesList[i] ?? [],
        };
      });
    },
    [metadatas, existingBookIds, draftedFiles],
  );

  const confirmChanges = useCallback(() => {
    const nextEditableVoicesList = flushGridDraftChanges();
    deleteTariffImportDraft(draftStorageKey);
    onConfirm(buildConfirmableMetadatas(nextEditableVoicesList));
  }, [draftStorageKey, flushGridDraftChanges, onConfirm, buildConfirmableMetadatas]);
  confirmChangesRef.current = confirmChanges;

  const initialSyncRef = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — runs once on mount, subsequent changes handled by individual action handlers
  useEffect(() => {
    if (initialSyncRef.current) return;
    initialSyncRef.current = true;

    const newDrafted = new Set(loadedDraft?.draftedFiles ?? []);
    const newReviewed = new Set(loadedDraft?.reviewedFiles ?? (metadatas.length === 1 ? [0] : []));
    onDraftedFilesChangeRef.current?.(newDrafted);
    onReviewedFilesChangeRef.current?.(newReviewed);
  }, []);

  const saveDraft = useCallback(() => {
    const nextEditableVoicesList = flushGridDraftChanges();
    const draftMetadatas = metadatas.map((meta, i) => ({
      ...meta,
      voices: nextEditableVoicesList[i] ?? [],
    }));
    const draft = {
      draftedFiles: [...draftedFiles],
      editableVoicesList: nextEditableVoicesList,
      excludedFiles: [...excludedFiles],
      id: draftStorageKey,
      metadatas: draftMetadatas,
      name: createDraftName(draftMetadatas),
      reviewedFiles: [...modalReviewedFiles],
      savedAt: new Date().toISOString(),
      signature: draftSignature,
    };
    saveImportDraftRecord(draft);
    notify({
      message: "Bozza import salvata. La trovi nelle azioni rapide del catalogo tariffari.",
      tone: "success",
    });
  }, [
    draftedFiles,
    draftSignature,
    draftStorageKey,
    excludedFiles,
    flushGridDraftChanges,
    metadatas,
    modalReviewedFiles,
    notify,
  ]);

  const discardDraft = useCallback(() => {
    deleteTariffImportDraft(draftStorageKey);
    notify({ message: "Bozza import eliminata.", tone: "success" });
  }, [draftStorageKey, notify]);

  const switchFile = useCallback(
    (index: number) => {
      flushGridDraftChanges();
      onActiveIndexChange?.(index);
      startTransition(() => {
        setCategorySections([]);
        dispatch({ type: "SWITCH_FILE", index });
      });
    },
    [flushGridDraftChanges, onActiveIndexChange],
  );

  const removeActiveFile = useCallback(() => {
    flushGridDraftChanges();
    const nextMetadatas = metadatas.filter((_, index) => index !== localActiveIndex);
    if (nextMetadatas.length === 0) {
      onMetadatasChange?.([]);
      onCancel();
      return;
    }

    const adjustIndex = (set: Set<number>): Set<number> => {
      const next = new Set<number>();
      for (const idx of set) {
        if (idx < localActiveIndex) next.add(idx);
        if (idx > localActiveIndex) next.add(idx - 1);
      }
      return next;
    };

    dispatch({ type: "REMOVE_FILE", removedIndex: localActiveIndex });
    onDraftedFilesChangeRef.current?.(adjustIndex(draftedFiles));
    onReviewedFilesChangeRef.current?.(adjustIndex(modalReviewedFiles));
    onMetadatasChange?.(nextMetadatas);
    switchFile(Math.min(localActiveIndex, nextMetadatas.length - 1));
    notify({ message: "File rimosso dalla revisione import.", tone: "success" });
  }, [
    localActiveIndex,
    metadatas,
    draftedFiles,
    modalReviewedFiles,
    notify,
    onCancel,
    onMetadatasChange,
    flushGridDraftChanges,
    switchFile,
  ]);

  const toggleActiveFileDraft = useCallback(() => {
    flushGridDraftChanges();
    const nextDrafted = new Set(draftedFiles);
    if (nextDrafted.has(localActiveIndex)) nextDrafted.delete(localActiveIndex);
    else nextDrafted.add(localActiveIndex);
    const nextReviewed = new Set(modalReviewedFiles);
    nextReviewed.delete(localActiveIndex);

    dispatch({ type: "TOGGLE_DRAFT", index: localActiveIndex });
    onDraftedFilesChangeRef.current?.(nextDrafted);
    onReviewedFilesChangeRef.current?.(nextReviewed);
  }, [localActiveIndex, draftedFiles, modalReviewedFiles, flushGridDraftChanges]);

  const saveActiveFileAsDraft = useCallback(() => {
    const nextEditableVoicesList = flushGridDraftChanges();
    const nextDraftedFiles = new Set(draftedFiles);
    nextDraftedFiles.add(localActiveIndex);
    const nextReviewed = new Set(modalReviewedFiles);
    nextReviewed.delete(localActiveIndex);

    dispatch({ type: "SAVE_AS_DRAFT", index: localActiveIndex });
    onDraftedFilesChangeRef.current?.(nextDraftedFiles);
    onReviewedFilesChangeRef.current?.(nextReviewed);

    const draftMetadatas = metadatas.map((meta, i) => ({
      ...meta,
      voices: nextEditableVoicesList[i] ?? [],
    }));
    saveImportDraftRecord({
      draftedFiles: [...nextDraftedFiles],
      editableVoicesList: nextEditableVoicesList,
      excludedFiles: [...excludedFiles],
      id: draftStorageKey,
      metadatas: draftMetadatas,
      name: createDraftName(draftMetadatas),
      reviewedFiles: [...nextReviewed],
      savedAt: new Date().toISOString(),
      signature: draftSignature,
    });
    notify({
      message: `${activeMetadata?.name ?? "File"} salvato come bozza import.`,
      tone: "success",
    });
  }, [
    activeMetadata?.name,
    draftedFiles,
    draftSignature,
    draftStorageKey,
    excludedFiles,
    flushGridDraftChanges,
    localActiveIndex,
    metadatas,
    modalReviewedFiles,
    notify,
  ]);

  const markActiveFileReviewed = useCallback(() => {
    flushGridDraftChanges();
    const nextDrafted = new Set(draftedFiles);
    nextDrafted.delete(localActiveIndex);
    const nextReviewed = new Set(modalReviewedFiles);
    nextReviewed.add(localActiveIndex);

    dispatch({ type: "MARK_REVIEWED", index: localActiveIndex });
    onDraftedFilesChangeRef.current?.(nextDrafted);
    onReviewedFilesChangeRef.current?.(nextReviewed);
  }, [localActiveIndex, draftedFiles, modalReviewedFiles, flushGridDraftChanges]);

  const toggleActiveFileReviewed = useCallback(() => {
    flushGridDraftChanges();
    const nextDrafted = new Set(draftedFiles);
    if (nextDrafted.has(localActiveIndex)) nextDrafted.delete(localActiveIndex);
    const nextReviewed = new Set(modalReviewedFiles);
    if (nextReviewed.has(localActiveIndex)) nextReviewed.delete(localActiveIndex);
    else nextReviewed.add(localActiveIndex);

    dispatch({ type: "TOGGLE_REVIEWED", index: localActiveIndex });
    onDraftedFilesChangeRef.current?.(nextDrafted);
    onReviewedFilesChangeRef.current?.(nextReviewed);
  }, [localActiveIndex, draftedFiles, modalReviewedFiles, flushGridDraftChanges]);

  const askDeleteVoice = useCallback(
    (displayIndex: number) => {
      const originalIndex = regularIndexMap.get(displayIndex) ?? displayIndex;
      const voice = activeVoices[originalIndex];
      if (!voice) return;
      setDeleteTarget({
        code: voice.officialCode || `Riga ${displayIndex + 1}`,
        description: voice.description,
        index: originalIndex,
      });
    },
    [activeVoices, regularIndexMap],
  );

  const confirmDeleteVoice = useCallback(() => {
    if (!deleteTarget) return;
    dispatch({
      type: "DELETE_VOICE",
      activeIndex: localActiveIndex,
      voiceIndex: deleteTarget.index,
    });
    notify({
      message: `${deleteTarget.code} eliminata dalla preview.`,
      tone: "success",
    });
    setDeleteTarget(null);
  }, [deleteTarget, localActiveIndex, notify]);

  useEffect(() => {
    onPageCanConfirmChangeRef.current?.(canConfirm);
  }, [canConfirm]);

  useEffect(() => {
    const handleToolbarAction = (event: Event) => {
      const actionId = (event as CustomEvent<string>).detail;
      if (actionId === "tariff-import-confirm" && pageViewRef.current) {
        confirmChangesRef.current?.();
      } else if (actionId === "tariff-import-save-draft") {
        saveActiveFileAsDraft();
      } else if (actionId === "tariff-import-toggle-reviewed") {
        toggleActiveFileReviewed();
      } else if (actionId === "tariff-import-delete-file") {
        removeActiveFile();
      }
    };

    window.addEventListener("tariff-preview-action", handleToolbarAction);
    return () => window.removeEventListener("tariff-preview-action", handleToolbarAction);
  }, [removeActiveFile, saveActiveFileAsDraft, toggleActiveFileReviewed]);

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if (deleteTarget) return;

      const key = event.key.toLowerCase();
      const mod = event.ctrlKey || event.metaKey;
      const isImportShortcut =
        (mod && key === "enter") ||
        (mod &&
          event.shiftKey &&
          !event.altKey &&
          (key === "arrowleft" ||
            key === "arrowright" ||
            key === "r" ||
            key === "b" ||
            key === "backspace" ||
            key === "delete"));

      if (!isImportShortcut) return;

      if (mod && key === "enter" && canConfirm && !isBusy) {
        event.preventDefault();
        event.stopPropagation();
        confirmChanges();
        return;
      }

      if (mod && event.shiftKey && !event.altKey) {
        if (key === "arrowleft" && localActiveIndex > 0) {
          event.preventDefault();
          event.stopPropagation();
          switchFile(localActiveIndex - 1);
          return;
        }

        if (key === "arrowright" && localActiveIndex < metadatas.length - 1) {
          event.preventDefault();
          event.stopPropagation();
          switchFile(localActiveIndex + 1);
          return;
        }

        if (key === "r") {
          event.preventDefault();
          event.stopPropagation();
          markActiveFileReviewed();
          return;
        }

        if (key === "b") {
          event.preventDefault();
          event.stopPropagation();
          toggleActiveFileDraft();
          return;
        }

        if (key === "backspace" || key === "delete") {
          event.preventDefault();
          event.stopPropagation();
          removeActiveFile();
        }
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyboardShortcut, { capture: true });
  }, [
    canConfirm,
    confirmChanges,
    deleteTarget,
    isBusy,
    localActiveIndex,
    markActiveFileReviewed,
    metadatas.length,
    removeActiveFile,
    switchFile,
    toggleActiveFileDraft,
  ]);

  function focusImportCell(rowIndex: number, field: string) {
    setGridScrollTarget({
      field: field as keyof DesktopTariffVoice,
      nonce: Date.now(),
      rowIndex,
      type: "cell",
    });
  }

  function focusImportCategory(categoryId: string) {
    setGridScrollTarget({
      categoryId,
      nonce: Date.now(),
      type: "category",
    });
  }

  const deleteDialog = deleteTarget ? (
    <DeleteVoiceDialog
      code={deleteTarget.code}
      description={deleteTarget.description}
      onCancel={() => setDeleteTarget(null)}
      onConfirm={confirmDeleteVoice}
    />
  ) : null;

  return pageView ? (
    <>
      <div className="flex w-full flex-col gap-5 pb-28 xl:pb-0 xl:pr-[410px]">
        <ImportWorkspaceHeader
          maggiorazioniCount={maggiorazioniVoices.length}
          metadata={activeMetadata}
          regularCount={regularVoices.length}
          summary={activeExtractionSummary}
        />
        <ExtractionAuditStrip summary={activeExtractionSummary} />
        <div className="min-w-0">
          {maggiorazioniVoices.length > 0 ? (
            <MaggiorazioniPanel
              maggiorazioni={maggiorazioniVoices}
              onShowWarningDetail={setWarningDetailVoice}
            />
          ) : null}
          <VoicesPanel
            activeValidation={activeValidation}
            askDeleteVoice={askDeleteVoice}
            duplicateCodes={duplicateCodes}
            editableGroups={editableGroups}
            gridRef={gridRef}
            gridScrollTarget={gridScrollTarget}
            handleAddVoice={handleAddVoice}
            hasVoices={hasVoices}
            updateCategorySections={updateCategorySections}
            updateVoice={updateVoice}
          />
        </div>
      </div>
      <TariffImportReviewInspector
        globalReviewSummary={reviewSummary}
        extractionSummary={activeExtractionSummary}
        invalidRows={invalidRows}
        onFocusCategory={focusImportCategory}
        onFocusCell={focusImportCell}
        onShowWarningDetail={setWarningDetailVoice}
        sections={categorySections}
        variant="page"
        voicesWithWarnings={voicesWithWarnings}
      />
      {deleteDialog}
      {warningDetailVoice ? (
        <WarningDetailModal
          voice={warningDetailVoice}
          onClose={() => setWarningDetailVoice(null)}
        />
      ) : null}
    </>
  ) : (
    <div className="fixed inset-0 z-[var(--z-dialog)] flex items-center justify-center bg-[var(--overlay-bg)] px-4 backdrop-blur-sm">
      <m.button
        aria-label="Chiudi"
        className="absolute inset-0 cursor-default"
        onClick={onCancel}
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <m.div
        className="relative flex max-h-[92vh] w-full max-w-[min(1480px,calc(100vw-2rem))] flex-col overflow-hidden rounded-4xl bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex min-h-0 flex-col rounded-22px bg-[var(--surface-base)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
            <div className="min-w-0">
              <div className="text-10px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
                Preview importazione
              </div>
              <h3 className="mt-2 text-24px font-semibold leading-1_05 tracking-neg-0_035em text-[var(--text-primary)] md:text-30px">
                {metadatas.length > 1
                  ? `${metadatas.length} tariffari da importare`
                  : (activeMetadata?.name ?? "Preview importazione")}
              </h3>
              <p className="mt-1 text-13px font-medium text-[var(--text-secondary)]">
                Controlla i dati estratti prima di confermarli nel catalogo.
              </p>
            </div>
          </div>

          {metadatas.length > 1 ? (
            <FileTabs
              draftedFiles={draftedFiles}
              editableVoicesList={editableVoicesList}
              localActiveIndex={localActiveIndex}
              metadatas={metadatas}
              modalReviewedFiles={modalReviewedFiles}
              switchFile={switchFile}
              validations={validations}
            />
          ) : null}

          <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-h-0 overflow-y-auto p-5" data-tariff-preview-scroll>
              <ImportWorkspaceHeader
                maggiorazioniCount={maggiorazioniVoices.length}
                metadata={activeMetadata}
                regularCount={regularVoices.length}
                summary={activeExtractionSummary}
              />
              <div className="mt-3">
                <ExtractionAuditStrip summary={activeExtractionSummary} />
              </div>
              <div className="mt-4 min-w-0">
                {maggiorazioniVoices.length > 0 ? (
                  <MaggiorazioniPanel
                    maggiorazioni={maggiorazioniVoices}
                    onShowWarningDetail={setWarningDetailVoice}
                  />
                ) : null}
                <VoicesPanel
                  activeValidation={activeValidation}
                  askDeleteVoice={askDeleteVoice}
                  duplicateCodes={duplicateCodes}
                  editableGroups={editableGroups}
                  gridRef={gridRef}
                  gridScrollTarget={gridScrollTarget}
                  handleAddVoice={handleAddVoice}
                  hasVoices={hasVoices}
                  updateCategorySections={updateCategorySections}
                  updateVoice={updateVoice}
                />
              </div>
            </div>
            <TariffImportReviewInspector
              globalReviewSummary={reviewSummary}
              extractionSummary={activeExtractionSummary}
              invalidRows={invalidRows}
              onFocusCategory={focusImportCategory}
              onFocusCell={focusImportCell}
              onShowWarningDetail={setWarningDetailVoice}
              sections={categorySections}
              variant="modal"
              voicesWithWarnings={voicesWithWarnings}
            />
          </div>
          {warningDetailVoice ? (
            <WarningDetailModal
              voice={warningDetailVoice}
              onClose={() => setWarningDetailVoice(null)}
            />
          ) : null}

          <ModalFooter
            canConfirm={canConfirm}
            confirmChanges={confirmChanges}
            discardDraft={discardDraft}
            draftedFiles={draftedFiles}
            isBusy={isBusy}
            loadedDraft={loadedDraft}
            localActiveIndex={localActiveIndex}
            markActiveFileReviewed={markActiveFileReviewed}
            metadatas={metadatas}
            modalReviewedFiles={modalReviewedFiles}
            onCancel={onCancel}
            removeActiveFile={removeActiveFile}
            saveDraft={saveDraft}
            toggleActiveFileDraft={toggleActiveFileDraft}
          />
        </div>
      </m.div>
      {deleteDialog}
    </div>
  );
}

function TariffImportReviewInspector({
  extractionSummary,
  globalReviewSummary,
  invalidRows,
  onFocusCategory,
  onFocusCell,
  onShowWarningDetail,
  sections,
  variant,
  voicesWithWarnings,
}: {
  extractionSummary: ExtractionSummary;
  globalReviewSummary: ImportReviewSummary;
  invalidRows: Array<{ field: keyof DesktopTariffVoice; index: number; label: string }>;
  onFocusCategory: (categoryId: string) => void;
  onFocusCell: (rowIndex: number, field: string) => void;
  onShowWarningDetail: ((voice: DesktopTariffVoice) => void) | undefined;
  sections: TariffGridSectionSummary[];
  variant: "modal" | "page";
  voicesWithWarnings: DesktopTariffVoice[];
}) {
  const [activeTab, setActiveTab] = useState<InspectorTab>("checks");
  const issueCount = globalReviewSummary.issueCount;

  const body = (
    <InspectorContent
      activeTab={activeTab}
      extractionSummary={extractionSummary}
      globalReviewSummary={globalReviewSummary}
      invalidRows={invalidRows}
      issueCount={issueCount}
      onFocusCategory={onFocusCategory}
      onFocusCell={onFocusCell}
      onShowWarningDetail={onShowWarningDetail}
      onTabChange={setActiveTab}
      sections={sections}
      voicesWithWarnings={voicesWithWarnings}
    />
  );

  if (variant === "page") {
    return (
      <aside className="fixed inset-x-3 bottom-3 z-20 xl:inset-x-auto xl:bottom-4 xl:left-auto xl:right-6 xl:top-28 xl:w-[380px]">
        <div className="max-h-[68dvh] overflow-y-auto rounded-22px xl:max-h-[calc(100dvh-6rem-1rem)]">
          {body}
        </div>
      </aside>
    );
  }

  if (variant === "modal") {
    return (
      <aside className="min-h-0 overflow-y-auto border-t border-[var(--border-subtle)]/70 bg-[color-mix(in_srgb,var(--surface-base)_82%,var(--bg-muted)_18%)] p-4 xl:border-l xl:border-t-0">
        {body}
      </aside>
    );
  }
}

function InspectorContent({
  activeTab,
  extractionSummary,
  globalReviewSummary,
  invalidRows,
  issueCount,
  onFocusCategory,
  onFocusCell,
  onShowWarningDetail,
  onTabChange,
  sections,
  voicesWithWarnings,
}: {
  activeTab: InspectorTab;
  extractionSummary: ExtractionSummary;
  globalReviewSummary: ImportReviewSummary;
  invalidRows: Array<{ field: keyof DesktopTariffVoice; index: number; label: string }>;
  issueCount: number;
  onFocusCategory: (categoryId: string) => void;
  onFocusCell: (rowIndex: number, field: string) => void;
  onShowWarningDetail: ((voice: DesktopTariffVoice) => void) | undefined;
  onTabChange: (tab: InspectorTab) => void;
  sections: TariffGridSectionSummary[];
  voicesWithWarnings: DesktopTariffVoice[];
}) {
  return (
    <div className="rounded-22px bg-[color-mix(in_srgb,var(--surface-base)_78%,var(--bg-muted)_22%)] p-1 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_54%,transparent)] shadow-[0_18px_44px_color-mix(in_srgb,var(--text-primary)_10%,transparent)]">
      <div className="rounded-18px bg-[var(--surface-base)] p-3">
        <InspectorHeader
          completionPercent={globalReviewSummary.completionPercent}
          isReviewReady={globalReviewSummary.isReviewReady}
          issueCount={issueCount}
        />
        <InspectorTabs
          activeTab={activeTab}
          issueCount={issueCount}
          onTabChange={onTabChange}
          sectionsCount={sections.length}
        />
        <div className="mt-3">
          <ImportShortcutLegend compact />
        </div>
        <div className="mt-3 text-12px font-semibold text-[var(--text-primary)]">
          {activeTab === "checks"
            ? "Stato import e controlli"
            : activeTab === "categories"
              ? "Indice categorie e voci"
              : activeTab === "issues"
                ? "Errori e anomalie da risolvere"
                : "Avvertenze del parser"}
        </div>
        <div className="mt-3">
          {activeTab === "checks" ? (
            <ControlPanel
              extractionSummary={extractionSummary}
              globalReviewSummary={globalReviewSummary}
              compact
            />
          ) : null}
          {activeTab === "categories" ? (
            <CategoryJumpPanel onFocusCategory={onFocusCategory} sections={sections} compact />
          ) : null}
          {activeTab === "issues" ? (
            <InterventionPanel
              globalReviewSummary={globalReviewSummary}
              invalidRows={invalidRows}
              onFocusCell={onFocusCell}
              compact
            />
          ) : null}
          {activeTab === "warnings" ? (
            <WarningsPanel
              onShowWarningDetail={onShowWarningDetail}
              voicesWithWarnings={voicesWithWarnings}
              compact
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InspectorHeader({
  completionPercent,
  isReviewReady,
  issueCount,
}: {
  completionPercent: number;
  isReviewReady: boolean;
  issueCount: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-10px font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
          Revisione import
        </div>
        <div className="mt-1 truncate text-14px font-bold text-[var(--text-primary)]">
          {isReviewReady ? "Import pronto" : `${issueCount.toLocaleString("it-IT")} interventi`}
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-11px font-bold",
          isReviewReady
            ? "bg-[var(--success-base)] text-[var(--text-inverse)]"
            : "bg-[var(--warning-base)] text-[var(--text-inverse)]",
        )}
      >
        {completionPercent}%
      </span>
    </div>
  );
}

function InspectorTabs({
  activeTab,
  issueCount,
  onTabChange,
  sectionsCount,
}: {
  activeTab: InspectorTab;
  issueCount: number;
  onTabChange: (tab: InspectorTab) => void;
  sectionsCount: number;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-14px border border-[var(--border-subtle)]/70 bg-[var(--bg-muted-strong)]/70 p-1.5">
      <InspectorTabButton
        active={activeTab === "checks"}
        count={undefined}
        icon={ListChecks}
        label="Stato"
        onClick={() => onTabChange("checks")}
      />
      <InspectorTabButton
        active={activeTab === "categories"}
        count={sectionsCount}
        icon={List}
        label="Indice"
        onClick={() => onTabChange("categories")}
      />
      <InspectorTabButton
        active={activeTab === "issues"}
        count={issueCount}
        icon={AlertTriangle}
        label="Errori"
        onClick={() => onTabChange("issues")}
      />
      <InspectorTabButton
        active={activeTab === "warnings"}
        count={undefined}
        icon={AlertTriangle}
        label="Avvertenze"
        onClick={() => onTabChange("warnings")}
      />
    </div>
  );
}

function InspectorTabButton({
  active,
  count,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  count: number | undefined;
  icon: typeof ListChecks;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-11px px-2 text-12px font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
        active
          ? "bg-[var(--accent-primary)] text-[var(--text-inverse)] shadow-sm"
          : "bg-[var(--surface-base)]/58 text-[var(--text-primary)] hover:bg-[var(--surface-base)]",
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{label}</span>
      {typeof count === "number" ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-10px tabular-nums",
            active
              ? "bg-[var(--text-inverse)]/20 text-[var(--text-inverse)]"
              : "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
          )}
        >
          {count.toLocaleString("it-IT")}
        </span>
      ) : null}
    </button>
  );
}

function CategoryJumpPanel({
  compact = false,
  onFocusCategory,
  sections,
}: {
  compact?: boolean;
  onFocusCategory: (categoryId: string) => void;
  sections: TariffGridSectionSummary[];
}) {
  if (sections.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-18px bg-[var(--surface-base)] p-3 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_58%,transparent)]",
        !compact && "shadow-[0_16px_36px_color-mix(in_srgb,var(--text-primary)_10%,transparent)]",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="text-10px font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
          Indice categorie
        </div>
        <span className="text-11px font-semibold text-[var(--text-secondary)]">
          {sections.length}
        </span>
      </div>
      <div className={cn("space-y-1 overflow-y-auto pr-1", compact ? "max-h-[34dvh]" : "max-h-56")}>
        {sections.map((section) => (
          <button
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-[var(--bg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
            key={section.id}
            onClick={() => onFocusCategory(section.id)}
            type="button"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-11px font-bold text-[var(--accent-primary)]">
              {section.categoria || "-"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-12px font-bold text-[var(--text-primary)]">
                Categoria {section.categoria || "Altre"}
              </span>
              <span className="block text-11px font-medium text-[var(--text-secondary)]">
                {section.groupsCount} gruppi · {section.rowsCount.toLocaleString("it-IT")} righe
              </span>
            </span>
            <ChevronRight className="size-3.5 text-[var(--text-secondary)]" />
          </button>
        ))}
      </div>
    </div>
  );
}

function InterventionPanel({
  compact = false,
  globalReviewSummary,
  invalidRows,
  onFocusCell,
}: {
  compact?: boolean;
  globalReviewSummary: ImportReviewSummary;
  invalidRows: Array<{ field: keyof DesktopTariffVoice; index: number; label: string }>;
  onFocusCell: (rowIndex: number, field: string) => void;
}) {
  const hasBlockingIssues =
    !globalReviewSummary.hasVoices ||
    globalReviewSummary.validation.invalidCount > 0 ||
    globalReviewSummary.validation.duplicateCount > 0 ||
    globalReviewSummary.issueCount > globalReviewSummary.blockingIssueCount;

  return (
    <div
      className={cn(
        "rounded-18px p-4 text-12px font-medium leading-5 ring-1",
        !compact && "shadow-[0_16px_36px_color-mix(in_srgb,var(--text-primary)_10%,transparent)]",
        hasBlockingIssues
          ? "bg-[var(--warning-soft)] text-[var(--warning-base)] ring-[var(--warning-base)]/15"
          : "bg-[var(--success-soft)] text-[var(--success-base)] ring-[var(--success-base)]/15",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 font-bold">
          {hasBlockingIssues ? (
            <AlertTriangle className="size-4 shrink-0" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0" />
          )}
          Gestione anomalie
        </div>
        <span className="rounded-full bg-[var(--surface-base)]/70 px-2 py-0.5 text-11px font-bold tabular-nums">
          {globalReviewSummary.validation.warningCount}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <IssueLine
          count={globalReviewSummary.filesWithoutVoices}
          label="File senza voci importabili"
          ok={globalReviewSummary.hasVoices}
        />
        <IssueLine
          count={globalReviewSummary.warningRows}
          label="Righe con warning parser"
          ok={globalReviewSummary.warningRows === 0}
        />
        <IssueLine
          count={globalReviewSummary.validation.invalidCount}
          label="Righe con dati mancanti"
          ok={globalReviewSummary.validation.invalidCount === 0}
        />
        <IssueLine
          count={globalReviewSummary.validation.duplicateCount}
          label="Codici duplicati"
          ok={globalReviewSummary.validation.duplicateCount === 0}
        />
        <IssueLine
          count={globalReviewSummary.sourceIssues}
          label="Ente da confermare"
          ok={globalReviewSummary.sourceIssues === 0}
        />
        <IssueLine
          count={globalReviewSummary.yearIssues}
          label="Anno non coerente"
          ok={globalReviewSummary.yearIssues === 0}
        />
      </div>

      {globalReviewSummary.validation.duplicateExamples.length > 0 ? (
        <div className="mt-3 rounded-lg bg-[var(--surface-base)]/65 px-3 py-2">
          <div className="text-10px font-bold uppercase tracking-caption opacity-75">
            Duplicati principali
          </div>
          <div className="mt-1 font-bold">
            {globalReviewSummary.validation.duplicateExamples.join(", ")}
          </div>
        </div>
      ) : null}

      {invalidRows.length > 0 ? (
        <div className="mt-3">
          <div className="mb-2 text-10px font-bold uppercase tracking-caption opacity-75">
            Vai alla correzione
          </div>
          <div className="flex flex-wrap gap-2">
            {invalidRows.map((row) => (
              <m.button
                className="rounded-full bg-[var(--warning-base)]/15 px-3 py-1 text-11px font-bold transition-colors hover:bg-[var(--warning-base)]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
                key={`${row.index}-${row.field}`}
                onClick={() => onFocusCell(row.index, row.field)}
                type="button"
              >
                Riga {row.index + 1}: {row.label}
              </m.button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IssueLine({ count, label, ok }: { count: number; label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--surface-base)]/55 px-3 py-2">
      <span className="flex min-w-0 items-center gap-2">
        {ok ? (
          <CheckCircle2 className="size-3.5 shrink-0" />
        ) : (
          <AlertTriangle className="size-3.5 shrink-0" />
        )}
        <span className="truncate">{label}</span>
      </span>
      <span className="font-bold tabular-nums">{count.toLocaleString("it-IT")}</span>
    </div>
  );
}

function ControlPanel({
  compact = false,
  extractionSummary,
  globalReviewSummary,
}: {
  compact?: boolean;
  extractionSummary: ExtractionSummary;
  globalReviewSummary: ImportReviewSummary;
}) {
  const confidencePercent =
    extractionSummary.averageConfidence == null
      ? null
      : Math.round(extractionSummary.averageConfidence * 100);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-18px bg-[var(--surface-base)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_58%,transparent)]",
        !compact && "shadow-[0_16px_36px_color-mix(in_srgb,var(--text-primary)_10%,transparent)]",
      )}
    >
      <div
        className={cn(
          "border-b p-4",
          globalReviewSummary.isReviewReady
            ? "border-[var(--success-base)]/15 bg-[var(--surface-base)]"
            : "border-[var(--warning-base)]/15 bg-[var(--surface-base)]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-10px font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
              <ListChecks className="size-3.5" />
              Centro controllo
            </div>
            <div className="mt-2 text-15px font-bold leading-tight text-[var(--text-primary)]">
              {globalReviewSummary.isReviewReady ? "Import pronto" : "Verifiche richieste"}
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-11px font-bold",
              globalReviewSummary.isReviewReady
                ? "bg-[var(--success-base)] text-[var(--text-inverse)]"
                : "bg-[var(--warning-base)] text-[var(--text-inverse)]",
            )}
          >
            {globalReviewSummary.completionPercent}%
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--bg-muted-strong)]">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-[var(--duration-base)]",
              globalReviewSummary.isReviewReady
                ? "bg-[var(--success-base)]"
                : "bg-[var(--warning-base)]",
            )}
            style={{ width: `${globalReviewSummary.completionPercent}%` }}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)]/70 border-b border-[var(--border-subtle)]/70">
        <ControlStat
          label="Valide"
          tone="success"
          value={globalReviewSummary.validation.validCount}
        />
        <ControlStat
          label="Warning"
          tone="warning"
          value={globalReviewSummary.validation.warningCount}
        />
        <ControlStat
          label="Blocchi"
          tone={globalReviewSummary.blockingIssueCount > 0 ? "warning" : "neutral"}
          value={globalReviewSummary.blockingIssueCount}
        />
      </div>
      <div className="space-y-4 p-4">
        <div className="space-y-2 text-12px font-medium text-[var(--text-secondary)]">
          <ValidationLine ok={globalReviewSummary.hasVoices} text="Voci prezzo rilevate" />
          <ValidationLine
            ok={globalReviewSummary.validation.invalidCount === 0}
            text={`${globalReviewSummary.validation.invalidCount.toLocaleString("it-IT")} voci con dati mancanti`}
          />
          <ValidationLine
            ok={globalReviewSummary.validation.duplicateCount === 0}
            text={`${globalReviewSummary.validation.duplicateCount.toLocaleString("it-IT")} codici duplicati`}
          />
          <ValidationLine ok={globalReviewSummary.sourceIssues === 0} text="Ente riconosciuto" />
          <ValidationLine ok={globalReviewSummary.yearIssues === 0} text="Anno coerente" />
          <ValidationLine
            ok={extractionSummary.lowConfidenceRows === 0}
            text={`${extractionSummary.lowConfidenceRows.toLocaleString("it-IT")} righe sotto soglia confidenza`}
          />
          <ValidationLine
            ok={extractionSummary.parserIssues === 0}
            text={`${extractionSummary.parserIssues.toLocaleString("it-IT")} issue audit parser`}
          />
          <ValidationLine
            ok={confidencePercent == null || confidencePercent >= 85}
            text={`Confidenza media ${confidencePercent == null ? "-" : `${confidencePercent}%`}`}
          />
        </div>
      </div>
    </div>
  );
}

function DeleteVoiceDialog({
  code,
  description,
  onCancel,
  onConfirm,
}: {
  code: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog className="max-w-md" isOpen onClose={onCancel} zIndex={120}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning-base)]">
          <Trash2 className="size-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-18px font-semibold leading-tight text-[var(--text-primary)]">
            Eliminare questa voce?
          </h3>
          <p className="mt-2 text-13px font-medium leading-5 text-[var(--text-secondary)]">
            {code}
            {description ? ` - ${description}` : ""}
          </p>
        </div>
      </div>
      <DialogActions className="gap-2">
        <Button onClick={onCancel} variant="outline">
          Annulla
        </Button>
        <Button icon={Trash2} onClick={onConfirm} variant="secondary">
          Elimina
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ControlStat({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "neutral" | "success" | "warning";
  value: number;
}) {
  return (
    <div className="p-3">
      <div className="text-9px font-bold uppercase tracking-caption text-[var(--text-secondary)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-18px font-bold leading-none tabular-nums",
          tone === "success" && "text-[var(--success-base)]",
          tone === "warning" && "text-[var(--warning-base)]",
          tone === "neutral" && "text-[var(--text-primary)]",
        )}
      >
        {value.toLocaleString("it-IT")}
      </div>
    </div>
  );
}

function WarningsPanel({
  compact = false,
  onShowWarningDetail,
  voicesWithWarnings,
}: {
  compact?: boolean;
  onShowWarningDetail: ((voice: DesktopTariffVoice) => void) | undefined;
  voicesWithWarnings: DesktopTariffVoice[];
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-18px bg-[var(--surface-base)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_58%,transparent)]",
        !compact && "shadow-[0_16px_36px_color-mix(in_srgb,var(--text-primary)_10%,transparent)]",
      )}
    >
      <div className="border-b border-[var(--border-subtle)]/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-10px font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
            Avvertenze parser
          </div>
          <span className="rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-11px font-bold text-[var(--warning-base)]">
            {voicesWithWarnings.length}
          </span>
        </div>
      </div>
      <div className={cn("space-y-1 overflow-y-auto p-2", compact ? "max-h-[34dvh]" : "max-h-56")}>
        {voicesWithWarnings.length === 0 ? (
          <div className="px-2 py-6 text-center text-12px font-medium text-[var(--text-secondary)]">
            Nessuna avvertenza
          </div>
        ) : (
          voicesWithWarnings.map((voice) => (
            <button
              className="flex w-full items-start gap-2 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-[var(--bg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
              key={voice.id}
              onClick={() => onShowWarningDetail?.(voice)}
              type="button"
            >
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[var(--warning-base)]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-12px font-bold text-[var(--text-primary)]">
                  {voice.officialCode}
                </span>
                <span className="mt-0.5 block text-11px font-medium leading-4 text-[var(--text-secondary)]">
                  {voice.warnings?.length} avvertenza{voice.warnings?.length !== 1 ? "e" : ""}
                </span>
              </span>
              <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-[var(--text-secondary)]" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function WarningDetailModal({
  voice,
  onClose,
}: {
  voice: DesktopTariffVoice;
  onClose: () => void;
}) {
  return (
    <Dialog className="max-w-lg" isOpen onClose={onClose} zIndex={120}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning-base)]">
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-18px font-semibold leading-tight text-[var(--text-primary)]">
              Avvertenze
            </h3>
            <p className="mt-1 text-13px font-medium text-[var(--text-accent)]">
              {voice.officialCode}
            </p>
            {voice.description ? (
              <p className="mt-0.5 text-12px font-medium text-[var(--text-secondary)]">
                {voice.description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="max-h-56 space-y-3 overflow-y-auto">
          {voice.warnings?.map((w) => (
            <div
              className="rounded-14px border border-[var(--border-subtle)] bg-[var(--surface-base)] p-3"
              key={w.id}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-10px font-bold text-[var(--warning-base)]">
                  #{w.id || "?"}
                </span>
                {w.type ? (
                  <span className="rounded-full bg-[var(--bg-muted)] px-2 py-0.5 text-10px font-bold text-[var(--text-secondary)]">
                    {formatAuditLabel(w.type)}
                  </span>
                ) : null}
                {typeof w.confidence === "number" ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-10px font-bold",
                      w.confidence >= 0.85
                        ? "bg-[var(--success-soft)] text-[var(--success-base)]"
                        : "bg-[var(--warning-soft)] text-[var(--warning-base)]",
                    )}
                  >
                    {Math.round(w.confidence * 100)}%
                  </span>
                ) : null}
                {w.scope ? (
                  <span className="ml-auto text-10px font-medium text-[var(--text-tertiary)]">
                    {w.scope}
                    {w.refCode ? ` · ${w.refCode}` : ""}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 text-13px font-bold leading-5 text-[var(--text-primary)]">
                {w.title}
              </div>
              {w.body ? (
                <div className="mt-1.5 text-12px font-medium leading-relaxed text-[var(--text-secondary)]">
                  {w.body}
                </div>
              ) : null}
              {(w.issues?.length ?? 0) > 0 || (w.maggiorazioneRefs?.length ?? 0) > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {w.issues?.slice(0, 4).map((issue) => (
                    <span
                      className="rounded-md bg-[var(--warning-soft)] px-2 py-1 text-10px font-bold text-[var(--warning-base)]"
                      key={issue}
                    >
                      {formatAuditLabel(issue)}
                    </span>
                  ))}
                  {w.maggiorazioneRefs?.slice(0, 3).map((ref) => (
                    <span
                      className="rounded-md bg-[var(--info-soft)] px-2 py-1 text-10px font-bold text-[var(--info-base)]"
                      key={ref}
                    >
                      MG {ref}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <DialogActions>
        <Button onClick={onClose} variant="primary">
          Chiudi
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function MaggiorazioniPanel({
  maggiorazioni,
  onShowWarningDetail,
}: {
  maggiorazioni: DesktopTariffVoice[];
  onShowWarningDetail?: (voice: DesktopTariffVoice) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-4">
      <button
        className="flex w-full items-center justify-between gap-3 rounded-14px border border-[var(--border-subtle)]/70 bg-[var(--surface-base)]/46 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-base)]/70"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning-base)]">
            <Archive className="size-4" />
          </div>
          <div>
            <div className="text-14px font-bold text-[var(--text-primary)]">
              Maggiorazioni ({maggiorazioni.length})
            </div>
            <div className="text-11px font-medium text-[var(--text-secondary)]">
              Coefficienti e sovrapprezzi applicati alle voci della tariffa
            </div>
          </div>
        </div>
        <ChevronRight
          className={cn(
            "size-5 text-[var(--text-secondary)] transition-transform",
            isOpen && "rotate-90",
          )}
        />
      </button>
      {isOpen ? (
        <div className="mt-2 overflow-x-auto rounded-14px border border-[var(--border-subtle)]/70 bg-[var(--surface-base)]/42">
          <div className="grid min-w-[720px] grid-cols-[160px_1fr_100px_100px] gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-muted)]/44 px-4 py-2.5 text-10px font-bold uppercase tracking-0_08em text-[var(--text-secondary)]">
            <span>Codice</span>
            <span>Voce / Descrizione</span>
            <span className="text-right">% Manod.</span>
            <span className="text-right">Valore</span>
          </div>
          {maggiorazioni.map((m) => (
            <div
              className="grid min-w-[720px] grid-cols-[160px_1fr_100px_100px] items-center gap-3 border-b border-[var(--border-subtle)]/50 px-4 py-2.5 last:border-b-0"
              key={m.id}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-12px font-bold text-[var(--text-primary)]">
                  {m.officialCode}
                </span>
                {(m.warnings?.length ?? 0) > 0 ? (
                  <button
                    className="flex size-4 shrink-0 items-center justify-center rounded-full text-[var(--warning-base)] transition-colors hover:bg-[var(--warning-soft)]"
                    onClick={() => onShowWarningDetail?.(m)}
                    title="Vedi avvertenze"
                    type="button"
                  >
                    <AlertTriangle className="size-3" />
                  </button>
                ) : null}
              </div>
              <span className="truncate text-12px font-semibold text-[var(--text-secondary)]">
                {m.description || "—"}
              </span>
              <span className="text-right text-12px font-semibold text-[var(--text-secondary)]">
                {m.laborPercentage != null ? `${m.laborPercentage}%` : "—"}
              </span>
              <span className="text-right text-12px font-bold text-[var(--text-primary)]">
                {Number.isFinite(m.unitPrice)
                  ? `${m.unitPrice.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €`
                  : "—"}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

function formatAuditLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
