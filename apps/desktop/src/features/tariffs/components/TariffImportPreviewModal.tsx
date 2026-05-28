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
  Loader,
  MapPinned,
  Save,
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
import type { VoiceGroup } from "../utils/tariff-grouping";
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
  buildAllImportErrorRows,
  buildRegularIndexMap,
  getGridBlockingCount,
  getImportFileStatus,
  isMaggiorazioneVoice,
  estimateImportBlockingIssues,
  useImportPreviewDerivations,
  useImportPreviewSessionPrewarm,
} from "../utils/import-preview-helpers";
import {
  ensureImportPreviewInvalidRows,
  ensureImportPreviewSessionGroups,
} from "../utils/import-preview-session-cache";
import { TariffImportConfirmLoadingModal } from "./TariffImportConfirmLoadingModal";
import { ImportPreviewActionBar } from "./import-preview/ImportPreviewActionBar";
import {
  EditableTariffVoicesGrid,
  type EditableTariffVoicesGridHandle,
  type TariffGridDraftChange,
  type TariffGridScrollTarget,
  type TariffGridSectionSummary,
} from "./EditableTariffVoicesGrid";
import { ImportPreviewSidebar } from "./import-preview/ImportPreviewSidebar";
import { ImportPreviewWorkspace } from "./import-preview/ImportPreviewWorkspace";
import type { ImportPreviewFileItem } from "../utils/import-preview-helpers";

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
  const modKey = isMacPlatform() ? "âŒ˜" : "Ctrl";
  const deleteKey = isMacPlatform() ? "âŒ«" : "Del";
  const groups = [
    {
      label: "Navigazione",
      hints: [{ action: "File", keys: [modKey, "Shift", "â†/â†’"] }],
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
  gridValidation,
  handleAddVoice,
  isSwitching,
  onDraftActivity,
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
          <Loader className="size-6 animate-spin text-[var(--accent-primary)] [animation-duration:1.35s]" />
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
          onSectionsChange={updateCategorySections}
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
          <Button disabled={isBusy} onClick={onCancel} variant="outline">
            Annulla
          </Button>
          <Button disabled={isBusy} icon={Save} onClick={saveDraft} variant="secondary">
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
          icon={isBusy ? Loader : CheckCircle2}
          onClick={confirmChanges}
          variant="primary"
        >
          {isBusy
            ? "Salvataggio in corso…"
            : metadatas.length > 1
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
  return voices.map((voice, voiceIndex) => {
    const voiceChanges = changes.filter((change) => change.rowIndex === voiceIndex);
    if (voiceChanges.length === 0) return voice;
    return voiceChanges.reduce(
      (nextVoice, change) => Object.assign(nextVoice, { [change.field]: change.value }),
      { ...voice },
    );
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
  onPreviewReady,
  onReviewedFilesChange,
  pageView = false,
}: {
  activeIndex?: number;
  existingBookIds?: (string | undefined)[];
  isBusy: boolean;
  metadatas: TariffPdfMetadata[];
  onCancel: () => void;
  onConfirm: (metadatas: TariffImportPreviewResult[]) => void | Promise<void>;
  onActiveIndexChange?: (index: number) => void;
  onDraftedFilesChange?: (draftedFiles: Set<number>) => void;
  onMetadatasChange?: (metadatas: TariffPdfMetadata[]) => void;
  onPageCanConfirmChange?: (canConfirm: boolean) => void;
  onPreviewReady?: () => void;
  onReviewedFilesChange?: (reviewedFiles: Set<number>) => void;
  pageView?: boolean;
}) {
  const { notify } = useToast();
  const onPreviewReadyRef = useRef(onPreviewReady);
  onPreviewReadyRef.current = onPreviewReady;
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
  const [draftRevision, setDraftRevision] = useState(0);
  const gridRef = useRef<EditableTariffVoicesGridHandle>(null);
  const sectionsByFileRef = useRef<Map<number, TariffGridSectionSummary[]>>(new Map());
  const scrollToVoiceIdRef = useRef<string | null>(null);
  const pendingCellFocusRef = useRef<{
    field: keyof DesktopTariffVoice;
    fileIndex: number;
    rowIndex: number;
  } | null>(null);
  const [voiceAddedNonce, setVoiceAddedNonce] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmBusy = isBusy || isConfirming;
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
  const sessionPrewarmRevision = useImportPreviewSessionPrewarm(metadatas);
  const {
    regularByFile,
    groupsByFile,
    gridValidationByFile,
    invalidRowsByFile,
    isActiveFileReady,
  } = useImportPreviewDerivations(editableVoicesList, localActiveIndex, sessionPrewarmRevision);
  const displayVoices = editableVoicesList[localActiveIndex] ?? [];
  const displayRegularVoices = regularByFile[localActiveIndex] ?? [];
  const gridVoices = editableVoicesList[renderIndex] ?? [];
  const regularVoices = regularByFile[renderIndex] ?? [];
  const maggiorazioniVoices = useMemo(() => {
    const mag: DesktopTariffVoice[] = [];
    for (const voice of displayVoices) {
      if (isMaggiorazioneVoice(voice)) mag.push(voice);
    }
    return mag;
  }, [displayVoices]);
  const activeValidation = gridValidationByFile[renderIndex] ?? emptyImportValidation;
  const regularVoicesForValidation = useMemo(() => {
    void draftRevision;
    const parsedChanges = (gridRef.current?.peekDraftChanges() ?? []).map(parseDraftChange);
    return applyDraftChangesToVoiceList(regularVoices, parsedChanges);
  }, [regularVoices, draftRevision]);
  const activeGridValidation = useMemo(() => {
    if (draftRevision === 0) {
      return gridValidationByFile[renderIndex] ?? emptyImportValidation;
    }
    return getImportValidation(regularVoicesForValidation);
  }, [draftRevision, gridValidationByFile, regularVoicesForValidation, renderIndex]);
  const activeGridBlockingCount = getGridBlockingCount(
    activeGridValidation,
    activeMetadata,
    regularVoices.length > 0,
  );
  const activeExtractionSummary = useMemo(
    () => buildExtractionSummary(activeMetadata, displayVoices),
    [activeMetadata, displayVoices],
  );
  const hasVoices = displayRegularVoices.length > 0;
  const canConfirm =
    metadatas.length > 0 &&
    metadatas.every((_, i) => {
      const voices = editableVoicesList[i];
      const validation = gridValidationByFile[i];
      const isDrafted = draftedFiles.has(i);
      return (
        voices &&
        voices.length > 0 &&
        validation &&
        (isDrafted || (validation.invalidCount === 0 && modalReviewedFiles.has(i)))
      );
    });
  const duplicateCodes = useMemo(
    () => new Set<string>(activeValidation.duplicateExamples),
    [activeValidation],
  );
  const editableGroups = groupsByFile[renderIndex] ?? [];
  const deferredEditableGroups = useDeferredValue(editableGroups);
  const regularIndexMap = useMemo(() => buildRegularIndexMap(gridVoices), [gridVoices]);

  const voicesWithWarnings = useMemo(
    () => displayVoices.filter((v) => (v.warnings?.length ?? 0) > 0),
    [displayVoices],
  );

  const allErrorRows = useMemo(
    () =>
      buildAllImportErrorRows({
        activeFileIndex: localActiveIndex,
        invalidRowsByFile,
        metadatas,
      }),
    [invalidRowsByFile, localActiveIndex, metadatas],
  );
  const { otherFiles: otherFilesErrorCount, total: estimatedErrorTotal } = useMemo(
    () =>
      estimateImportBlockingIssues({
        activeFileIndex: localActiveIndex,
        gridValidationByFile,
        metadatas,
        regularByFile,
      }),
    [gridValidationByFile, localActiveIndex, metadatas, regularByFile],
  );
  const errorRowCount = Math.max(allErrorRows.length, estimatedErrorTotal);
  const importFileItems = useMemo<ImportPreviewFileItem[]>(
    () =>
      metadatas.map((metadata, index) => {
        const gridValidation = gridValidationByFile[index] ?? emptyImportValidation;
        const regular = regularByFile[index] ?? [];
        const blockingCount = getGridBlockingCount(gridValidation, metadata, regular.length > 0);
        return {
          blockingCount,
          index,
          metadata,
          status: getImportFileStatus({
            blockingCount,
            hasVoices: regular.length > 0,
            isDrafted: draftedFiles.has(index),
            isReviewed: modalReviewedFiles.has(index),
          }),
          voiceCount: regular.length,
        };
      }),
    [draftedFiles, gridValidationByFile, metadatas, modalReviewedFiles, regularByFile],
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
    const parsedChanges = remapGridDraftChanges(
      (gridRef.current?.drainDraftChanges() ?? []).map(parseDraftChange),
      regularIndexMap,
    );
    if (parsedChanges.length > 0) {
      dispatch({ type: "APPLY_DRAFTS", activeIndex: localActiveIndex, changes: parsedChanges });
    }
    return applyDraftChangesToVoicesList(editableVoicesList, localActiveIndex, parsedChanges);
  }, [editableVoicesList, localActiveIndex, regularIndexMap]);

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

  const confirmChanges = useCallback(async () => {
    if (confirmBusy) return;
    setIsConfirming(true);
    try {
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

  const previewReadyNotifiedRef = useRef(false);
  useEffect(() => {
    if (!pageView || !isActiveFileReady) return;
    if (previewReadyNotifiedRef.current) return;

    const frameId = requestAnimationFrame(() => {
      if (previewReadyNotifiedRef.current) return;
      previewReadyNotifiedRef.current = true;
      onPreviewReadyRef.current?.();
    });
    return () => cancelAnimationFrame(frameId);
  }, [isActiveFileReady, pageView]);

  useEffect(() => {
    void draftSignature;
    previewReadyNotifiedRef.current = false;
  }, [draftSignature]);

  const initialSyncRef = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional â€” runs once on mount, subsequent changes handled by individual action handlers
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
      if (index === localActiveIndex) return;
      const fromIndex = localActiveIndex;
      const fromMap = buildRegularIndexMap(editableVoicesList[fromIndex] ?? []);
      startTransition(() => {
        const parsedChanges = remapGridDraftChanges(
          (gridRef.current?.drainDraftChanges() ?? []).map(parseDraftChange),
          fromMap,
        );
        if (parsedChanges.length > 0) {
          dispatch({ type: "APPLY_DRAFTS", activeIndex: fromIndex, changes: parsedChanges });
        }
        ensureImportPreviewSessionGroups(index);
        ensureImportPreviewInvalidRows(index);
        onActiveIndexChange?.(index);
        setDraftRevision(0);
        if (!pageView) dispatch({ type: "SWITCH_FILE", index });
      });
    },
    [editableVoicesList, localActiveIndex, onActiveIndexChange, pageView],
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
          maggiorazioniCount={maggiorazioniVoices.length}
          metadata={activeMetadata}
          regularCount={displayRegularVoices.length}
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
      <div
        className="mt-3 flex h-0 min-h-0 flex-1 flex-col overflow-hidden"
        data-tariff-preview-scroll
      >
        <VoicesPanel
          askDeleteVoice={askDeleteVoice}
          duplicateCodes={duplicateCodes}
          editableGroups={deferredEditableGroups}
          gridRef={gridRef}
          gridScrollTarget={gridScrollTarget}
          gridValidation={activeGridValidation}
          handleAddVoice={handleAddVoice}
          hasVoices={hasVoices}
          isSwitching={isSwitchingFile || !isActiveFileReady}
          onDraftActivity={handleGridDraftActivity}
          scrollLayout={scrollLayout}
          updateCategorySections={updateCategorySections}
          updateVoice={updateVoice}
        />
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
      loadedDraft={loadedDraft}
      localActiveIndex={localActiveIndex}
      markActiveFileReviewed={markActiveFileReviewed}
      markAllFilesReviewed={markAllFilesReviewed}
      metadatasCount={metadatas.length}
      modalReviewedFiles={modalReviewedFiles}
      onCancel={onCancel}
      onConfirm={() => void confirmChanges()}
      removeActiveFile={removeActiveFile}
      saveDraft={saveDraft}
      toggleActiveFileDraft={toggleActiveFileDraft}
    />
  ) : (
    <ModalFooter
      canConfirm={canConfirm}
      confirmChanges={() => void confirmChanges()}
      discardDraft={discardDraft}
      draftedFiles={draftedFiles}
      isBusy={confirmBusy}
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
                {m.description || "â€”"}
              </span>
              <span className="text-right text-12px font-semibold text-[var(--text-secondary)]">
                {m.laborPercentage != null ? `${m.laborPercentage}%` : "â€”"}
              </span>
              <span className="text-right text-12px font-bold text-[var(--text-primary)]">
                {Number.isFinite(m.unitPrice)
                  ? `${m.unitPrice.toLocaleString("it-IT", { minimumFractionDigits: 2 })} â‚¬`
                  : "â€”"}
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
