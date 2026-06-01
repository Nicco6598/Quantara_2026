import { parseEuroAmount } from "@quantara/domain-utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import { m } from "framer-motion";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronRight,
  FileWarning,
  Gauge,
  Link2,
  Loader,
  MapPinned,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/shared/Button";
import { Dialog, DialogActions } from "@/components/shared/Dialog";
import { useToast } from "@/components/shared/ToastProvider";
import { useActionHandler } from "@/hooks/useAction";

import type { DesktopTariffVoice, TariffPdfMetadata } from "@/lib/desktopData";

import type { ImportValidation } from "../tariffs-types";
import type { ImportPreviewGridLayout } from "../utils/import-preview-grid-layout";
import type { ImportPreviewFileItem } from "../utils/import-preview-helpers";
import {
  buildAllImportErrorRows,
  buildImportPreviewFileItems,
  buildInvalidRowsForGrid,
  buildRegularIndexMap,
  estimateImportBlockingIssues,
  formatMaggiorazioneDisplayCells,
  getGridBlockingCount,
  useImportPreviewDerivations,
  useImportPreviewSessionPrewarm,
} from "../utils/import-preview-helpers";
import {
  buildImportPreviewPrewarmKey,
  clearImportPreviewSessionCache,
  ensureImportPreviewInvalidRows,
  getImportPreviewSessionCache,
  invalidateImportPreviewFileStructure,
  isImportPreviewFileReady,
  patchImportPreviewSessionVoice,
  prewarmImportPreviewFile,
  prewarmImportPreviewVoices,
} from "../utils/import-preview-session-cache";
import {
  getImportVoiceBreakdown,
  splitRegularAndMaggiorazioni,
} from "../utils/import-preview-voice-split";
import type { VoiceGroup } from "../utils/tariff-grouping";
import { resolveImportDraftVoicesList } from "../utils/tariff-import-draft-persistence";
import type { ImportDraft } from "../utils/tariff-import-drafts";
import {
  createDraftName,
  createDraftSignature,
  deleteTariffImportDraft,
  deleteTariffImportDraftAsync,
  loadImportDraftAsync,
  saveImportDraftRecordAsync,
} from "../utils/tariff-import-drafts";
import { getImportValidation, parseOptionalPercent } from "../utils/tariffs-validation";
import {
  EditableTariffVoicesGrid,
  type EditableTariffVoicesGridHandle,
  type TariffGridDraftChange,
  type TariffGridScrollTarget,
  type TariffGridSectionSummary,
} from "./EditableTariffVoicesGrid";
import { ImportPreviewActionBar } from "./import-preview/ImportPreviewActionBar";
import { ImportPreviewSidebar } from "./import-preview/ImportPreviewSidebar";
import {
  ImportPreviewConfirmLabel,
  ImportPreviewWorkflowControls,
} from "./import-preview/ImportPreviewWorkflowControls";
import { ImportPreviewWorkspace } from "./import-preview/ImportPreviewWorkspace";
import { TariffImportConfirmLoadingModal } from "./TariffImportConfirmLoadingModal";

