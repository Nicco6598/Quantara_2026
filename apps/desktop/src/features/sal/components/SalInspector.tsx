import { CheckCircle2, FileText, Percent, Ruler, TrendingUp, XCircle } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/shared/Badge";
import { Currency } from "@/components/shared/Currency";
import { DetailList, DetailRow } from "@/components/shared/DetailList";
import { Panel } from "@/components/shared/Panel";
import { StatusChip } from "@/components/shared/StatusChip";
import { cn } from "@/lib/utils";
import type { SalEconomicRules, SalLineView, SalVerificationCheck } from "../types";
import { isMgCode } from "../domain/sal-calculations";

type SalInspectorProps = {
  line: SalLineView;
  economicRules: SalEconomicRules;
  checks: SalVerificationCheck[];
  onClose: () => void;
};

export function SalInspector({ line, economicRules, checks, onClose }: SalInspectorProps) {
  const mgCharges = useMemo(
    () => line.linkedCharges.filter((c) => c.code.startsWith("MG.")),
    [line.linkedCharges],
  );
  const surchargeCharges = useMemo(
    () => line.linkedCharges.filter((c) => !c.code.startsWith("MG.")),
    [line.linkedCharges],
  );
  const isMg = isMgCode(line.voice.code);
  const isIncomplete = line.status !== "complete";
  const hasMg = mgCharges.length > 0;
  const hasSurcharges = surchargeCharges.length > 0;

  const voiceChecks = useMemo(
    () =>
      checks.filter((c) => {
        if (c.detail.includes(line.voice.code)) return true;
        if (c.label.includes("Voci") && c.detail.includes(line.voice.code)) return true;
        return false;
      }),
    [checks, line.voice.code],
  );

  const laborPct = line.voice.laborPercentage ?? 0;

  return (
    <Panel
      action={
        <button
          aria-label="Chiudi ispettore"
          className="flex size-6 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
          onClick={onClose}
          type="button"
        >
          <XCircle className="size-4" />
        </button>
      }
      className="h-full overflow-y-auto"
      padding="md"
      title="Dettaglio voce"
      variant="inspector"
    >
      <div className="space-y-4">
        {/* Voice header */}
        <div className="rounded-xl bg-[var(--surface-base)] p-3 ring-1 ring-[var(--border-subtle)]/50">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-mono text-13px font-bold text-[var(--text-primary)]">
                {line.voice.code}
              </div>
              <div className="mt-0.5 text-12px font-medium leading-snug text-[var(--text-secondary)]">
                {line.voice.description}
              </div>
            </div>
            {isIncomplete && (
              <StatusChip dot size="sm" tone="warning">
                Incompleta
              </StatusChip>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="neutral">{line.voice.category}</Badge>
            <Badge variant="neutral">{line.voice.unit}</Badge>
            {line.voice.isSafetyCost && <Badge variant="danger">OS</Badge>}
            {laborPct > 0 && <Badge variant="info">Man. {laborPct}%</Badge>}
          </div>
        </div>

        {/* Price info */}
        <div className="rounded-xl bg-[var(--surface-base)] p-3 ring-1 ring-[var(--border-subtle)]/50">
          <div className="text-10px font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            <FileText className="mr-1 inline size-3 align-text-top" />
            Prezzi e quantità
          </div>
          <DetailList className="mt-2">
            <DetailRow label="Prezzo unitario">
              <Currency value={line.voice.unitPrice} />
            </DetailRow>
            <DetailRow label="Quantità calcolata">
              <span className="font-mono">
                {line.quantity.toLocaleString("it-IT", { maximumFractionDigits: 3 })}
              </span>
            </DetailRow>
            <DetailRow label="Importo lordo">
              <span className="text-[var(--accent-primary)]">
                <Currency value={line.grossAmount} />
              </span>
            </DetailRow>
          </DetailList>
        </div>

        {/* Measurement rows */}
        <div className="rounded-xl bg-[var(--surface-base)] p-3 ring-1 ring-[var(--border-subtle)]/50">
          <div className="text-10px font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            <Ruler className="mr-1 inline size-3 align-text-top" />
            Misure ({line.measurementRows.length})
          </div>
          <div className="mt-2 max-h-[180px] space-y-1 overflow-y-auto">
            {line.measurementRows.length === 0 ? (
              <p className="text-12px text-[var(--text-tertiary)]">Nessuna misura</p>
            ) : (
              line.measurementRows.map((row, idx) => (
                <div
                  className="flex items-center justify-between gap-2 rounded-lg bg-[var(--bg-muted)]/25 px-2.5 py-1.5 text-12px"
                  key={row.id}
                >
                  <span className="min-w-0 truncate text-[var(--text-secondary)]">
                    {row.description || `Riga ${idx + 1}`}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-[var(--text-primary)]">
                    {row.partialQuantity.toLocaleString("it-IT", { maximumFractionDigits: 3 })}{" "}
                    {row.unit}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Surcharges */}
        {!isMg && (hasMg || hasSurcharges || line.surchargePercent > 0) && (
          <div className="rounded-xl bg-[var(--surface-base)] p-3 ring-1 ring-[var(--border-subtle)]/50">
            <div className="text-10px font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <Percent className="mr-1 inline size-3 align-text-top" />
              Maggiorazioni
            </div>
            <DetailList className="mt-2">
              {line.surchargePercent > 0 && (
                <DetailRow label="Magg. manodopera">
                  <span className="text-[var(--info-base)]">
                    {line.surchargePercent}% {laborPct > 0 ? `× ${laborPct}% MO` : ""}
                  </span>
                </DetailRow>
              )}
              {surchargeCharges.map((charge) => (
                <DetailRow key={charge.id} label={charge.code}>
                  <span className="text-[var(--info-base)]">
                    <Currency value={charge.total} />
                  </span>
                </DetailRow>
              ))}
              {mgCharges.map((charge) => (
                <DetailRow key={charge.id} label={charge.code}>
                  <span className="text-[var(--info-base)]">
                    +<Currency value={charge.total} />
                  </span>
                </DetailRow>
              ))}
              {(hasMg || hasSurcharges || line.surchargePercent > 0) && (
                <DetailRow label="Totale magg.">
                  <span className="font-bold text-[var(--info-base)]">
                    +<Currency value={line.linkedCharges.reduce((s, c) => s + c.total, 0)} />
                  </span>
                </DetailRow>
              )}
            </DetailList>
          </div>
        )}

        {/* Discount / OS */}
        {!isMg && (
          <div className="rounded-xl bg-[var(--surface-base)] p-3 ring-1 ring-[var(--border-subtle)]/50">
            <div className="text-10px font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <TrendingUp className="mr-1 inline size-3 align-text-top" />
              Ribasso e netto
            </div>
            <DetailList className="mt-2">
              <DetailRow label="Importo netto">
                <Currency value={line.netAmount} />
              </DetailRow>
              {line.voice.isSafetyCost && economicRules.discountEnabled && (
                <DetailRow label="OS esclusa ribasso">
                  <span className="text-[var(--success-base)]">Sì</span>
                </DetailRow>
              )}
              {!line.voice.isSafetyCost && (
                <DetailRow
                  label={
                    economicRules.discountEnabled
                      ? `Ribasso (${economicRules.discountPercent}%)`
                      : "Ribasso"
                  }
                >
                  <span
                    className={cn(
                      line.discountAmount > 0
                        ? "text-[var(--danger-base)]"
                        : "text-[var(--text-tertiary)]",
                    )}
                  >
                    {line.discountAmount > 0 ? "-" : ""}
                    <Currency value={line.discountAmount} />
                  </span>
                </DetailRow>
              )}
              <DetailRow label="Totale netto SAL">
                <span className="font-bold text-[var(--accent-primary)]">
                  <Currency value={line.totalAmount} />
                </span>
              </DetailRow>
            </DetailList>
          </div>
        )}

        {/* Verification checks */}
        {voiceChecks.length > 0 && (
          <div className="rounded-xl bg-[var(--surface-base)] p-3 ring-1 ring-[var(--border-subtle)]/50">
            <div className="mb-2 text-10px font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <CheckCircle2 className="mr-1 inline size-3 align-text-top" />
              Verifiche
            </div>
            <div className="space-y-1">
              {voiceChecks.map((check) => (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-11px",
                    check.tone === "success" &&
                      "bg-[var(--success-soft)]/50 text-[var(--success-base)]",
                    check.tone === "warning" &&
                      "bg-[var(--warning-soft)]/50 text-[var(--warning-base)]",
                    check.tone === "danger" &&
                      "bg-[var(--danger-soft)]/50 text-[var(--danger-base)]",
                  )}
                  key={check.id}
                >
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      check.tone === "success" && "bg-[var(--success-base)]",
                      check.tone === "warning" && "bg-[var(--warning-base)]",
                      check.tone === "danger" && "bg-[var(--danger-base)]",
                    )}
                  />
                  <span className="min-w-0 flex-1">{check.result}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
