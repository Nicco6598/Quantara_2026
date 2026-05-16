import { Calculator, CheckCircle2 } from "lucide-react";
import { m } from "framer-motion";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { SalEconomicRules, SalEconomicSummary, SalLineView } from "../types";
import { Currency } from "./SalCreationTables";

export function SalBudgetLive({ summary }: { summary: SalEconomicSummary }) {
  const contractAmount = useMemo(
    () => summary.budgetResidual + summary.previousProgressiveAmount + summary.total,
    [summary],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)]/60 bg-[var(--surface-base)]">
      <div className="border-b border-[var(--border-subtle)]/60 bg-[color-mix(in_srgb,var(--accent-primary)_4%,var(--surface-base)_96%)] px-4 py-2.5">
        <div className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
          Budget disponibile in tempo reale
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-[var(--border-subtle)]/40 md:grid-cols-4">
        <LiveMetric label="Budget contratto" value={contractAmount} isActive={false} />
        <LiveMetric
          label="Già impegnato"
          value={summary.previousProgressiveAmount}
          isActive={false}
        />
        <LiveMetric label="In corso" value={summary.total} isActive />
        <LiveMetric
          label="Residuo"
          value={summary.budgetResidual}
          isActive={false}
          danger={summary.budgetResidual < 0}
        />
      </div>
    </div>
  );
}

function LiveMetric({
  label,
  value,
  isActive,
  danger,
}: {
  label: string;
  value: number;
  isActive?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-center px-4 py-3",
        isActive && "bg-[color-mix(in_srgb,var(--accent-primary)_5%,var(--surface-base)_95%)]",
      )}
    >
      <div className="text-10px font-medium text-[var(--text-secondary)]">{label}</div>
      <m.span
        key={Math.round(value * 100)}
        initial={{ opacity: 0.3, y: 6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
        className={cn(
          "mt-0.5 inline-block text-15px font-black tabular-nums transition-colors duration-500",
          danger
            ? "text-[var(--danger-base)]"
            : isActive
              ? "text-[var(--accent-primary)]"
              : "text-[var(--text-primary)]",
        )}
      >
        <Currency value={value} />
      </m.span>
    </div>
  );
}

