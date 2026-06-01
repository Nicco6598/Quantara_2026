import { useVirtualizer } from "@tanstack/react-virtual";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleDashed,
  FileWarning,
  Info,
  List,
  Save,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DesktopTariffVoice } from "@/lib/desktopData";
import type {
  ImportCrossFileErrorRow,
  ImportPreviewFileItem,
} from "../../utils/import-preview-helpers";
import type { TariffGridSectionSummary } from "../EditableTariffVoicesGrid";

type PanelSection = "errors" | "categories" | "notes";

function StatusLegend() {
  const items = [
    { icon: CheckCircle2, label: "Revisionato", className: "text-[var(--success-base)]" },
    { icon: Save, label: "In bozza", className: "text-[var(--warning-base)]" },
    { icon: AlertTriangle, label: "Errori", className: "text-[var(--danger-base)]" },
    { icon: CircleDashed, label: "Indice", className: "text-[var(--text-tertiary)]" },
    { icon: Circle, label: "Pronto", className: "text-[var(--accent-primary)]" },
  ] as const;

  return (
    <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-10px font-semibold text-[var(--text-tertiary)]">
      {items.map(({ icon: Icon, label, className }) => (
        <span className="inline-flex items-center gap-1" key={label}>
          <Icon className={`size-3 ${className}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

function statusMeta(status: ImportPreviewFileItem["status"]) {
  switch (status) {
    case "error":
      return {
        activeRing: "ring-[var(--danger-base)]/40",
        dot: "bg-[var(--danger-base)]",
        ring: "ring-[var(--danger-base)]/25",
      };
    case "reviewed":
      return {
        activeRing: "ring-[var(--success-base)]/40",
        dot: "bg-[var(--success-base)]",
        ring: "ring-[var(--success-base)]/25",
      };
    case "draft":
      return {
        activeRing: "ring-[var(--warning-base)]/40",
        dot: "bg-[var(--warning-base)]",
        ring: "ring-[var(--warning-base)]/25",
      };
    case "empty":
      return {
        activeRing: "ring-[var(--text-tertiary)]/40",
        dot: "bg-[var(--text-tertiary)]",
        ring: "ring-[var(--border-subtle)]",
      };
    case "pending":
      return {
        activeRing: "ring-[var(--text-tertiary)]/35",
        dot: "bg-[var(--text-tertiary)]",
        ring: "ring-dashed ring-[var(--border-subtle)]",
      };
    default:
      return {
        activeRing: "ring-[var(--accent-primary)]/40",
        dot: "bg-[var(--accent-primary)]",
        ring: "ring-[var(--accent-primary)]/20",
      };
  }
}

function StatusIcon({ status }: { status: ImportPreviewFileItem["status"] }) {
  switch (status) {
    case "error":
      return <AlertTriangle className="size-3.5 shrink-0 text-[var(--danger-base)]" />;
    case "draft":
      return <Save className="size-3.5 shrink-0 text-[var(--warning-base)]" />;
    case "reviewed":
      return <CheckCircle2 className="size-3.5 shrink-0 text-[var(--success-base)]" />;
    case "empty":
      return <FileWarning className="size-3.5 shrink-0 text-[var(--text-tertiary)]" />;
    case "pending":
      return <CircleDashed className="size-3.5 shrink-0 text-[var(--text-tertiary)]" />;
    default:
      return <Circle className="size-3.5 shrink-0 text-[var(--accent-primary)]" />;
  }
}

function formatFileRailStats(item: ImportPreviewFileItem): string {
  if (item.voiceCount === 0) return "Nessuna voce estratta";
  const voices = `${item.voiceCount.toLocaleString("it-IT")} voci`;
  if (item.blockingCount > 0) {
    return `${voices} · ${item.blockingCount.toLocaleString("it-IT")} errori`;
  }
  if (!item.isGridReady) {
    return `${voices} · indice al click`;
  }
  return voices;
}

function FileRailRow({
  active,
  item,
  onSelect,
}: {
  active: boolean;
  item: ImportPreviewFileItem;
  onSelect: (index: number) => void;
}) {
  const meta = statusMeta(item.status);
  const statsLine = formatFileRailStats(item);
  return (
    <button
      className={`flex w-full items-start gap-2 rounded-xl px-2.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] ${
        active
          ? `bg-[var(--accent-primary)] text-[var(--text-inverse)] shadow-sm ring-2 ${meta.activeRing}`
          : `bg-[var(--surface-base)]/80 hover:bg-[var(--surface-base)] ring-1 ${meta.ring}`
      }`}
      onClick={() => onSelect(item.index)}
      type="button"
    >
      <span className="mt-0.5 flex shrink-0 flex-col items-center gap-1">
        <span className={`size-2 rounded-full ${active ? "bg-[var(--text-inverse)]" : meta.dot}`} />
        {!active ? <StatusIcon status={item.status} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="block min-w-0 flex-1 truncate text-12px font-bold leading-tight">
            {item.metadata.name}
          </span>
          {item.isReviewed ? (
            <span
              className={`shrink-0 rounded px-1 py-px text-8px font-bold uppercase tracking-wide ${
                active
                  ? "bg-[var(--text-inverse)]/20 text-[var(--text-inverse)]"
                  : "bg-[var(--success-soft)] text-[var(--success-base)]"
              }`}
            >
              Rev.
            </span>
          ) : null}
          {item.isDrafted ? (
            <span
              className={`shrink-0 rounded px-1 py-px text-8px font-bold uppercase tracking-wide ${
                active
                  ? "bg-[var(--text-inverse)]/20 text-[var(--text-inverse)]"
                  : "bg-[var(--warning-soft)] text-[var(--warning-base)]"
              }`}
            >
              Bozza
            </span>
          ) : null}
        </span>
        <span
          className={`mt-0.5 block truncate text-10px font-semibold ${
            active ? "text-[var(--text-inverse)]/85" : "text-[var(--text-secondary)]"
          }`}
        >
          {statsLine}
        </span>
      </span>
      {item.blockingCount > 0 ? (
        <span
          className={`shrink-0 rounded-md px-1.5 py-0.5 text-10px font-bold tabular-nums ${
            active
              ? "bg-[var(--text-inverse)]/20 text-[var(--text-inverse)]"
              : "bg-[var(--danger-soft)] text-[var(--danger-base)]"
          }`}
        >
          {item.blockingCount}
        </span>
      ) : null}
    </button>
  );
}

function SectionToggle({
  active,
  count,
  label,
  onClick,
  tone = "default",
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
  tone?: "danger" | "default" | "info";
}) {
  return (
    <button
      className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-10px font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] ${
        active
          ? tone === "danger"
            ? "bg-[var(--danger-base)] text-[var(--text-inverse)]"
            : tone === "info"
              ? "bg-[var(--info-base)] text-[var(--text-inverse)]"
              : "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
          : "bg-[var(--surface-base)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="truncate">{label}</span>
      {count > 0 ? (
        <span
          className={`rounded-full px-1 py-0.5 text-9px tabular-nums ${
            active ? "bg-[var(--text-inverse)]/20" : "bg-[var(--bg-muted-strong)]"
          }`}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}

function ErrorRow({
  row,
  onFocus,
}: {
  row: ImportCrossFileErrorRow;
  onFocus: (fileIndex: number, rowIndex: number, field: string) => void;
}) {
  return (
    <button
      className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] ${
        row.isActiveFile
          ? "border-[var(--danger-base)]/20 bg-[var(--surface-base)] hover:border-[var(--danger-base)]/35"
          : "border-[var(--danger-base)]/35 bg-[color-mix(in_srgb,var(--danger-base)_5%,var(--surface-base)_95%)] hover:bg-[color-mix(in_srgb,var(--danger-base)_10%,var(--surface-base)_90%)]"
      }`}
      onClick={() => onFocus(row.fileIndex, row.index, row.field)}
      type="button"
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--danger-soft)] text-10px font-bold tabular-nums text-[var(--danger-base)]">
        {row.index + 1}
      </span>
      <span className="min-w-0 flex-1">
        {!row.isActiveFile ? (
          <span className="mb-0.5 block truncate text-9px font-bold uppercase tracking-wide text-[var(--danger-base)]">
            {row.fileName}
          </span>
        ) : null}
        <span className="block truncate text-11px font-bold text-[var(--text-primary)]">
          {row.code}
        </span>
        <span className="block text-10px font-semibold text-[var(--danger-base)]">{row.label}</span>
      </span>
      <ChevronRight className="size-3 shrink-0 text-[var(--text-tertiary)]" />
    </button>
  );
}

