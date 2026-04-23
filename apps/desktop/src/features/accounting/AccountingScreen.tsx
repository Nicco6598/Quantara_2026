import { Calculator, FileText, ShieldCheck } from "lucide-react";
import { summarizeSal } from "@quantara/domain-utils";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
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

export function AccountingScreen() {
  return (
    <main className="p-6 pb-8">
      <section className="rounded-[28px] border border-subtle bg-card p-6 shadow-soft">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">Conto lavori</Badge>
              <span className="text-xs text-secondary">Calcolo SAL consolidato</span>
            </div>
            <h2 className="mt-4 text-[2rem] font-semibold tracking-tight text-foreground">
              Quadro economico e pacchetto export nello stesso flusso.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-secondary">
              La contabilita resta una superficie compatta: valori salienti, correzioni di ribasso e
              stato del pacchetto documentale pronto per chiusura o firma.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricTile
                label="Totale finale"
                note="Valore netto consolidato"
                tone="success"
                value={formatMoney(salSummary.finalTotal)}
              />
              <MetricTile
                label="Lordo ribassabile"
                note="Base su cui insistono i ribassi"
                value={formatMoney(salSummary.grossDiscountable)}
              />
              <MetricTile
                label="Dopo gara"
                note="Dopo ribasso contrattuale"
                value={formatMoney(salSummary.afterTenderAdjustment)}
              />
              <MetricTile
                label="OS fuori ribasso"
                note="Valori esclusi dalla scontistica"
                tone="info"
                value={formatMoney(salSummary.safetyCosts)}
              />
            </div>
          </div>

          <section className="rounded-[24px] border border-subtle bg-muted/35 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-info" />
              <div className="text-base font-semibold text-foreground">Controlli</div>
            </div>
            <div className="mt-4 space-y-3">
              {controlRows.map((row) => (
                <div
                  className="rounded-[20px] border border-subtle bg-card px-4 py-3"
                  key={row.label}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-foreground">{row.label}</div>
                    <Badge variant={row.tone}>{row.value}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <Calculator className="size-4 text-info" />
            <h3 className="text-base font-semibold text-foreground">Riepilogo economico SAL</h3>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-subtle bg-muted/35 p-4">
              <dl className="space-y-3">
                {adjustmentRows.map((row) => (
                  <SummaryLine key={row.label} label={row.label} value={row.value} />
                ))}
              </dl>
            </div>

            <div className="rounded-[22px] border border-subtle bg-muted/35 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
                Totale finale
              </div>
              <div className="mt-4 text-3xl font-semibold text-foreground">
                {formatMoney(salSummary.finalTotal)}
              </div>
              <div className="mt-2 text-sm text-secondary">
                Importo pronto per emissione e certificazione pagamento.
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-info" />
            <h3 className="text-base font-semibold text-foreground">Pacchetto documentale</h3>
          </div>

          <div className="mt-4 space-y-3">
            {exportRows.map((row) => (
              <div
                className="rounded-[20px] border border-subtle bg-muted/35 px-4 py-3"
                key={row.label}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{row.label}</div>
                    <div className="mt-1 text-xs text-secondary">{row.owner}</div>
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
    </main>
  );
}

function MetricTile({
  label,
  note,
  tone,
  value,
}: {
  label: string;
  note: string;
  tone?: "info" | "success";
  value: string;
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "info" ? "text-info" : "text-foreground";

  return (
    <div className="rounded-[22px] border border-subtle bg-muted/35 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
        {label}
      </div>
      <div className={`mt-3 text-2xl font-semibold ${toneClass}`}>{value}</div>
      <div className="mt-2 text-xs leading-5 text-secondary">{note}</div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-subtle pb-3 last:border-b-0 last:pb-0">
      <dt className="text-sm text-secondary">{label}</dt>
      <dd className="text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}
