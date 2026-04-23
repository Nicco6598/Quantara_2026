import { summarizeSal } from "@quantara/domain-utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { currentSal } from "@/features/dashboard/demo-data";
import { formatMoney } from "@/lib/formatters";

const salSummary = summarizeSal(currentSal);
const exportRows = [
  { label: "Registro contabilita", owner: "Contabilita lavori", status: "Pronto" },
  { label: "Certificato pagamento", owner: "Direzione lavori", status: "Da firmare" },
  { label: "Riepilogo voci SAL", owner: "Amministrazione", status: "Pronto" },
] as const;

export function AccountingScreen() {
  return (
    <main className="p-6">
      <div className="grid grid-cols-[0.9fr_1.1fr] gap-4">
        <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
          <h3 className="text-base font-semibold text-foreground">Quadro economico SAL</h3>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <SummaryLine
              label="Lordo ribassabile"
              value={formatMoney(salSummary.grossDiscountable)}
            />
            <SummaryLine
              label="Dopo ribasso gara"
              value={formatMoney(salSummary.afterTenderAdjustment)}
            />
            <SummaryLine
              label="Dopo ribasso subappalto"
              value={formatMoney(salSummary.afterSubcontractAdjustment)}
            />
            <SummaryLine label="OS fuori ribasso" value={formatMoney(salSummary.safetyCosts)} />
            <SummaryLine strong label="Totale finale" value={formatMoney(salSummary.finalTotal)} />
          </dl>
        </section>

        <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
          <h3 className="text-base font-semibold text-foreground">Pacchetto documentale</h3>
          <div className="mt-4 overflow-hidden rounded-md border border-subtle">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-muted text-xs font-semibold text-secondary">
                <tr>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Responsabile</th>
                  <th className="px-4 py-3">Stato</th>
                </tr>
              </thead>
              <tbody>
                {exportRows.map((row) => (
                  <tr className="border-t border-subtle" key={row.label}>
                    <td className="px-4 py-3 font-semibold text-foreground">{row.label}</td>
                    <td className="px-4 py-3 text-secondary">{row.owner}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={row.status}
                        tone={row.status === "Pronto" ? "success" : "warning"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

type SummaryLineProps = {
  label: string;
  strong?: boolean;
  value: string;
};

function SummaryLine({ label, strong, value }: SummaryLineProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-subtle pb-3 last:border-b-0 last:pb-0">
      <dt className="text-secondary">{label}</dt>
      <dd className={strong ? "font-semibold text-foreground" : "font-medium text-foreground"}>
        {value}
      </dd>
    </div>
  );
}