export function ImportPreviewSidebar({
  activeFileBlockingCount,
  activeFileName,
  activeIndex,
  allErrorRows,
  errorRowCount,
  files,
  onFocusCategory,
  onFocusCell,
  onSelectFile,
  onShowWarningDetail,
  otherFilesErrorCount,
  reviewedCount,
  sections,
  showFileList,
  voicesWithWarnings,
}: {
  activeFileBlockingCount: number;
  activeFileName: string;
  activeIndex: number;
  allErrorRows: ImportCrossFileErrorRow[];
  errorRowCount?: number;
  files: ImportPreviewFileItem[];
  onFocusCategory: (categoryId: string) => void;
  onFocusCell: (fileIndex: number, rowIndex: number, field: string) => void;
  onSelectFile: (index: number) => void;
  onShowWarningDetail: (voice: DesktopTariffVoice) => void;
  otherFilesErrorCount: number;
  reviewedCount: number;
  sections: TariffGridSectionSummary[];
  showFileList: boolean;
  voicesWithWarnings: DesktopTariffVoice[];
}) {
  const [query, setQuery] = useState("");
  const displayedErrorCount = errorRowCount ?? allErrorRows.length;
  const errorsPendingDetail = displayedErrorCount > 0 && allErrorRows.length === 0;
  const [section, setSection] = useState<PanelSection>(() =>
    displayedErrorCount > 0 ? "errors" : "categories",
  );
  const filesScrollRef = useRef<HTMLDivElement>(null);
  const detailScrollRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to top intentionally on section change
  useEffect(() => {
    detailScrollRef.current?.scrollTo({ top: 0 });
  }, [section]);

  const filteredFiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return files;
    return files.filter(
      (file) =>
        file.metadata.name.toLowerCase().includes(normalized) ||
        file.metadata.sourceName?.toLowerCase().includes(normalized),
    );
  }, [files, query]);

  const fileVirtualizer = useVirtualizer({
    count: filteredFiles.length,
    estimateSize: () => 68,
    getScrollElement: () => filesScrollRef.current,
    overscan: 6,
  });

  const errorVirtualizer = useVirtualizer({
    count: allErrorRows.length,
    estimateSize: () => 58,
    getScrollElement: () => detailScrollRef.current,
    overscan: 10,
  });

  const sectionVirtualizer = useVirtualizer({
    count: sections.length,
    estimateSize: () => 54,
    getScrollElement: () => detailScrollRef.current,
    overscan: 10,
  });

  const notesVirtualizer = useVirtualizer({
    count: voicesWithWarnings.length,
    estimateSize: () => 52,
    getScrollElement: () => detailScrollRef.current,
    overscan: 10,
  });

  const errorTotal = useMemo(
    () => files.reduce((sum, file) => sum + file.blockingCount, 0),
    [files],
  );

  const errorSections = useMemo(() => sections.filter((item) => item.errorCount > 0), [sections]);
  const activeFileErrorRowCount = useMemo(
    () => allErrorRows.reduce((sum, row) => sum + (row.isActiveFile ? 1 : 0), 0),
    [allErrorRows],
  );

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/20">
      <div className="shrink-0 space-y-2 border-b border-[var(--border-subtle)]/70 px-3 py-2.5">
        <div className="text-10px font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
          Revisione import
        </div>
        {showFileList ? (
          <>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-12px font-bold text-[var(--text-primary)]">
              <span>{files.length.toLocaleString("it-IT")} file</span>
              <span className="rounded-full bg-[var(--success-soft)] px-1.5 py-0.5 text-10px font-bold text-[var(--success-base)]">
                {reviewedCount}/{files.length} revisionati
              </span>
              {errorTotal > 0 ? (
                <span className="rounded-full bg-[var(--danger-soft)] px-1.5 py-0.5 text-10px font-bold text-[var(--danger-base)]">
                  {errorTotal.toLocaleString("it-IT")} problemi
                </span>
              ) : null}
            </div>
            <StatusLegend />
            <label className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                className="h-8 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] pl-8 pr-2 text-11px font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cerca tariffario…"
                value={query}
              />
            </label>
          </>
        ) : (
          <div className="truncate text-13px font-bold text-[var(--text-primary)]">
            {activeFileName}
          </div>
        )}
      </div>

      {showFileList ? (
        <div
          className="min-h-[120px] max-h-[38%] shrink-0 overflow-auto border-b border-[var(--border-subtle)]/70 p-2"
          ref={filesScrollRef}
        >
          <div
            className="relative w-full"
            style={{ height: `${fileVirtualizer.getTotalSize()}px` }}
          >
            {fileVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = filteredFiles[virtualRow.index];
              if (!item) return null;
              return (
                <div
                  className="absolute left-0 top-0 w-full pb-1"
                  key={item.index}
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <FileRailRow
                    active={item.index === activeIndex}
                    item={item}
                    onSelect={onSelectFile}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 space-y-2 border-b border-[var(--border-subtle)]/70 px-3 py-2">
          <div className="truncate text-12px font-bold text-[var(--text-primary)]">
            {activeFileName}
          </div>
          {displayedErrorCount > 0 ? (
            <div className="space-y-0.5">
              <div className="inline-flex items-center gap-1 rounded-full bg-[var(--danger-soft)] px-2 py-0.5 text-10px font-bold text-[var(--danger-base)]">
                <AlertTriangle className="size-3" />
                {displayedErrorCount.toLocaleString("it-IT")} errori
              </div>
              {otherFilesErrorCount > 0 ? (
                <p className="text-10px font-semibold text-[var(--danger-base)]">
                  {otherFilesErrorCount.toLocaleString("it-IT")} su altri file
                </p>
              ) : null}
              {activeFileBlockingCount > 0 ? (
                <p className="text-10px text-[var(--text-secondary)]">
                  {errorsPendingDetail
                    ? "Apertura elenco errori…"
                    : `${activeFileErrorRowCount.toLocaleString("it-IT")} su questo file`}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-10px font-semibold text-[var(--success-base)]">Nessun blocco</p>
          )}
          <div className="flex gap-1">
            <SectionToggle
              active={section === "errors"}
              count={displayedErrorCount}
              label="Errori"
              onClick={() => setSection("errors")}
              tone="danger"
            />
            <SectionToggle
              active={section === "categories"}
              count={sections.length}
              label="Indice"
              onClick={() => setSection("categories")}
            />
            <SectionToggle
              active={section === "notes"}
              count={voicesWithWarnings.length}
              label="Note"
              onClick={() => setSection("notes")}
              tone="info"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2" ref={detailScrollRef}>
          {section === "errors" ? (
            allErrorRows.length === 0 ? (
              errorsPendingDetail ? (
                <div className="rounded-xl border border-[var(--danger-base)]/20 bg-[var(--danger-soft)]/40 px-3 py-2.5 text-11px font-medium text-[var(--text-secondary)]">
                  <p className="font-semibold text-[var(--danger-base)]">
                    {displayedErrorCount.toLocaleString("it-IT")}{" "}
                    {displayedErrorCount === 1 ? "errore rilevato" : "errori rilevati"}
                  </p>
                  <p className="mt-1">
                    Caricamento posizioni nella griglia… Se la lista non compare, attendi qualche
                    secondo o cambia scheda file.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-[var(--success-soft)] px-3 py-2.5 text-11px font-semibold text-[var(--success-base)]">
                  Nessun errore bloccante.
                </div>
              )
            ) : (
              <div
                className="relative w-full"
                style={{ height: `${errorVirtualizer.getTotalSize()}px` }}
              >
                {errorVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = allErrorRows[virtualRow.index];
                  if (!row) return null;
                  return (
                    <div
                      className="absolute left-0 top-0 w-full pb-1"
                      key={`${row.fileIndex}-${row.index}-${row.field}`}
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                    >
                      <ErrorRow onFocus={onFocusCell} row={row} />
                    </div>
                  );
                })}
              </div>
            )
          ) : null}

          {section === "categories" ? (
            <div>
              {sections.length === 0 ? (
                <p className="px-1 py-3 text-center text-11px font-medium text-[var(--text-secondary)]">
                  Indice disponibile dopo il caricamento del ledger.
                </p>
              ) : (
                <div
                  className="relative w-full"
                  style={{ height: `${sectionVirtualizer.getTotalSize()}px` }}
                >
                  {sectionVirtualizer.getVirtualItems().map((virtualRow) => {
                    const item = sections[virtualRow.index];
                    if (!item) return null;
                    return (
                      <div
                        className="absolute left-0 top-0 w-full pb-1"
                        key={item.id}
                        style={{ transform: `translateY(${virtualRow.start}px)` }}
                      >
                        <button
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--bg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
                          onClick={() => onFocusCategory(item.id)}
                          type="button"
                        >
                          <span
                            className={`flex size-6 shrink-0 items-center justify-center rounded-md text-10px font-bold ${
                              item.errorCount > 0
                                ? "bg-[var(--danger-soft)] text-[var(--danger-base)]"
                                : "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                            }`}
                          >
                            {item.categoria || "-"}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-11px font-bold text-[var(--text-primary)]">
                              Cat. {item.categoria || "Altre"}
                            </span>
                            <span className="block text-10px text-[var(--text-secondary)]">
                              {item.rowsCount.toLocaleString("it-IT")} righe
                              {item.errorCount > 0
                                ? ` · ${item.errorCount.toLocaleString("it-IT")} err.`
                                : ""}
                            </span>
                          </span>
                          <List className="size-3 text-[var(--text-tertiary)]" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {errorSections.length > 0 ? (
                <p className="px-1 pt-1 text-9px font-semibold text-[var(--text-tertiary)]">
                  {errorSections.length.toLocaleString("it-IT")} categorie con errori
                </p>
              ) : null}
            </div>
          ) : null}

          {section === "notes" ? (
            <div>
              <p className="px-1 pb-1 text-10px text-[var(--text-tertiary)]">
                Note parser — non bloccano l&apos;import.
              </p>
              {voicesWithWarnings.length === 0 ? (
                <p className="px-1 py-3 text-center text-11px font-medium text-[var(--text-secondary)]">
                  Nessuna nota su questo file.
                </p>
              ) : (
                <div
                  className="relative w-full"
                  style={{ height: `${notesVirtualizer.getTotalSize()}px` }}
                >
                  {notesVirtualizer.getVirtualItems().map((virtualRow) => {
                    const voice = voicesWithWarnings[virtualRow.index];
                    if (!voice) return null;
                    return (
                      <div
                        className="absolute left-0 top-0 w-full pb-1"
                        key={voice.id}
                        style={{ transform: `translateY(${virtualRow.start}px)` }}
                      >
                        <button
                          className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--bg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
                          onClick={() => onShowWarningDetail(voice)}
                          type="button"
                        >
                          <Info className="mt-0.5 size-3 shrink-0 text-[var(--info-base)]" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-11px font-bold text-[var(--text-primary)]">
                              {voice.officialCode}
                            </span>
                            <span className="block text-10px text-[var(--text-secondary)]">
                              {(voice.warnings?.length ?? 0).toLocaleString("it-IT")} nota/e
                            </span>
                          </span>
                          <ChevronRight className="size-3 shrink-0 text-[var(--text-tertiary)]" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
