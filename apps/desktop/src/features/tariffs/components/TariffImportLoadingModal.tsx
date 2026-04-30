import { FileText, ScanLine } from "lucide-react";
import { useEffect, useState } from "react";

export function TariffImportLoadingModal({ fileName }: { fileName: string }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((performance.now() - startedAt) / 1000));
    }, 250);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[82] grid place-items-center bg-slate-950/42 p-4">
      <section
        aria-busy="true"
        aria-live="polite"
        className="projects-surface relative w-full max-w-[520px] overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-6 shadow-none"
        role="status"
      >
        <div className="flex items-start gap-4">
          <div className="relative flex size-14 shrink-0 items-center justify-center rounded-[18px] bg-[var(--info-soft)] text-[var(--info-base)]">
            <FileText className="size-6" />
            <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[var(--surface-base)] text-[var(--accent-primary)]">
              <ScanLine className="size-3 animate-pulse" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[24px] font-semibold leading-[1.05] tracking-[-0.035em] text-[var(--text-primary)]">
              Lettura tariffario in corso
            </h3>
            <p className="mt-2 text-[13px] font-medium leading-5 text-[var(--text-secondary)]">
              Il file e stato scelto. Il parser desktop sta preparando la preview modificabile.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[18px] bg-[var(--bg-muted)]/70 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            File selezionato
          </div>
          <div className="mt-2 truncate text-[14px] font-semibold text-[var(--text-primary)]">
            {fileName || "Tariffario selezionato"}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-full bg-[var(--bg-muted-strong)]">
          <div className="h-2 w-1/3 animate-[tariff-import-scan_1.15s_cubic-bezier(0.22,1,0.36,1)_infinite] rounded-full bg-[var(--accent-primary)]" />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 text-[12px] font-medium text-[var(--text-secondary)]">
          <span>Parser attivo da {elapsedSeconds}s</span>
          <span>In attesa della risposta Tauri</span>
        </div>
      </section>
    </div>
  );
}
