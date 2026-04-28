import {
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coins,
  Download,
  FileBadge,
  FileCheck2,
  FileText,
  Info,
  ReceiptText,
  ShieldCheck,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { summarizeSal } from "@quantara/domain-utils";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { currentSal } from "@/features/dashboard/demo-data";
import { formatMoney } from "@/lib/formatters";

type Tone = "blue" | "green" | "orange" | "purple" | "success" | "warning";

const salSummary = summarizeSal(currentSal);

const exportRows = [
  { label: "Registro contabilita", owner: "Contabilita lavori", status: "Pronto", tone: "success" },
  {
    label: "Certificato pagamento",
    owner: "Direzione lavori",
    status: "Da firmare",
    tone: "warning",
  },
  { label: "Riepilogo voci SAL", owner: "Amministrazione", status: "Pronto", tone: "success" },
] as const;

const adjustmentRows = [
  { label: "Lordo ribassabile", value: formatMoney(salSummary.grossDiscountable) },
  { label: "Dopo ribasso gara", value: formatMoney(salSummary.afterTenderAdjustment) },
  { label: "Dopo ribasso subappalto", value: formatMoney(salSummary.afterSubcontractAdjustment) },
  { label: "OS fuori ribasso", value: formatMoney(salSummary.safetyCosts) },
] as const;

const controlRows = [
  {
    description: "Tutti i documenti necessari sono disponibili.",
    label: "Documenti pronti all'export",
    tone: "success",
    value: "2",
  },
  {
    description: "Documenti in attesa di firma.",
    label: "Firme ancora richieste",
    tone: "warning",
    value: "1",
  },
  {
    description: "",
    label: "Vedi controlli economici chiusi",
    tone: "blue",
    value: "4",
  },
] as const;

export function AccountingScreen() {
  return (
    <div className="space-y-4 pt-4">
      <section>
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)] md:size-[68px]">
            <Calculator className="size-7 md:size-8" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[26px] font-bold leading-[1.08] tracking-[-0.02em] text-[var(--text-primary)] 2xl:text-[32px]">
              Stato avanzamento contabile
            </h2>
            <p className="mt-2 text-[14px] font-semibold text-[var(--text-primary)] 2xl:text-[16px]">
              Quadro economico e pacchetto export nello stesso flusso.
            </p>
            <p className="mt-3 max-w-4xl text-[14px] font-medium leading-6 text-[var(--text-secondary)]">
              La contabilita resta una superficie compatta: valori salienti, correzioni di ribasso e
              stato del pacchetto documentale pronto per chiusura o firma.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            caption="Valore netto consolidato"
            icon={WalletCards}
            label="Totale finale"
            tone="blue"
            value={formatMoney(salSummary.finalTotal)}
          />
          <MetricCard
            caption="Base su cui insistono i ribassi"
            icon={Coins}
            label="Lordo ribassabile"
            tone="green"
            value={formatMoney(salSummary.grossDiscountable)}
          />
          <MetricCard
            caption="Dopo ribasso contrattuale"
            icon={CheckCircle2}
            label="Dopo gara"
            tone="orange"
            value={formatMoney(salSummary.afterTenderAdjustment)}
          />
          <MetricCard
            caption="Valori esclusi dalla scontistica"
            icon={FileText}
            label="OS fuori ribasso"
            tone="purple"
            value={formatMoney(salSummary.safetyCosts)}
          />
        </div>
      </section>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <main className="min-w-0 space-y-4">
          <Panel className="p-0">
            <div className="grid gap-4 p-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="min-w-0">
                <div className="flex items-center gap-3 px-2 pt-2">
                  <ReceiptText className="size-5 text-[var(--info-base)]" />
                  <h3 className="text-[16px] font-bold text-[var(--text-primary)] 2xl:text-[18px]">
                    Riepilogo economico SAL
                  </h3>
                </div>

                <div className="mt-5 overflow-hidden rounded-[14px] border border-[var(--border-subtle)]">
                  {adjustmentRows.map((row) => (
                    <div
                      className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-4 last:border-b-0 2xl:px-5 2xl:py-5"
                      key={row.label}
                    >
                      <div className="flex items-center gap-2 text-[14px] font-medium text-[var(--text-primary)]">
                        {row.label}
                      </div>
                      <div className="flex items-center gap-3 text-[14px] font-bold text-[var(--text-primary)]">
                        {row.value}
                        <Info className="size-4 text-[var(--text-secondary)]" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-3 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4 sm:flex-row sm:items-center sm:justify-between 2xl:mt-8">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
                      <Info className="size-5" />
                    </span>
                    <div>
                      <div className="text-[12px] font-bold text-[var(--text-primary)]">
                        Importi aggiornati al 27 aprile 2025
                      </div>
                      <div className="mt-1 text-[12px] font-medium text-[var(--text-secondary)]">
                        Ultimo SAL approvato: SAL 2
                      </div>
                    </div>
                  </div>
                  <button
                    className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-5 text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)]"
                    type="button"
                  >
                    Vedi dettagli
                    <ChevronRight className="size-4 text-[var(--info-base)]" />
                  </button>
                </div>
              </div>

              <div className="relative flex min-h-[320px] flex-col items-center justify-center overflow-hidden rounded-[18px] border border-[var(--info-base)]/20 bg-[var(--info-soft)]/35 p-5 text-center 2xl:min-h-[420px] 2xl:p-7">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)] md:text-[12px]">
                  Totale finale
                </div>
                <div className="mt-5 text-[38px] font-bold leading-none tracking-[-0.04em] text-[var(--text-primary)] 2xl:mt-7 2xl:text-[50px]">
                  {formatMoney(salSummary.finalTotal)}
                </div>
                <div className="mt-9 h-px w-64 max-w-full bg-[var(--border-subtle)]" />
                <div className="mt-7 flex size-16 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
                  <FileBadge className="size-8" />
                </div>
                <p className="mt-7 max-w-[260px] text-[14px] font-medium leading-6 text-[var(--text-secondary)]">
                  Importo pronto per emissione e certificazione pagamento.
                </p>
                <div className="pointer-events-none absolute -bottom-20 left-0 right-0 h-48 rounded-[50%] border-t border-[var(--info-base)]/10" />
                <div className="pointer-events-none absolute -bottom-28 left-8 right-8 h-56 rounded-[50%] border-t border-[var(--info-base)]/10" />
              </div>
            </div>
          </Panel>

          <Panel className="flex flex-col gap-4 bg-[var(--bg-muted)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <FileText className="size-5 text-[var(--text-secondary)]" />
              <div>
                <div className="text-[14px] font-bold text-[var(--text-primary)]">
                  Note e attivita recenti
                </div>
                <div className="mt-1 text-[12px] font-medium text-[var(--text-secondary)]">
                  Nessuna nota recente.
                </div>
              </div>
            </div>
            <button
              className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-secondary)]"
              type="button"
            >
              Vedi tutte le attivita
              <ChevronRight className="size-4" />
            </button>
          </Panel>
        </main>

        <aside className="grid gap-4 lg:grid-cols-2 2xl:block 2xl:space-y-4">
          <Panel>
            <div className="flex items-center gap-3">
              <FileCheck2 className="size-5 text-[var(--info-base)]" />
              <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                Pacchetto documentale
              </h3>
            </div>

            <div className="mt-4 overflow-hidden rounded-[14px] border border-[var(--border-subtle)]">
              {exportRows.map((row) => (
                <div
                  className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0"
                  key={row.label}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <StatusDot tone={row.tone} />
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                        {row.label}
                      </div>
                      <div className="mt-1 truncate text-[12px] font-medium text-[var(--text-secondary)]">
                        {row.owner}
                      </div>
                    </div>
                  </div>
                  <StatusPill tone={row.tone}>{row.status}</StatusPill>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-2">
              <button
                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)]"
                type="button"
              >
                <Download className="size-4 text-[var(--text-secondary)]" />
                Esporta registro
              </button>
              <button
                className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 text-[13px] font-semibold text-[var(--text-inverse)] transition-colors hover:bg-[var(--accent-primary-hover)]"
                type="button"
              >
                <FileBadge className="size-4" />
                Genera certificato pagamento
                <ChevronRight className="ml-auto size-4" />
              </button>
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-[var(--text-secondary)]" />
                <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                  Controlli e validazioni
                </h3>
              </div>
              <span className="rounded-full bg-[var(--success-soft)] px-2 py-1 text-[11px] font-bold text-[var(--success-base)]">
                Tutti i controlli OK
              </span>
            </div>

            <div className="mt-4 overflow-hidden rounded-[14px] border border-[var(--border-subtle)]">
              {controlRows.map((row) => (
                <div
                  className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0"
                  key={row.label}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <StatusDot tone={row.tone} />
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                        {row.label}
                      </div>
                      {row.description ? (
                        <div className="mt-1 truncate text-[12px] font-medium text-[var(--text-secondary)]">
                          {row.description}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                      row.tone === "success" &&
                        "bg-[var(--success-soft)] text-[var(--success-base)]",
                      row.tone === "warning" &&
                        "bg-[var(--warning-soft)] text-[var(--warning-base)]",
                      row.tone === "blue" && "bg-[var(--info-soft)] text-[var(--info-base)]",
                    )}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </section>
    </div>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 shadow-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}

function MetricCard({
  caption,
  icon: Icon,
  label,
  tone,
  value,
}: {
  caption: string;
  icon: LucideIcon;
  label: string;
  tone: Tone;
  value: string;
}) {
  return (
    <section
      className={cn(
        "flex min-h-[112px] items-center gap-3 rounded-[16px] border bg-[var(--surface-base)] p-4 shadow-sm 2xl:min-h-[124px] 2xl:gap-4",
        tone === "blue"
          ? "border-[var(--info-base)]/25 bg-[var(--info-soft)]/20"
          : "border-[var(--border-subtle)]",
      )}
    >
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full 2xl:size-14",
          tone === "blue" && "bg-[var(--info-soft)] text-[var(--info-base)]",
          tone === "green" && "bg-[var(--success-soft)] text-[var(--success-base)]",
          tone === "orange" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
          tone === "purple" && "bg-[var(--bg-muted-strong)] text-[var(--accent-secondary)]",
        )}
      >
        <Icon className="size-5 2xl:size-6" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
          {label}
        </div>
        <div
          className={cn(
            "mt-2 truncate text-[21px] font-bold leading-none tracking-[-0.02em] 2xl:text-[26px]",
            tone === "blue" ? "text-[var(--info-base)]" : "text-[var(--text-primary)]",
          )}
        >
          {value}
        </div>
        <div className="mt-3 truncate text-[12px] font-medium text-[var(--text-secondary)]">
          {caption}
        </div>
      </div>
    </section>
  );
}

function StatusDot({ tone }: { tone: "blue" | "success" | "warning" }) {
  const Icon = tone === "warning" ? Clock3 : CheckCircle2;

  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full",
        tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
        tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
        tone === "blue" && "bg-[var(--info-soft)] text-[var(--info-base)]",
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}

function StatusPill({ children, tone }: { children: string; tone: "success" | "warning" }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold",
        tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
        tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
      )}
    >
      {children}
    </span>
  );
}