type ExtractionSummary = {
  averageConfidence: number | null;
  issueRows: number;
  linkedRows: number;
  lowConfidenceRows: number;
  maggiorazioneRules: number;
  maggiorazioneVoiceCount: number;
  pagesLabel: string;
  parserIssues: number;
  regularVoiceCount: number;
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

const LARGE_EXTRACTION_SCAN_THRESHOLD = 4_000;

function buildExtractionSummary(
  metadata: TariffPdfMetadata | undefined,
  breakdown: ReturnType<typeof getImportVoiceBreakdown>,
): ExtractionSummary {
  const report = metadata?.validationReport as unknown;
  const counts = readNumberMap(report, "counts");
  const confidence = readNumberMap(report, "confidence");
  const { regular, maggiorazioni, regularCount, maggiorazioneCount, totalCount } = breakdown;
  const scanVoices = totalCount <= LARGE_EXTRACTION_SCAN_THRESHOLD;

  const issueRows = scanVoices
    ? regular.filter((voice) => (voice.issues?.length ?? 0) > 0).length
    : (counts.records_with_review_flags ?? 0);

  const lowConfidenceRows =
    typeof counts.low_confidence_records === "number"
      ? counts.low_confidence_records
      : scanVoices
        ? [...regular, ...maggiorazioni].filter((voice) => (voice.confidence ?? 1) < 0.85).length
        : 0;

  /** Codici indicizzati nel PDF (report parser), non righe con `source.page`. */
  const sourceMappedRows =
    typeof counts.source_index_codes === "number"
      ? counts.source_index_codes
      : scanVoices
        ? new Set(
            regular
              .filter((voice) => voice.source?.page != null)
              .map((voice) => voice.officialCode.trim())
              .filter(Boolean),
          ).size
        : 0;

  const linkedRows =
    typeof counts.records_with_linked_maggiorazioni === "number"
      ? counts.records_with_linked_maggiorazioni
      : scanVoices
        ? regular.filter((voice) => (voice.linkedMaggiorazioni?.length ?? 0) > 0).length
        : 0;

  const parserIssues =
    Object.values(readNumberMap(report, "issuesByType")).reduce((sum, count) => sum + count, 0) +
    Object.values(readNumberMap(report, "warningIssuesByType")).reduce(
      (sum, count) => sum + count,
      0,
    );
  const pageCount = metadata?.pagesParsed ?? metadata?.pagesTotal ?? counts.pages_total ?? 0;
  const totalPages = metadata?.pagesTotal ?? pageCount;
  const confidencePool = [...regular, ...maggiorazioni];

  return {
    averageConfidence:
      confidence.average_record_confidence ??
      (confidencePool.length > 0
        ? Math.round(
            (confidencePool.reduce((sum, voice) => sum + (voice.confidence ?? 1), 0) /
              confidencePool.length) *
              1000,
          ) / 1000
        : null),
    issueRows,
    linkedRows,
    lowConfidenceRows,
    maggiorazioneRules:
      counts.maggiorazione_rules ?? getArrayLength(metadata?.maggiorazioneRules as unknown),
    maggiorazioneVoiceCount: maggiorazioneCount,
    pagesLabel: pageCount > 0 ? `${pageCount}/${totalPages || pageCount}` : "-",
    parserIssues,
    regularVoiceCount: regularCount,
    sourceMappedRows,
    warningLibraryRows: counts.warnings ?? getArrayLength(metadata?.warnings as unknown),
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
  const modKey = isMacPlatform() ? "\u2318" : "Ctrl";
  const deleteKey = isMacPlatform() ? "\u232B" : "Del";
  const groups = [
    {
      label: "Navigazione",
      hints: [{ action: "File", keys: [modKey, "Shift", "\u2190/\u2192"] }],
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
  const cells: Array<{
    icon: typeof Gauge;
    label: string;
    title?: string;
    tone: "danger" | "neutral" | "success" | "warning";
    value: string;
  }> = [
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
      title: "Codici indicizzati nel PDF (report parser)",
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
      label: "Maggiorazioni",
      title:
        summary.maggiorazioneRules > 0
          ? `${summary.maggiorazioneVoiceCount.toLocaleString("it-IT")} voci MG · ${summary.maggiorazioneRules.toLocaleString("it-IT")} regole parser`
          : "Voci maggiorazione estratte (stesso conteggio del pannello sotto)",
      tone: summary.maggiorazioneVoiceCount > 0 ? "warning" : "neutral",
      value: summary.maggiorazioneVoiceCount.toLocaleString("it-IT"),
    },
    {
      icon: ShieldCheck,
      label: "Collegamenti MG",
      tone: summary.linkedRows > 0 ? "success" : "neutral",
      value: summary.linkedRows.toLocaleString("it-IT"),
    },
    {
      icon: ShieldCheck,
      label: "Audit",
      tone: summary.parserIssues > 0 || summary.lowConfidenceRows > 0 ? "warning" : "success",
      value: (summary.parserIssues + summary.lowConfidenceRows).toLocaleString("it-IT"),
    },
  ];

  return (
    <div className="grid gap-2 border-y border-[var(--border-subtle)]/70 py-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cells.map(({ icon: Icon, label, title, tone, value }) => (
        <div
          className="flex min-w-0 items-center gap-2 rounded-12px bg-[var(--surface-base)]/42 px-3 py-2 ring-1 ring-[var(--border-subtle)]/44"
          key={label}
          title={title}
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
  gridValidation,
  handleAddVoice,
  isSwitching,
  onDraftActivity,
  onDraftCommit,
  prebuiltGridLayout,
  updateVoice,
  askDeleteVoice,
  updateCategorySections,
  gridRef,
  gridScrollTarget,
  hasVoices,
  scrollLayout,
}: {
  duplicateCodes: Set<string>;
  editableGroups: VoiceGroup[];
  gridValidation: ImportValidation;
  handleAddVoice: () => void;
  isSwitching: boolean;
  onDraftActivity: () => void;
  onDraftCommit: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  prebuiltGridLayout: ImportPreviewGridLayout | null;
  updateVoice: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  askDeleteVoice: (index: number) => void;
  updateCategorySections: (next: TariffGridSectionSummary[]) => void;
  gridRef: React.RefObject<EditableTariffVoicesGridHandle | null>;
  gridScrollTarget: TariffGridScrollTarget | null;
  hasVoices: boolean;
  scrollLayout: "fill" | "viewport";
}) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {isSwitching ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[var(--surface-base)]/60 backdrop-blur-[1px]">
          <Loader className="tariff-import-loader-spin size-6 text-[var(--accent-primary)]" />
          <p className="text-12px font-medium text-[var(--text-secondary)]">
            Preparazione griglia voci…
          </p>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <EditableTariffVoicesGrid
          duplicateCodes={duplicateCodes}
          groups={editableGroups}
          onAddVoice={handleAddVoice}
          onChange={updateVoice}
          onDelete={askDeleteVoice}
          onDraftActivity={onDraftActivity}
          onDraftCommit={onDraftCommit}
          onSectionsChange={updateCategorySections}
          prebuiltLayout={prebuiltGridLayout}
          ref={gridRef}
          scrollLayout={scrollLayout}
          scrollTarget={gridScrollTarget}
          validation={gridValidation}
        />
      </div>
      {!hasVoices ? (
        <div className="mt-3 shrink-0 rounded-2xl bg-[var(--warning-soft)] px-4 py-3 text-13px font-semibold text-[var(--warning-base)]">
          Nessuna voce tariffaria importabile trovata nel PDF. Verifica che il documento contenga
          codici, unita di misura e prezzi leggibili.
        </div>
      ) : null}
    </div>
  );
}

function ModalFooter({
  onCancel,
  saveDraft,
  hasSavedDraftOnDisk,
  discardDraft,
  removeActiveFile,
  toggleActiveFileDraft,
  toggleActiveFileReviewed,
  markAllFilesReviewed,
  draftedFiles,
  localActiveIndex,
  modalReviewedFiles,
  metadatas,
  canConfirm,
  isBusy,
  confirmChanges,
}: {
  onCancel: () => void;
  saveDraft: () => void;
  hasSavedDraftOnDisk: boolean;
  discardDraft: () => void;
  removeActiveFile: () => void;
  toggleActiveFileDraft: () => void;
  toggleActiveFileReviewed: () => void;
  markAllFilesReviewed: () => void;
  draftedFiles: Set<number>;
  localActiveIndex: number;
  modalReviewedFiles: Set<number>;
  metadatas: TariffPdfMetadata[];
  canConfirm: boolean;
  isBusy: boolean;
  confirmChanges: () => void;
}) {
  const ConfirmIcon = isBusy ? Loader : CheckCircle2;

  return (
    <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)]/70 px-5 py-3">
      <ImportShortcutLegend />
      <ImportPreviewWorkflowControls
        draftedFiles={draftedFiles}
        isBusy={isBusy}
        hasSavedDraftOnDisk={hasSavedDraftOnDisk}
        localActiveIndex={localActiveIndex}
        markAllFilesReviewed={markAllFilesReviewed}
        metadatasCount={metadatas.length}
        modalReviewedFiles={modalReviewedFiles}
        onRemoveFile={removeActiveFile}
        onSaveSessionDraft={saveDraft}
        toggleActiveFileDraft={toggleActiveFileDraft}
        toggleActiveFileReviewed={toggleActiveFileReviewed}
      />
      {hasSavedDraftOnDisk ? (
        <div className="flex justify-end">
          <Button icon={Archive} onClick={discardDraft} size="sm" variant="outline">
            Elimina bozza salvata
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={isBusy} onClick={onCancel} variant="outline">
            Annulla
          </Button>
          <Button
            disabled={!canConfirm || isBusy}
            icon={ConfirmIcon}
            onClick={confirmChanges}
            variant="primary"
          >
            <ImportPreviewConfirmLabel
              canConfirm={canConfirm}
              isBusy={isBusy}
              metadatasCount={metadatas.length}
              reviewedCount={modalReviewedFiles.size}
            />
          </Button>
        </div>
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
  | { type: "MARK_ALL_REVIEWED"; fileCount: number }
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
        section.warningCount === nextSection.warningCount &&
        section.errorCount === nextSection.errorCount
      );
    })
  );
}

