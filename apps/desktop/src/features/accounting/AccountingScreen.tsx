import { Calculator, FileText, ShieldCheck } from "lucide-react";
import { summarizeSal } from "@quantara/domain-utils";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { ScreenShell } from "@/components/shared/Screen";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { currentSal } from "@/features/dashboard/demo-data";
import { formatMoney } from "@/lib/formatters";

const salSummary = summarizeSal(currentSal);

const exportRows = [
  { label: "Registro contabilita", owner: "Contabilita lavori", status: "Pronto" },
  { label: "Certificato pagamento", owner: "Direzione lavori", status: "Da firmare" },
  { label: "Riepilogo voci SAL", owner: "Amministrazione", status: "Pronto" },
] as const;

const adjustmentRows = [
  { label: "Lordo ribassabile", value: formatMoney(salSummary.grossDiscountable) },
  { label: "Dopo ribasso gara", value: formatMoney(salSummary.afterTenderAdjustment) },
  { label: "Dopo ribasso subappalto", value: formatMoney(salSummary.afterSubcontractAdjustment) },
  { label: "OS fuori ribasso", value: formatMoney(salSummary.safetyCosts) },
] as const;

const controlRows = [
  { label: "Documenti pronti all'export", tone: "success" as const, value: "2" },
  { label: "Firme ancora richieste", tone: "warning" as const, value: "1" },
  { label: "Controlli economici chiusi", tone: "info" as const, value: "4" },
] as const;

function MetricCard({
  detail,
  label,
  tone = "neutral",
  value,
}: {
  detail: string;
  label: string;
  tone?: "danger" | "info" | "neutral" | "success" | "warning";
  value: string;
}) {
  const toneClass = {
    danger: "text-[var(--danger-base)]",
    info: "text-[var(--info-base)]",
    success: "text-[var(--success-base)]",
    warning: "text-[var(--warning-base)]",
    neutral: "text-[var(--text-primary)]",
  }[tone];

  return (
    <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div className={`mt-3 text-2xl font-semibold ${toneClass}`}>{value}</div>
      <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">{detail}</p>
    </section>
  );
}

export function AccountingScreen() {
  return (
    <ScreenShell>
      <section>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">Conto lavori</Badge>
              <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                Calcolo SAL consolidato
              </span>
            </div>
            <h2 className="mt-4 text-[34px] font-semibold leading-[1.05] tracking-[-0.045em] text-[var(--text-primary)]">
              Quadro economico e pacchetto export nello stesso flusso.
            </h2>
            <p className="mt-2 max-w-3xl text-[16px] font-normal leading-6 text-[var(--text-secondary)]">
              La contabilita resta una superficie compatta: valori salienti, correzioni di ribasso e
              stato del pacchetto documentale pronto per chiusura o firma.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                detail="Valore netto consolidato"
                label="Totale finale"
                tone="success"
                value={formatMoney(salSummary.finalTotal)}
              />
              <MetricCard
                detail="Base su cui insistono i ribassi"
                label="Lordo ribassabile"
                value={formatMoney(salSummary.grossDiscountable)}
              />
              <MetricCard
                detail="Dopo ribasso contrattuale"
                label="Dopo gara"
                value={formatMoney(salSummary.afterTenderAdjustment)}
              />
              <MetricCard
                detail="Valori esclusi dalla scontistica"
                label="OS fuori ribasso"
                tone="info"
                value={formatMoney(salSummary.safetyCosts)}
              />
            </div>
          </div>

          <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[var(--info-base)]" />
              <div className="text-[16px] font-semibold text-[var(--text-primary)]">Controlli</div>
            </div>
            <div className="mt-4 space-y-3">
              {controlRows.map((row) => (
                <div
                  className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] px-4 py-3"
                  key={row.label}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[14px] font-medium text-[var(--text-primary)]">
                      {row.label}
                    </div>
                    <Badge variant={row.tone}>{row.value}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
          <div className="flex items-center gap-2">
            <Calculator className="size-4 text-[var(--info-base)]" />
            <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">
              Riepilogo economico SAL
            </h3>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-inset)] p-4">
              <dl className="space-y-3">
                {adjustmentRows.map((row) => (
                  <div
                    className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)]/80 pb-3 last:border-b-0 last:pb-0"
                    key={row.label}
                  >
                    <dt className="text-[13px] text-[var(--text-secondary)]">{row.label}</dt>
                    <dd className="text-[13px] font-semibold text-[var(--text-primary)]">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-inset)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                Totale finale
              </div>
              <div className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">
                {formatMoney(salSummary.finalTotal)}
              </div>
              <div className="mt-2 text-[13px] text-[var(--text-secondary)]">
                Importo pronto per emissione e certificazione pagamento.
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-[var(--info-base)]" />
            <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">
              Pacchetto documentale
            </h3>
          </div>

          <div className="mt-4 space-y-3">
            {exportRows.map((row) => (
              <div
                className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-inset)] px-4 py-3"
                key={row.label}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--text-primary)]">
                      {row.label}
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--text-secondary)]">{row.owner}</div>
                  </div>
                  <StatusBadge
                    label={row.status}
                    tone={row.status === "Pronto" ? "success" : "warning"}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-2">
            <Button size="sm" variant="outline">
              Esporta registro
            </Button>
            <Button size="sm">Genera certificato pagamento</Button>
          </div>
        </section>
      </section>
    </ScreenShell>
  );
}
