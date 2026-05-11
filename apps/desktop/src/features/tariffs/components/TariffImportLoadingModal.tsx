import { CheckCircle2, FileText, Loader, ScanLine, XCircle } from "lucide-react";
import type { ImportFileProgress } from "@/lib/desktopData";

export function TariffImportLoadingModal({ files }: { files: ImportFileProgress[] }) {
  const doneCount = files.filter((f) => f.status === "done").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const processingCount = files.filter((f) => f.status === "processing").length;
  const total = files.length;
  const completedCount = doneCount + errorCount;

  return (
    <div className="fixed inset-0 z-[82] flex items-center justify-center bg-black/40 px-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-4xl bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]">
        <div className="rounded-22px bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] p-6 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
          <div className="flex items-start gap-4">
            <div className="relative flex size-14 shrink-0 items-center justify-center rounded-18px bg-[var(--info-soft)] text-[var(--info-base)]">
              <FileText className="size-6" />
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[var(--surface-base)] text-[var(--accent-primary)]">
                <ScanLine className="size-3 animate-pulse" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-24px font-semibold leading-1_05 tracking-neg-0_035em text-[var(--text-primary)]">
                  Importazione tariffari
                </h3>
                <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-[var(--accent-primary)]/10 px-3 text-12px font-bold text-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/20">
                  {completedCount}/{total}
                </span>
              </div>
              <p className="mt-1.5 text-13px font-medium leading-5 text-[var(--text-secondary)]">
                {total === 0
                  ? "In attesa dei file PDF..."
                  : processingCount > 0
                    ? `Elaborazione in corso...`
                    : completedCount === total && errorCount === 0
                      ? `${total} file pronti per la preview`
                      : `${completedCount}/${total} file elaborati`}
              </p>
            </div>
          </div>

          <div className="mt-6 max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {files.map((file) => (
              <div
                className="flex items-center gap-3 rounded-14px bg-[var(--bg-muted)]/60 px-4 py-3"
                key={file.index}
              >
                {file.status === "processing" ? (
                  <Loader className="size-5 shrink-0 animate-spin text-[var(--info-base)]" />
                ) : file.status === "done" ? (
                  <CheckCircle2 className="size-5 shrink-0 text-[var(--success-base)]" />
                ) : file.status === "error" ? (
                  <XCircle className="size-5 shrink-0 text-[var(--danger-base)]" />
                ) : (
                  <div className="size-5 shrink-0 rounded-full border-2 border-[var(--border-subtle)]" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-13px font-semibold text-[var(--text-primary)]">
                    {file.fileName}
                  </div>
                  {file.status === "error" && file.error ? (
                    <div className="mt-0.5 truncate text-11px font-medium text-[var(--danger-base)]">
                      {file.error}
                    </div>
                  ) : (
                    <div className="mt-0.5 text-11px font-medium text-[var(--text-secondary)]">
                      {file.status === "pending"
                        ? "In attesa"
                        : file.status === "processing"
                          ? file.pagesTotal
                            ? `Lettura pagina ${file.pagesParsed ?? 0} di ${file.pagesTotal}`
                            : "Lettura in corso..."
                          : file.status === "done"
                            ? file.pagesTotal
                              ? `${file.pagesTotal} pagine elaborate`
                              : "Completato"
                            : "Errore"}
                    </div>
                  )}
                </div>
                {file.status === "processing" ? (
                  <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-[var(--bg-muted-strong)]">
                    {file.pagesTotal && file.pagesParsed ? (
                      <div
                        className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (file.pagesParsed / file.pagesTotal) * 100)}%`,
                        }}
                      />
                    ) : (
                      <div className="h-full w-1/3 animate-[tariff-import-scan_1.15s_cubic-bezier(0.22,1,0.36,1)_infinite] rounded-full bg-[var(--accent-primary)]" />
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