function createImportPreviewInitialState(
  metadatas: TariffPdfMetadata[],
  seedImportDraft?: ImportDraft | null,
): ImportPreviewState {
  if (seedImportDraft) {
    return {
      editableVoicesList: resolveImportDraftVoicesList(seedImportDraft),
      excludedFiles: new Set(seedImportDraft.excludedFiles),
      draftedFiles: new Set(seedImportDraft.draftedFiles),
      modalReviewedFiles: new Set(
        seedImportDraft.reviewedFiles.length > 0
          ? seedImportDraft.reviewedFiles
          : metadatas.length === 1
            ? [0]
            : [],
      ),
      modalActiveIndex: 0,
    };
  }

  return {
    editableVoicesList: metadatas.map((metadata) => metadata.voices ?? []),
    excludedFiles: new Set<number>(),
    draftedFiles: new Set<number>(),
    modalReviewedFiles: new Set(metadatas.length === 1 ? [0] : []),
    modalActiveIndex: 0,
  };
}

function importPreviewReducer(
  state: ImportPreviewState,
  action: ImportPreviewAction,
): ImportPreviewState {
  switch (action.type) {
    case "LOAD_DRAFT":
      return {
        editableVoicesList:
          action.loadedDraft?.editableVoicesList ??
          action.loadedDraft?.metadatas.map((m) => m.voices) ??
          action.metadatas.map((m) => m.voices),
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
          i !== action.activeIndex ? voices : [action.voice, ...voices],
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
    case "MARK_ALL_REVIEWED": {
      const nextReviewed = new Set<number>();
      const nextDrafted = new Set(state.draftedFiles);
      for (let index = 0; index < action.fileCount; index++) {
        if (!nextDrafted.has(index)) nextReviewed.add(index);
      }
      return { ...state, modalReviewedFiles: nextReviewed };
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

  const changesByRow = new Map<number, ParsedDraftChange[]>();
  for (const change of changes) {
    const bucket = changesByRow.get(change.rowIndex);
    if (bucket) bucket.push(change);
    else changesByRow.set(change.rowIndex, [change]);
  }

  return editableVoicesList.map((voices, index) => {
    if (index !== activeIndex) return voices;
    let touched = false;
    const nextVoices = voices.map((voice, voiceIndex) => {
      const voiceChanges = changesByRow.get(voiceIndex);
      if (!voiceChanges?.length) return voice;
      touched = true;
      let nextVoice = voice;
      for (const change of voiceChanges) {
        nextVoice = { ...nextVoice, [change.field]: change.value };
      }
      return nextVoice;
    });
    return touched ? nextVoices : voices;
  });
}

function remapGridDraftChanges(
  changes: ParsedDraftChange[],
  regularIndexMap: Map<number, number>,
): ParsedDraftChange[] {
  return changes.map((change) => ({
    ...change,
    rowIndex: regularIndexMap.get(change.rowIndex) ?? change.rowIndex,
  }));
}

function applyDraftChangesToVoiceList(
  voices: DesktopTariffVoice[],
  changes: ParsedDraftChange[],
): DesktopTariffVoice[] {
  if (changes.length === 0) return voices;

  const changesByRow = new Map<number, ParsedDraftChange[]>();
  for (const change of changes) {
    const bucket = changesByRow.get(change.rowIndex);
    if (bucket) bucket.push(change);
    else changesByRow.set(change.rowIndex, [change]);
  }

  let touched = false;
  const nextVoices = voices.map((voice, voiceIndex) => {
    const voiceChanges = changesByRow.get(voiceIndex);
    if (!voiceChanges?.length) return voice;
    touched = true;
    let nextVoice = voice;
    for (const change of voiceChanges) {
      nextVoice = { ...nextVoice, [change.field]: change.value };
    }
    return nextVoice;
  });
  return touched ? nextVoices : voices;
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
  seedImportDraft = null,
}: {
  activeIndex?: number;
  existingBookIds?: (string | undefined)[];
  isBusy: boolean;
  metadatas: TariffPdfMetadata[];
  seedImportDraft?: ImportDraft | null;
  onCancel: () => void;
  onConfirm: (metadatas: TariffImportPreviewResult[]) => void | Promise<void>;
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
  const draftSignature = useMemo(
    () =>
      createDraftSignature(
        metadatas,
        metadatas.map(
          (metadata) => splitRegularAndMaggiorazioni(metadata.voices ?? []).regular.length,
        ),
      ),
    [metadatas],
  );
  const draftStorageKey = `quantara:tariff-import-preview:${draftSignature}`;
  const [hasSavedDraftOnDisk, setHasSavedDraftOnDisk] = useState(Boolean(seedImportDraft));
  const suppressDraftAutoLoadRef = useRef(Boolean(seedImportDraft));
  const [importState, dispatch] = useReducer(importPreviewReducer, undefined, () =>
    createImportPreviewInitialState(metadatas, seedImportDraft),
  );
  const { editableVoicesList, excludedFiles, draftedFiles, modalReviewedFiles, modalActiveIndex } =
    importState;

  const previewSessionKey = useMemo(
    () =>
      `${buildImportPreviewPrewarmKey(metadatas)}|${isEditingExistingTariff ? "edit" : "import"}|${
        existingBookIds?.filter(Boolean).join(",") ?? ""
      }`,
    [existingBookIds, isEditingExistingTariff, metadatas],
  );
  const previewSessionKeyRef = useRef<string | null>(null);

  const [warningDetailVoice, setWarningDetailVoice] = useState<DesktopTariffVoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    code: string;
    description: string;
    index: number;
  } | null>(null);
  const [categorySections, setCategorySections] = useState<TariffGridSectionSummary[]>([]);
  const [gridScrollTarget, setGridScrollTarget] = useState<TariffGridScrollTarget | null>(null);
  const [draftRevision, setDraftRevision] = useState(0);
  const [debouncedDraftRevision, setDebouncedDraftRevision] = useState(0);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedDraftRevision(draftRevision);
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [draftRevision]);
  const gridRef = useRef<EditableTariffVoicesGridHandle>(null);
  const sectionsByFileRef = useRef<Map<number, TariffGridSectionSummary[]>>(new Map());
  const pendingCellFocusRef = useRef<{
    field: keyof DesktopTariffVoice;
    fileIndex: number;
    rowIndex: number;
  } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const confirmBusy = isBusy || isConfirming || isSavingDraft;
  const localActiveIndex = pageView ? activeIndex : modalActiveIndex;
  const renderIndex = useDeferredValue(localActiveIndex);
  const isSwitchingFile = renderIndex !== localActiveIndex;
  const handleGridDraftActivity = useCallback(() => {
    setDraftRevision((revision) => revision + 1);
  }, []);
  const updateCategorySections = useCallback(
    (next: TariffGridSectionSummary[]) => {
      sectionsByFileRef.current.set(renderIndex, next);
      if (renderIndex !== localActiveIndex) return;
      setCategorySections((current) => (areSectionSummariesEqual(current, next) ? current : next));
    },
    [localActiveIndex, renderIndex],
  );

  useEffect(() => {
    setCategorySections(sectionsByFileRef.current.get(localActiveIndex) ?? []);
  }, [localActiveIndex]);
  const activeMetadata = metadatas[localActiveIndex];
  const sessionPrewarmRevision = useImportPreviewSessionPrewarm(metadatas, localActiveIndex);
  const [regroupRevision, setRegroupRevision] = useState(0);
  const [sessionVoiceRevision, setSessionVoiceRevision] = useState(0);
  const derivationRevision = sessionPrewarmRevision + regroupRevision + sessionVoiceRevision;

  useEffect(() => {
    if (isEditingExistingTariff) return;
    if (suppressDraftAutoLoadRef.current) {
      suppressDraftAutoLoadRef.current = false;
      onDraftedFilesChangeRef.current?.(new Set(seedImportDraft?.draftedFiles ?? []));
      onReviewedFilesChangeRef.current?.(
        new Set(seedImportDraft?.reviewedFiles ?? (metadatas.length === 1 ? [0] : [])),
      );
      return;
    }
    let cancelled = false;
    void loadImportDraftAsync(draftStorageKey, draftSignature, metadatas.length).then((draft) => {
      if (cancelled) return;
      if (draft) {
        dispatch({ type: "LOAD_DRAFT", loadedDraft: draft, metadatas });
        setHasSavedDraftOnDisk(true);
      }
      onDraftedFilesChangeRef.current?.(new Set(draft?.draftedFiles ?? []));
      onReviewedFilesChangeRef.current?.(
        new Set(draft?.reviewedFiles ?? (metadatas.length === 1 ? [0] : [])),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [draftSignature, draftStorageKey, isEditingExistingTariff, metadatas, seedImportDraft]);

  useEffect(() => {
    const previousKey = previewSessionKeyRef.current;
    if (previousKey === previewSessionKey) return;

    const isSessionSwitch = previousKey !== null;
    previewSessionKeyRef.current = previewSessionKey;

    if (isSessionSwitch) {
      clearImportPreviewSessionCache();
      setHasSavedDraftOnDisk(false);
      if (!isEditingExistingTariff) {
        void loadImportDraftAsync(draftStorageKey, draftSignature, metadatas.length).then(
          (nextDraft) => {
            if (nextDraft) {
              dispatch({ type: "LOAD_DRAFT", loadedDraft: nextDraft, metadatas });
              setHasSavedDraftOnDisk(true);
            } else {
              dispatch({
                type: "LOAD_DRAFT",
                loadedDraft: null,
                metadatas,
              });
            }
          },
        );
      } else {
        dispatch({ type: "LOAD_DRAFT", loadedDraft: null, metadatas });
      }
      setDraftRevision(0);
      setDebouncedDraftRevision(0);
      setRegroupRevision(0);
      setCategorySections([]);
      sectionsByFileRef.current.clear();
      setGridScrollTarget(null);
    }
  }, [draftSignature, draftStorageKey, isEditingExistingTariff, metadatas, previewSessionKey]);

  useEffect(() => {
    const voices = editableVoicesList[localActiveIndex] ?? [];
    if (voices.length === 0 || metadatas.length === 0) return;

    const cached = getImportPreviewSessionCache()?.get(localActiveIndex);
    if (cached?.groups && cached.groups.length > 0 && cached.regular.length > 0) {
      const { regular } = splitRegularAndMaggiorazioni(voices);
      if (cached.regular.length === regular.length) return;
    }

    let cancelled = false;
    void prewarmImportPreviewVoices(metadatas, localActiveIndex, voices, {
      onPhaseReady: () => {
        if (!cancelled) {
          startTransition(() => {
            setRegroupRevision((revision) => revision + 1);
          });
        }
      },
    });

    return () => {
      cancelled = true;
    };
  }, [editableVoicesList, localActiveIndex, metadatas]);

  const { regularByFile, groupsByFile, gridValidationByFile, gridLayoutByFile, isActiveFileReady } =
    useImportPreviewDerivations(editableVoicesList, localActiveIndex, derivationRevision);
  const activeGridLayout = gridLayoutByFile[renderIndex] ?? null;
  const voiceBreakdownByFile = useMemo(
    () => editableVoicesList.map((voices) => getImportVoiceBreakdown(voices)),
    [editableVoicesList],
  );
  const activeVoiceBreakdown =
    voiceBreakdownByFile[localActiveIndex] ?? getImportVoiceBreakdown([]);
  const renderVoiceBreakdown = voiceBreakdownByFile[renderIndex] ?? getImportVoiceBreakdown([]);
  const displayVoices = editableVoicesList[localActiveIndex] ?? [];
  const gridVoices = editableVoicesList[renderIndex] ?? [];
  const cachedRegular = regularByFile[renderIndex];
  const regularVoices =
    cachedRegular && cachedRegular.length > 0 ? cachedRegular : renderVoiceBreakdown.regular;
  const maggiorazioniVoices = activeVoiceBreakdown.maggiorazioni;
  const regularVoicesForValidation = useMemo(() => {
    void debouncedDraftRevision;
    const parsedChanges = (gridRef.current?.peekDraftChanges() ?? []).map(parseDraftChange);
    return applyDraftChangesToVoiceList(regularVoices, parsedChanges);
  }, [debouncedDraftRevision, regularVoices]);
  const activeGridValidation = useMemo(() => {
    if (debouncedDraftRevision === 0) {
      return gridValidationByFile[renderIndex] ?? emptyImportValidation;
    }
    return getImportValidation(regularVoicesForValidation);
  }, [debouncedDraftRevision, gridValidationByFile, regularVoicesForValidation, renderIndex]);
  const activeGridBlockingCount = getGridBlockingCount(
    activeGridValidation,
    activeMetadata,
    regularVoices.length > 0,
  );
  const activeExtractionSummary = useMemo(
    () => buildExtractionSummary(activeMetadata, activeVoiceBreakdown),
    [activeMetadata, activeVoiceBreakdown],
  );
  const hasVoices = activeVoiceBreakdown.regularCount > 0;
  const canConfirm =
    metadatas.length > 0 &&
    metadatas.every((_, i) => {
      const voices = editableVoicesList[i];
      const validation = i === renderIndex ? activeGridValidation : gridValidationByFile[i];
      const isDrafted = draftedFiles.has(i);
      return (
        voices &&
        voices.length > 0 &&
        validation &&
        (isDrafted || (validation.invalidCount === 0 && modalReviewedFiles.has(i)))
      );
    });
  const mergedGridValidationByFile = useMemo(
    () =>
      gridValidationByFile.map((validation, index) =>
        index === renderIndex ? activeGridValidation : validation,
      ),
    [activeGridValidation, gridValidationByFile, renderIndex],
  );

  const sidebarInvalidRowsByFile = useMemo(
    () =>
      mergedGridValidationByFile.map((validation, index) => {
        const regular = regularByFile[index] ?? [];
        if (validation.invalidRows.length === 0 && validation.duplicateRows.length === 0) {
          return [];
        }
        return buildInvalidRowsForGrid(validation, regular);
      }),
    [mergedGridValidationByFile, regularByFile],
  );

  const duplicateCodes = useMemo(
    () => new Set<string>(activeGridValidation.duplicateExamples),
    [activeGridValidation],
  );
  const editableGroups = groupsByFile[renderIndex] ?? [];
  const deferredEditableGroups = useDeferredValue(editableGroups);
  const gridGroups = isSwitchingFile ? deferredEditableGroups : editableGroups;
  const regularIndexMap = useMemo(() => buildRegularIndexMap(gridVoices), [gridVoices]);

  const voicesWithWarnings = useMemo(
    () => displayVoices.filter((v) => (v.warnings?.length ?? 0) > 0),
    [displayVoices],
  );

  const allErrorRows = useMemo(
    () =>
      buildAllImportErrorRows({
        activeFileIndex: localActiveIndex,
        invalidRowsByFile: sidebarInvalidRowsByFile,
        metadatas,
      }),
    [localActiveIndex, metadatas, sidebarInvalidRowsByFile],
  );
  const { otherFiles: otherFilesErrorCount, total: errorRowCount } = useMemo(
    () =>
      estimateImportBlockingIssues({
        activeFileIndex: localActiveIndex,
        gridValidationByFile: mergedGridValidationByFile,
        metadatas,
        regularByFile,
      }),
    [localActiveIndex, mergedGridValidationByFile, metadatas, regularByFile],
  );
  const importFileItems = useMemo<ImportPreviewFileItem[]>(
    () =>
      buildImportPreviewFileItems({
        activeFileIndex: localActiveIndex,
        draftedFiles,
        isFileReady: isImportPreviewFileReady,
        mergedGridValidationByFile,
        metadatas,
        reviewedFiles: modalReviewedFiles,
        voiceBreakdownByFile,
      }),
    [
      draftedFiles,
      localActiveIndex,
      mergedGridValidationByFile,
      metadatas,
      modalReviewedFiles,
      voiceBreakdownByFile,
    ],
  );
  const parseVoiceFieldValue = useCallback(
    (field: keyof DesktopTariffVoice, value: string): string | number | null => {
      if (field === "unitPrice") {
        return value.trim() === "" ? Number.NaN : parseEuroAmount(value);
      }
      if (field === "laborPercentage") {
        return value.trim() === "" ? null : parseOptionalPercent(value);
      }
      return value;
    },
    [],
  );

  const updateVoice = useCallback(
    (displayIndex: number, field: keyof DesktopTariffVoice, value: string) => {
      const originalIndex = regularIndexMap.get(displayIndex) ?? displayIndex;
      dispatch({
        type: "UPDATE_VOICE",
        activeIndex: localActiveIndex,
        voiceIndex: originalIndex,
        field,
        value: parseVoiceFieldValue(field, value),
      });
    },
    [localActiveIndex, parseVoiceFieldValue, regularIndexMap],
  );

  const activeFileRegularIndexMap = useMemo(
    () => buildRegularIndexMap(editableVoicesList[localActiveIndex] ?? []),
    [editableVoicesList, localActiveIndex],
  );

  const commitGridDraftField = useCallback(
    (regularIndex: number, field: keyof DesktopTariffVoice, value: string) => {
      const parsedValue = parseVoiceFieldValue(field, value);
      const fullIndex = activeFileRegularIndexMap.get(regularIndex) ?? regularIndex;
      dispatch({
        type: "UPDATE_VOICE",
        activeIndex: localActiveIndex,
        voiceIndex: fullIndex,
        field,
        value: parsedValue,
      });
      patchImportPreviewSessionVoice(localActiveIndex, regularIndex, field, parsedValue);
      setDebouncedDraftRevision((revision) => revision + 1);
      setSessionVoiceRevision((revision) => revision + 1);
    },
    [activeFileRegularIndexMap, localActiveIndex, parseVoiceFieldValue],
  );

  const flushGridDraftChanges = useCallback(() => {
    const parsedChanges = remapGridDraftChanges(
      (gridRef.current?.drainDraftChanges() ?? []).map(parseDraftChange),
      activeFileRegularIndexMap,
    );
    if (parsedChanges.length === 0) {
      return editableVoicesList;
    }
    dispatch({ type: "APPLY_DRAFTS", activeIndex: localActiveIndex, changes: parsedChanges });
    setDraftRevision(0);
    setDebouncedDraftRevision(0);
    return applyDraftChangesToVoicesList(editableVoicesList, localActiveIndex, parsedChanges);
  }, [activeFileRegularIndexMap, editableVoicesList, localActiveIndex]);

  const handleAddVoice = useCallback(() => {
    const now = Date.now();
    const voiceId = `voice_custom_${now}`;
    const bookId = existingBookIds?.[localActiveIndex] ?? `tariff_custom_${now}`;
    const newVoice: DesktopTariffVoice = {
      category: "Voce personalizzata",
      description: "",
      id: voiceId,
      laborPercentage: null,
      officialCode: `CUSTOM-${now}`,
      tariffBookId: bookId,
      unitOfMeasure: "",
      unitPrice: Number.NaN,
    };
    invalidateImportPreviewFileStructure(localActiveIndex);
    dispatch({ type: "ADD_VOICE", activeIndex: localActiveIndex, voice: newVoice });
    setGridScrollTarget({
      field: "officialCode",
      nonce: Date.now(),
      rowIndex: 0,
      type: "cell",
    });
  }, [localActiveIndex, existingBookIds]);

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

  const confirmChanges = useCallback(async () => {
    if (confirmBusy) return;
    setIsConfirming(true);
    try {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
      const nextEditableVoicesList = flushGridDraftChanges();
      deleteTariffImportDraft(draftStorageKey);
      await onConfirm(buildConfirmableMetadatas(nextEditableVoicesList));
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Approvazione import non riuscita",
        tone: "danger",
      });
    } finally {
      setIsConfirming(false);
    }
  }, [
    buildConfirmableMetadatas,
    confirmBusy,
    draftStorageKey,
    flushGridDraftChanges,
    notify,
    onConfirm,
  ]);
  confirmChangesRef.current = () => {
    void confirmChanges();
  };

  const saveDraft = useCallback(() => {
    if (isSavingDraft) return;
    void (async () => {
      setIsSavingDraft(true);
      try {
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve());
        });
        const nextEditableVoicesList = flushGridDraftChanges();
        await saveImportDraftRecordAsync({
          draftedFiles: [...draftedFiles],
          editableVoicesList: nextEditableVoicesList,
          excludedFiles: [...excludedFiles],
          id: draftStorageKey,
          metadatas,
          name: createDraftName(metadatas),
          reviewedFiles: [...modalReviewedFiles],
          savedAt: new Date().toISOString(),
          signature: draftSignature,
        });
        setHasSavedDraftOnDisk(true);
        notify({
          message: "Bozza salvata. Riprendila da Azioni rapide → Riprendi bozza import.",
          tone: "success",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        notify({
          message,
          title: "Salvataggio bozza non riuscito",
          tone: "danger",
        });
      } finally {
        setIsSavingDraft(false);
      }
    })();
  }, [
    draftedFiles,
    draftSignature,
    draftStorageKey,
    excludedFiles,
    flushGridDraftChanges,
    isSavingDraft,
    metadatas,
    modalReviewedFiles,
    notify,
  ]);

  const discardDraft = useCallback(() => {
    void (async () => {
      await deleteTariffImportDraftAsync(draftStorageKey);
      setHasSavedDraftOnDisk(false);
      notify({ message: "Bozza import eliminata.", tone: "success" });
    })();
  }, [draftStorageKey, notify]);

  const switchFile = useCallback(
    (index: number) => {
      if (index === localActiveIndex) return;
      const fromIndex = localActiveIndex;
      const fromMap = buildRegularIndexMap(editableVoicesList[fromIndex] ?? []);
      const parsedChanges = remapGridDraftChanges(
        (gridRef.current?.drainDraftChanges() ?? []).map(parseDraftChange),
        fromMap,
      );
      if (parsedChanges.length > 0) {
        dispatch({ type: "APPLY_DRAFTS", activeIndex: fromIndex, changes: parsedChanges });
      }
      setDraftRevision(0);
      startTransition(() => {
        void prewarmImportPreviewFile(metadatas, index);
        ensureImportPreviewInvalidRows(index);
        onActiveIndexChange?.(index);
        if (!pageView) dispatch({ type: "SWITCH_FILE", index });
      });
    },
    [editableVoicesList, localActiveIndex, metadatas, onActiveIndexChange, pageView],
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

    void saveImportDraftRecordAsync({
      draftedFiles: [...nextDraftedFiles],
      editableVoicesList: nextEditableVoicesList,
      excludedFiles: [...excludedFiles],
      id: draftStorageKey,
      metadatas,
      name: createDraftName(metadatas),
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

  const markAllFilesReviewed = useCallback(() => {
    flushGridDraftChanges();
    const nextReviewed = new Set<number>();
    const nextDrafted = new Set(draftedFiles);
    for (let index = 0; index < metadatas.length; index++) {
      if (!nextDrafted.has(index)) nextReviewed.add(index);
    }
    dispatch({ type: "MARK_ALL_REVIEWED", fileCount: metadatas.length });
    onReviewedFilesChangeRef.current?.(nextReviewed);
  }, [draftedFiles, flushGridDraftChanges, metadatas.length]);

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
      const voice = gridVoices[originalIndex];
      if (!voice) return;
      setDeleteTarget({
        code: voice.officialCode || `Riga ${displayIndex + 1}`,
        description: voice.description,
        index: originalIndex,
      });
    },
    [gridVoices, regularIndexMap],
  );

  const confirmDeleteVoice = useCallback(() => {
    if (!deleteTarget) return;
    invalidateImportPreviewFileStructure(localActiveIndex);
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
    onReviewedFilesChangeRef.current?.(modalReviewedFiles);
  }, [modalReviewedFiles]);

  useEffect(() => {
    onDraftedFilesChangeRef.current?.(draftedFiles);
  }, [draftedFiles]);

  useActionHandler(
    "tariff.draft.confirm",
    useCallback(() => {
      if (pageViewRef.current) {
        confirmChangesRef.current?.();
      }
    }, []),
  );

  useActionHandler(
    "tariff.draft.save",
    useCallback(() => {
      saveActiveFileAsDraft();
    }, [saveActiveFileAsDraft]),
  );

  useActionHandler(
    "tariff.draft.toggleReviewed",
    useCallback(() => {
      toggleActiveFileReviewed();
    }, [toggleActiveFileReviewed]),
  );

  useActionHandler(
    "tariff.draft.deleteFile",
    useCallback(() => {
      removeActiveFile();
    }, [removeActiveFile]),
  );

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

      if (mod && key === "enter" && canConfirm && !confirmBusy) {
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
    confirmBusy,
    localActiveIndex,
    markActiveFileReviewed,
    metadatas.length,
    removeActiveFile,
    switchFile,
    toggleActiveFileDraft,
  ]);

  const focusImportCell = useCallback((rowIndex: number, field: string) => {
    setGridScrollTarget({
      field: field as keyof DesktopTariffVoice,
      nonce: Date.now(),
      rowIndex,
      type: "cell",
    });
  }, []);

  const focusImportCellAnyFile = useCallback(
    (fileIndex: number, rowIndex: number, field: string) => {
      if (fileIndex !== localActiveIndex) {
        pendingCellFocusRef.current = {
          field: field as keyof DesktopTariffVoice,
          fileIndex,
          rowIndex,
        };
        switchFile(fileIndex);
        return;
      }
      focusImportCell(rowIndex, field);
    },
    [focusImportCell, localActiveIndex, switchFile],
  );

  useEffect(() => {
    void isActiveFileReady;
    const pending = pendingCellFocusRef.current;
    if (!pending || pending.fileIndex !== localActiveIndex) return;
    pendingCellFocusRef.current = null;
    const frameId = requestAnimationFrame(() => {
      focusImportCell(pending.rowIndex, pending.field);
    });
    return () => cancelAnimationFrame(frameId);
  }, [focusImportCell, isActiveFileReady, localActiveIndex]);

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

  const showFileList = metadatas.length > 1;
  const scrollLayout = pageView ? "fill" : "viewport";
  const confirmFileCount = metadatas.length;
  const confirmVoiceCount = useMemo(
    () => editableVoicesList.reduce((sum, voices) => sum + voices.length, 0),
    [editableVoicesList],
  );
  const confirmLoadingModal = isConfirming ? (
    <TariffImportConfirmLoadingModal fileCount={confirmFileCount} totalVoices={confirmVoiceCount} />
  ) : null;
  const sidebarNode = (
    <ImportPreviewSidebar
      activeFileBlockingCount={activeGridBlockingCount}
      activeFileName={activeMetadata?.name ?? "Tariffario"}
      activeIndex={localActiveIndex}
      allErrorRows={allErrorRows}
      errorRowCount={errorRowCount}
      files={importFileItems}
      onFocusCategory={focusImportCategory}
      onFocusCell={focusImportCellAnyFile}
      onSelectFile={switchFile}
      onShowWarningDetail={setWarningDetailVoice}
      otherFilesErrorCount={otherFilesErrorCount}
      reviewedCount={modalReviewedFiles.size}
      sections={categorySections}
      showFileList={showFileList}
      voicesWithWarnings={voicesWithWarnings}
    />
  );
  const centerContent = (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0">
        <ImportWorkspaceHeader
          maggiorazioniCount={activeVoiceBreakdown.maggiorazioneCount}
          metadata={activeMetadata}
          regularCount={activeVoiceBreakdown.regularCount}
          summary={activeExtractionSummary}
        />
        <div className="mt-2">
          <ExtractionAuditStrip summary={activeExtractionSummary} />
        </div>
        {maggiorazioniVoices.length > 0 ? (
          <div className="mt-2 max-h-[22dvh] shrink-0 overflow-auto">
            <MaggiorazioniPanel
              maggiorazioni={maggiorazioniVoices}
              onShowWarningDetail={setWarningDetailVoice}
            />
          </div>
        ) : null}
      </div>
      {!isActiveFileReady && activeVoiceBreakdown.regularCount > 0 ? (
        <div
          aria-live="polite"
          className="mt-3 flex shrink-0 items-center gap-2.5 rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5 px-3.5 py-2.5"
          role="status"
        >
          <Loader className="tariff-import-loader-spin size-4 shrink-0 text-[var(--accent-primary)]" />
          <p className="text-12px font-medium text-[var(--text-secondary)]">
            Organizzazione{" "}
            <span className="font-bold tabular-nums text-[var(--text-primary)]">
              {activeVoiceBreakdown.regularCount.toLocaleString("it-IT")}
            </span>{" "}
            voci
            {activeVoiceBreakdown.maggiorazioneCount > 0 ? (
              <>
                {" "}
                e{" "}
                <span className="font-bold tabular-nums text-[var(--text-primary)]">
                  {activeVoiceBreakdown.maggiorazioneCount.toLocaleString("it-IT")}
                </span>{" "}
                maggiorazioni
              </>
            ) : null}{" "}
            per la griglia…
          </p>
        </div>
      ) : null}
      <div
        className="mt-3 flex h-0 min-h-0 flex-1 flex-col overflow-hidden"
        data-tariff-preview-scroll
      >
        {isActiveFileReady ? (
          <VoicesPanel
            askDeleteVoice={askDeleteVoice}
            duplicateCodes={duplicateCodes}
            editableGroups={gridGroups}
            gridRef={gridRef}
            gridScrollTarget={gridScrollTarget}
            gridValidation={activeGridValidation}
            handleAddVoice={handleAddVoice}
            hasVoices={hasVoices}
            isSwitching={isSwitchingFile}
            onDraftActivity={handleGridDraftActivity}
            onDraftCommit={commitGridDraftField}
            prebuiltGridLayout={activeGridLayout}
            scrollLayout={scrollLayout}
            updateCategorySections={updateCategorySections}
            updateVoice={updateVoice}
          />
        ) : null}
      </div>
    </div>
  );
  const topBar = pageView ? null : (
    <div className="min-w-0">
      <h3 className="truncate text-20px font-semibold leading-tight text-[var(--text-primary)]">
        {metadatas.length > 1
          ? `${metadatas.length} tariffari da importare`
          : (activeMetadata?.name ?? "Preview importazione")}
      </h3>
      <p className="mt-1 text-12px font-medium text-[var(--text-secondary)]">
        Revisione voci estratte dal PDF
      </p>
    </div>
  );

  const actionBar = pageView ? (
    <ImportPreviewActionBar
      canConfirm={canConfirm}
      draftedFiles={draftedFiles}
      isBusy={confirmBusy}
      isSavingDraft={isSavingDraft}
      hasSavedDraftOnDisk={hasSavedDraftOnDisk}
      localActiveIndex={localActiveIndex}
      markAllFilesReviewed={markAllFilesReviewed}
      metadatasCount={metadatas.length}
      modalReviewedFiles={modalReviewedFiles}
      onCancel={onCancel}
      onConfirm={() => void confirmChanges()}
      removeActiveFile={removeActiveFile}
      saveDraft={saveDraft}
      toggleActiveFileDraft={toggleActiveFileDraft}
      toggleActiveFileReviewed={toggleActiveFileReviewed}
    />
  ) : (
    <ModalFooter
      canConfirm={canConfirm}
      confirmChanges={() => void confirmChanges()}
      discardDraft={discardDraft}
      draftedFiles={draftedFiles}
      hasSavedDraftOnDisk={hasSavedDraftOnDisk}
      isBusy={confirmBusy}
      localActiveIndex={localActiveIndex}
      markAllFilesReviewed={markAllFilesReviewed}
      metadatas={metadatas}
      modalReviewedFiles={modalReviewedFiles}
      onCancel={onCancel}
      removeActiveFile={removeActiveFile}
      saveDraft={saveDraft}
      toggleActiveFileDraft={toggleActiveFileDraft}
      toggleActiveFileReviewed={toggleActiveFileReviewed}
    />
  );

  const workspace = (
    <ImportPreviewWorkspace
      actionBar={actionBar}
      center={centerContent}
      layoutMode={pageView ? "page" : "modal"}
      sidebar={sidebarNode}
      topBar={topBar}
    />
  );

  return pageView ? (
    <>
      {workspace}
      {confirmLoadingModal}
      {deleteDialog}
      {warningDetailVoice ? (
        <WarningDetailModal
          voice={warningDetailVoice}
          onClose={() => setWarningDetailVoice(null)}
        />
      ) : null}
    </>
  ) : (
    <div className="fixed inset-0 z-[var(--z-dialog)] flex items-center justify-center bg-[var(--overlay-bg)] px-3 backdrop-blur-sm">
      <m.button
        aria-label="Chiudi"
        className="absolute inset-0 cursor-default"
        disabled={confirmBusy}
        onClick={onCancel}
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <m.div
        className="relative flex max-h-[94vh] w-full max-w-[min(1600px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-4xl bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]"
        initial={{ opacity: 0, scale: 0.98, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 6 }}
        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-22px bg-[var(--surface-base)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
          {workspace}
        </div>
      </m.div>
      {confirmLoadingModal}
      {deleteDialog}
      {warningDetailVoice ? (
        <WarningDetailModal
          voice={warningDetailVoice}
          onClose={() => setWarningDetailVoice(null)}
        />
      ) : null}
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
                    {w.refCode ? ` Â· ${w.refCode}` : ""}
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: maggiorazioni.length,
    estimateSize: () => 46,
    getScrollElement: () => scrollRef.current,
    overscan: 8,
  });

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
        <div
          className="mt-2 max-h-[260px] overflow-auto rounded-14px border border-[var(--border-subtle)]/70 bg-[var(--surface-base)]/42"
          ref={scrollRef}
        >
          <div className="grid min-w-[800px] grid-cols-[160px_1fr_88px_88px_100px] gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-muted)]/44 px-4 py-2.5 text-10px font-bold uppercase tracking-0_08em text-[var(--text-secondary)]">
            <span>Codice</span>
            <span>Voce / Descrizione</span>
            <span className="text-right">% Magg.</span>
            <span className="text-right">% Manod.</span>
            <span className="text-right">Valore</span>
          </div>
          <div
            className="relative min-w-[800px]"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const m = maggiorazioni[virtualRow.index];
              if (!m) return null;
              const cells = formatMaggiorazioneDisplayCells(m);
              return (
                <div
                  className="absolute left-0 top-0 grid w-full grid-cols-[160px_1fr_88px_88px_100px] items-center gap-3 border-b border-[var(--border-subtle)]/50 px-4 py-2.5"
                  key={m.id}
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
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
                    {m.description || "\u2014"}
                  </span>
                  <span className="text-right text-12px font-semibold text-[var(--text-secondary)]">
                    {cells.maggiorazionePercent}
                  </span>
                  <span className="text-right text-12px font-semibold text-[var(--text-secondary)]">
                    {cells.laborPercent}
                  </span>
                  <span className="text-right text-12px font-bold text-[var(--text-primary)]">
                    {cells.economicValue}
                  </span>
                </div>
              );
            })}
          </div>
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
