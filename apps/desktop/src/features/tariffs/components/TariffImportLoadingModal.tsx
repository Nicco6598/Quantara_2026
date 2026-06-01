import { useVirtualizer } from "@tanstack/react-virtual";
import { CheckCircle2, FileText, Loader2, ScanLine, XCircle } from "lucide-react";
import { useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import type { ImportFileProgress } from "@/lib/desktopData";

export type TariffImportLoadingStage = "parsing" | "selecting";

function statusLabel(file: ImportFileProgress): string {
  if (file.status === "error") return file.error ?? "Errore di lettura";
  if (file.status === "pending") return "In coda";
  if (file.status === "processing") {
    if (file.pagesTotal && file.pagesParsed != null) {
      return `Pagina ${file.pagesParsed} di ${file.pagesTotal}`;
    }
    return "Analisi PDF in corso…";
  }
  if (file.pagesTotal) return `${file.pagesTotal} pagine elaborate`;
  return "Completato";
}

const SPIN_CLASS = "tariff-import-loader-spin";

function FileStatusIcon({ status }: { status: ImportFileProgress["status"] }) {
  switch (status) {
    case "processing":
      return <Loader2 className={`size-4 shrink-0 text-[var(--accent-primary)] ${SPIN_CLASS}`} />;
    case "done":
      return <CheckCircle2 className="size-4 shrink-0 text-[var(--success-base)]" />;
    case "error":
      return <XCircle className="size-4 shrink-0 text-[var(--danger-base)]" />;
    default:
      return (
        <span className="size-4 shrink-0 rounded-full border-2 border-[var(--border-subtle)] bg-[var(--surface-base)]" />
      );
  }
}

export function TariffImportLoadingModal({
  files,
  stage = "parsing",
}: {
  files: readonly ImportFileProgress[];
  stage?: TariffImportLoadingStage;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sortedFiles = useMemo(
    () => [...files].sort((left, right) => left.index - right.index),
    [files],
  );

  const total = sortedFiles[0]?.total ?? sortedFiles.length;
  const doneCount = sortedFiles.filter((file) => file.status === "done").length;
  const errorCount = sortedFiles.filter((file) => file.status === "error").length;
  const processingFile = sortedFiles.find((file) => file.status === "processing");
  const completedCount = doneCount + errorCount;
  const progressPercent = total > 0 ? Math.min(100, Math.round((completedCount / total) * 100)) : 0;
  const allSettled = total > 0 && completedCount >= total && !processingFile;

  const headline =
    stage === "selecting" || total === 0
      ? "Selezione file"
      : allSettled
        ? "Lettura PDF completata"
        : "Importazione tariffari";

  const subtitle =
    stage === "selecting" || total === 0
      ? "Attendi la scelta dei PDF dal dialogo di sistema."
      : processingFile
        ? `Lettura di ${processingFile.fileName}`
        : allSettled
          ? errorCount > 0
            ? `${doneCount} file letti, ${errorCount} con errori. Apertura anteprima…`
            : `${doneCount} file letti. Apertura anteprima…`
          : `${completedCount} di ${total} file elaborati`;

  const virtualizer = useVirtualizer({
    count: sortedFiles.length,
    estimateSize: () => 76,
    gap: 10,
    getScrollElement: () => scrollRef.current,
    overscan: 8,
  });

  return createPortal(
    <div
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-[var(--z-dialog)] flex items-center justify-center bg-[var(--overlay-bg)] px-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-base)] shadow-lg">
        <div className="border-b border-[var(--border-subtle)]/80 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
              <FileText className="size-5" />
              <ScanLine className="absolute -right-1 -top-1 size-3.5 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-18px font-semibold leading-tight text-[var(--text-primary)]">
                  {headline}
                </h3>
                {total > 0 ? (
                  <span className="rounded-full bg-[var(--bg-muted)] px-2 py-0.5 text-11px font-bold tabular-nums text-[var(--text-secondary)]">
                    {completedCount}/{total}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-12px font-medium leading-5 text-[var(--text-secondary)]">
                {subtitle}
              </p>
            </div>
          </div>

          {total > 0 ? (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-10px font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                <span>Avanzamento complessivo</span>
                <span className="tabular-nums text-[var(--text-secondary)]">
                  {progressPercent}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-muted-strong)]">
                <div
                  className="h-full rounded-full bg-[var(--accent-primary)] transition-[width] duration-300 ease-out"
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div
          className="max-h-[min(50vh,380px)] min-h-[140px] overflow-auto px-4 py-3"
          ref={scrollRef}
        >
          {sortedFiles.length === 0 ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-muted)]/50 px-4 py-8 text-13px font-medium text-[var(--text-secondary)]">
              <Loader2 className={`size-4 text-[var(--accent-primary)] ${SPIN_CLASS}`} />
              In attesa dei file selezionati…
            </div>
          ) : (
            <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const file = sortedFiles[virtualRow.index];
                if (!file) return null;
                const isActive = file.status === "processing" || file.status === "pending";

                return (
                  <div
                    className="absolute left-0 top-0 w-full"
                    key={`${file.index}-${file.fileName}`}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div
                      className={`flex h-[calc(100%-10px)] items-center gap-3.5 rounded-xl border px-3.5 py-3 shadow-sm ${
                        file.status === "error"
                          ? "border-[var(--danger-base)]/25 bg-[var(--danger-soft)]/30"
                          : file.status === "done"
                            ? "border-[var(--success-base)]/20 bg-[var(--success-soft)]/20"
                            : isActive
                              ? "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/5"
                              : "border-[var(--border-subtle)]/80 bg-[var(--bg-muted)]/40"
                      }`}
                    >
                      <FileStatusIcon status={file.status} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-12px font-semibold text-[var(--text-primary)]">
                          {file.fileName}
                        </div>
                        <div
                          className={`mt-0.5 truncate text-11px font-medium ${
                            file.status === "error"
                              ? "text-[var(--danger-base)]"
                              : "text-[var(--text-secondary)]"
                          }`}
                        >
                          {statusLabel(file)}
                        </div>
                      </div>
                      {file.status === "processing" &&
                      file.pagesTotal &&
                      file.pagesParsed != null ? (
                        <span className="shrink-0 text-10px font-bold tabular-nums text-[var(--accent-primary)]">
                          {Math.round((file.pagesParsed / file.pagesTotal) * 100)}%
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