export function SalCostRecap({
  economicRules,
  lineViews,
  summary,
  showBudget = true,
}: {
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  summary: SalEconomicSummary;
  showBudget?: boolean;
}) {
  const categories = useMemo(() => {
    const catMap = new Map<
      string,
      { gross: number; net: number; count: number; hasSafety: boolean }
    >();
    for (const line of lineViews) {
      const cat = line.voice.category || "Altro";
      const existing = catMap.get(cat) ?? {
        gross: 0,
        net: 0,
        count: 0,
        hasSafety: false,
      };
      existing.gross += line.grossAmount;
      existing.net += line.totalAmount;
      existing.count += 1;
      existing.hasSafety = existing.hasSafety || line.voice.isSafetyCost;
      catMap.set(cat, existing);
    }
    return [...catMap.entries()].filter(([_, value]) => value.gross > 0);
  }, [lineViews]);

  const safetyCategories = useMemo(() => {
    return categories.filter(([_, value]) => value.hasSafety);
  }, [categories]);

  const regularCategories = useMemo(() => {
    return categories.filter(([_, value]) => !value.hasSafety);
  }, [categories]);

  const mgEntries = useMemo(
    () => lineViews.flatMap((line) => line.linkedCharges.filter((c) => c.code.startsWith("MG."))),
    [lineViews],
  );

  const totalMgAmount = useMemo(
    () => mgEntries.reduce((sum, entry) => sum + entry.total, 0),
    [mgEntries],
  );

  const hasMg = mgEntries.length > 0;
  const hasDiscount = summary.discountAmount > 0;
  const hasSurcharges = summary.linkedChargeAmount > 0;

  const contractAmount = useMemo(
    () => summary.budgetResidual + summary.previousProgressiveAmount + summary.total,
    [summary],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)]/60 bg-[var(--surface-base)]">
      <div className="flex items-center justify-between border-b border-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)] bg-[color-mix(in_srgb,var(--accent-primary)_4%,var(--surface-base)_96%)] px-5 py-3.5">
        <div className="min-w-0">
          <div className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
            Riepilogo costi
          </div>
          <div className="mt-0.5 text-11px font-medium text-[var(--text-secondary)]">
            {summary.voiceCount} voci ·{" "}
            {categories.reduce((sum, [_, value]) => sum + value.count, 0) === summary.voiceCount
              ? categories.length === 1
                ? "1 categoria"
                : `${categories.length} categorie`
              : "importi raggruppati"}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
            Totale netto
          </div>
          <div className="mt-0.5 text-17px font-black text-[var(--accent-primary)]">
            <Currency value={summary.total} />
          </div>
        </div>
      </div>

      <div className="divide-y divide-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)]">
        {regularCategories.length > 0 && (
          <div className="px-5 py-3.5">
            <div className="mb-2.5 text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
              Importo lordo per categoria
            </div>
            <div className="space-y-0 divide-y divide-[color-mix(in_srgb,var(--accent-primary)_6%,transparent)]">
              {regularCategories.map(([cat, data], idx) => (
                <CategoryRow
                  key={cat}
                  category={cat}
                  count={data.count}
                  amount={data.gross}
                  withSeparator={idx < regularCategories.length - 1 || safetyCategories.length > 0}
                />
              ))}
              {safetyCategories.length > 0 && (
                <>
                  {regularCategories.length > 0 && (
                    <div className="h-0 border-t border-dashed border-[color-mix(in_srgb,var(--accent-primary)_14%,transparent)]" />
                  )}
                  {safetyCategories.map(([cat, data], idx) => (
                    <CategoryRow
                      key={cat}
                      category={cat}
                      count={data.count}
                      amount={data.gross}
                      isSafety
                      withSeparator={idx < safetyCategories.length - 1}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {hasMg && (
          <div className="px-5 py-3.5">
            <div className="mb-2.5 text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
              Maggiorazioni MG
            </div>
            <div className="space-y-0 divide-y divide-[color-mix(in_srgb,var(--accent-primary)_6%,transparent)]">
              {mgEntries.map((entry) => {
                const tariffPrefix = entry.code.replace("MG.", "");
                const label =
                  tariffPrefix === "ALL"
                    ? `MG ${entry.percent.toLocaleString("it-IT")}% su tutte le voci`
                    : `MG ${entry.percent.toLocaleString("it-IT")}% su voci ${tariffPrefix}`;
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 py-1.5 text-12px"
                  >
                    <span className="min-w-0 truncate text-[var(--text-primary)]">{label}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-[var(--info-base)]">
                      +<Currency value={entry.total} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {hasDiscount && (
          <div className="px-5 py-3.5">
            <div className="mb-2.5 text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
              Ribasso gara ({economicRules.discountPercent.toLocaleString("it-IT")}%)
            </div>
            <div className="space-y-0 divide-y divide-[color-mix(in_srgb,var(--accent-primary)_6%,transparent)]">
              <div className="flex items-center justify-between py-1.5 text-12px">
                <span className="text-[var(--text-primary)]">
                  Su importo ribassabile{" "}
                  <span className="text-[var(--text-tertiary)]">
                    ({summary.discountedVoiceCount} voci)
                  </span>
                </span>
                <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                  <Currency value={summary.discountableAmount} />
                </span>
              </div>
              {summary.excludedSafetyVoiceCount > 0 && (
                <div className="flex items-center justify-between py-1.5 text-11px text-[var(--text-secondary)]">
                  <span>
                    OS esclus{summary.excludedSafetyVoiceCount !== 1 ? "i" : "a"} (
                    {summary.excludedSafetyVoiceCount} voci)
                  </span>
                  <span className="font-semibold tabular-nums text-[var(--danger-base)]">
                    -<Currency value={summary.discountAmount} />
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-[color-mix(in_srgb,var(--accent-primary)_3%,var(--surface-base)_97%)] px-5 py-3.5">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-12px text-[var(--text-secondary)]">
              <span>Voci lordo</span>
              <span className="tabular-nums">
                <Currency value={summary.grossAmount} />
              </span>
            </div>
            {totalMgAmount > 0 && (
              <div className="flex items-center justify-between text-12px text-[var(--info-base)]">
                <span>+ Maggiorazioni MG distribuite</span>
                <span className="tabular-nums">
                  +<Currency value={totalMgAmount} />
                </span>
              </div>
            )}
            {hasSurcharges && (
              <div className="flex items-center justify-between text-12px text-[var(--info-base)]">
                <span>+ Maggiorazioni su manodopera</span>
                <span className="tabular-nums">
                  +<Currency value={summary.linkedChargeAmount} />
                </span>
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-[color-mix(in_srgb,var(--accent-primary)_15%,transparent)] pt-2 text-13px font-bold text-[var(--accent-primary)]">
            <span>= Totale con maggiorazioni</span>
            <span className="tabular-nums">
              <Currency value={summary.grossAmount + totalMgAmount + summary.linkedChargeAmount} />
            </span>
          </div>
          {hasDiscount && (
            <div className="mt-1 flex items-center justify-between text-12px text-[var(--danger-base)]">
              <span>- Ribasso gara ({economicRules.discountPercent.toLocaleString("it-IT")}%)</span>
              <span className="tabular-nums">
                -<Currency value={summary.discountAmount} />
              </span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-[color-mix(in_srgb,var(--accent-primary)_18%,transparent)] pt-2.5 text-14px font-black text-[var(--accent-primary)]">
            <span>= Totale netto SAL</span>
            <span className="tabular-nums">
              <Currency value={summary.total} />
            </span>
          </div>
        </div>

        {summary.safetyAmount > 0 && (
          <div className="flex items-center gap-2 border-t border-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)] px-5 py-2.5 text-11px text-[var(--text-secondary)]">
            <span className="size-1.5 shrink-0 rounded-full bg-[var(--danger-base)]" />
            di cui oneri sicurezza (OS):{" "}
            <span className="font-semibold tabular-nums text-[var(--danger-base)]">
              <Currency value={summary.safetyAmount} />
            </span>
          </div>
        )}

        {showBudget && (
          <div className="border-t border-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)] bg-[var(--bg-muted)]/20 px-5 py-3.5">
            <div className="mb-2.5 text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
              Budget contratto
            </div>
            <div className="space-y-0 divide-y divide-[color-mix(in_srgb,var(--accent-primary)_6%,transparent)]">
              <div className="flex items-center justify-between py-1.5 text-12px text-[var(--text-primary)]">
                <span>Importo contratto</span>
                <span className="font-semibold tabular-nums">
                  <Currency value={contractAmount} />
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-12px text-[var(--text-secondary)]">
                <span>Già impegnato (SAL precedenti)</span>
                <span className="tabular-nums">
                  <Currency value={summary.previousProgressiveAmount} />
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-12px text-[var(--accent-primary)]">
                <span>Questo SAL</span>
                <span className="tabular-nums">
                  <Currency value={summary.total} />
                </span>
              </div>
              <div className="border-t border-[color-mix(in_srgb,var(--accent-primary)_14%,transparent)] pt-1.5">
                <div className="flex items-center justify-between py-1 text-13px font-bold">
                  <span
                    className={
                      summary.budgetResidual >= 0
                        ? "text-[var(--success-base)]"
                        : "text-[var(--danger-base)]"
                    }
                  >
                    Residuo disponibile
                  </span>
                  <span
                    className={cn(
                      "tabular-nums",
                      summary.budgetResidual >= 0
                        ? "text-[var(--success-base)]"
                        : "text-[var(--danger-base)]",
                    )}
                  >
                    <Currency value={summary.budgetResidual} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  count,
  amount,
  isSafety,
  withSeparator,
}: {
  category: string;
  count: number;
  amount: number;
  isSafety?: boolean;
  withSeparator?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-1.5 text-12px",
        withSeparator &&
          "border-b border-[color-mix(in_srgb,var(--accent-primary)_6%,transparent)]",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "truncate",
            isSafety ? "font-medium text-[var(--danger-base)]" : "text-[var(--text-primary)]",
          )}
        >
          {category}
        </span>
        {isSafety && (
          <span className="shrink-0 rounded-full bg-[var(--danger-soft)] px-1.5 py-0.5 text-9px font-bold text-[var(--danger-base)]">
            OS
          </span>
        )}
        <span className="shrink-0 text-10px text-[var(--text-tertiary)]">{count} voci</span>
      </div>
      <span className="shrink-0 font-semibold tabular-nums text-[var(--text-primary)]">
        <Currency value={amount} />
      </span>
    </div>
  );
}

export function EconomicEquation({
  className,
  summary,
}: {
  className?: string;
  summary: SalEconomicSummary;
}) {
  return (
    <div
      className={cn(
        "divide-y divide-[var(--border-subtle)]/50 rounded-xl border border-[var(--border-subtle)]/60 bg-[var(--surface-base)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <span className="text-12px font-medium text-[var(--text-secondary)]">
          Totale voci lordo
        </span>
        <span className="text-13px font-semibold text-[var(--text-primary)]">
          <Currency value={summary.grossAmount} />
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-12px font-medium text-[var(--danger-base)]">
          <span className="flex size-4 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--danger-base)_14%,var(--surface-base)_86%)] text-9px font-bold">
            −
          </span>
          Sconto
        </span>
        <span className="text-13px font-semibold text-[var(--danger-base)]">
          −<Currency value={summary.discountAmount} />
        </span>
      </div>
      {summary.linkedChargeAmount > 0 ? (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-12px font-medium text-[var(--info-base)]">
            <span className="flex size-4 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--info-base)_14%,var(--surface-base)_86%)] text-9px font-bold">
              +
            </span>
            Maggiorazioni
          </span>
          <span className="text-13px font-semibold text-[var(--info-base)]">
            +<Currency value={summary.linkedChargeAmount} />
          </span>
        </div>
      ) : null}
      {summary.safetyAmount > 0 ? (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="text-12px font-medium text-[var(--text-secondary)]">di cui voci OS</span>
          <span className="text-12px font-medium text-[var(--text-secondary)]">
            <Currency value={summary.safetyAmount} />
          </span>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3 rounded-b-xl bg-[color-mix(in_srgb,var(--accent-primary)_6%,var(--surface-base)_94%)] px-4 py-3">
        <span className="text-13px font-bold text-[var(--accent-primary)]">
          = Totale attuale SAL
        </span>
        <span className="text-16px font-black text-[var(--accent-primary)]">
          <Currency value={summary.total} />
        </span>
      </div>
    </div>
  );
}

export function StepMetric({
  accent,
  danger,
  label,
  value,
}: {
  accent?: boolean;
  danger?: boolean;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
      <div className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-22px font-bold",
          danger && "text-[var(--danger-base)]",
          accent && !danger && "text-[var(--accent-primary)]",
          !accent && !danger && "text-[var(--info-base)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function FeedbackBanner({
  message,
  title,
  tone,
}: {
  message: string;
  title: string;
  tone: "danger" | "info" | "success";
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${tone === "danger" ? "border-[var(--danger-base)]/25 bg-[var(--danger-soft)] text-[var(--danger-base)]" : tone === "success" ? "border-[var(--success-base)]/25 bg-[var(--success-soft)] text-[var(--success-base)]" : "border-[var(--info-base)]/25 bg-[var(--info-soft)] text-[var(--info-base)]"}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-current/10">
          {tone === "success" ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <Calculator className="size-4" />
          )}
        </span>
        <div className="min-w-0">
          <div className="text-13px font-semibold">{title}</div>
          <div className="mt-0.5 text-12px opacity-80">{message}</div>
        </div>
      </div>
    </div>
  );
}
