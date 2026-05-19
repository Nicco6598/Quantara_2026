import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Calculator,
  ChevronDown,
  FileText,
  Percent,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { extractMgTariffPrefix, isMgCode } from "../domain/sal-calculations";
import type {
  SalEconomicRules,
  SalEconomicSummary,
  SalLineView,
  SalMeasurementRowDraft,
} from "../types";

type MgAllocation = {
  baseAmount: number;
  lineCode: string;
  lineDescription: string;
  lineId: string;
  mgCode: string;
  percent: number;
  total: number;
};

type ReceiptTone = "accent" | "danger" | "info";

export function SalReceipt({
  lineViews,
  summary,
  economicRules,
  title,
}: {
  lineViews: SalLineView[];
  summary: SalEconomicSummary;
  economicRules: SalEconomicRules;
  compact?: boolean;
  title?: string;
}) {
  const { workLines, mgLines, safetyLines } = useMemo(
    () => splitReceiptLines(lineViews),
    [lineViews],
  );
  const { allocationsByLine, allocationsByMgLine } = useMemo(
    () => buildMgAllocations([...workLines, ...safetyLines], mgLines),
    [mgLines, safetyLines, workLines],
  );

  const hasContent = lineViews.length > 0;

  return (
    <article className="overflow-hidden rounded-xl bg-[var(--surface-base)] ring-1 ring-[var(--border-subtle)]/80">
      <ReceiptHeader
        economicRules={economicRules}
        lineCount={lineViews.length}
        summary={summary}
        title={title}
      />

      {!hasContent ? (
        <EmptyReceipt />
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 divide-y divide-[var(--border-subtle)]/35">
            {workLines.length > 0 ? (
              <ReceiptSection
                allocationsByLine={allocationsByLine}
                discountPercent={economicRules.discountPercent}
                icon={<FileText className="size-4" />}
                label="Lavorazioni"
                lines={workLines}
                startIndex={1}
                tone="accent"
              />
            ) : null}

            {mgLines.length > 0 ? (
              <MgSection
                allocationsByMgLine={allocationsByMgLine}
                lines={mgLines}
                startIndex={workLines.length + 1}
              />
            ) : null}

            {safetyLines.length > 0 ? (
              <ReceiptSection
                allocationsByLine={allocationsByLine}
                discountPercent={economicRules.discountPercent}
                icon={<ShieldCheck className="size-4" />}
                label="Sicurezza"
                lines={safetyLines}
                startIndex={workLines.length + mgLines.length + 1}
                tone="danger"
              />
            ) : null}
          </div>

          <ReceiptRail economicRules={economicRules} summary={summary} />
        </div>
      )}
    </article>
  );
}

function ReceiptHeader({
  economicRules,
  lineCount,
  summary,
  title,
}: {
  economicRules: SalEconomicRules;
  lineCount: number;
  summary: SalEconomicSummary;
  title?: string | undefined;
}) {
  return (
    <header className="border-b border-[var(--border-subtle)]/60 bg-[var(--bg-muted)]/32 px-5 py-4 sm:px-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-11px font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <ReceiptText className="size-3.5" />
            {title ?? "Riepilogo SAL"}
          </div>
          <h3 className="mt-2 text-18px font-black leading-tight text-[var(--text-primary)]">
            Ricevuta contabile
          </h3>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-12px font-medium text-[var(--text-secondary)]">
            <span>{lineCount} voci</span>
            <span>Ribasso {formatPercent(economicRules.discountPercent)}</span>
            <span>{summary.excludedSafetyVoiceCount} OS escluse</span>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--surface-base)] px-4 py-3">
          <div className="text-11px font-bold uppercase tracking-[0.09em] text-[var(--text-secondary)]">
            Netto SAL
          </div>
          <div className="mt-1 text-24px font-black tabular-nums text-[var(--accent-primary)]">
            <Currency value={summary.total} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <HeaderMetric
          icon={<Calculator className="size-4" />}
          label="Lordo"
          value={summary.grossAmount}
        />
        <HeaderMetric
          icon={<TrendingUp className="size-4" />}
          label="Maggiorazioni"
          tone="info"
          value={summary.linkedChargeAmount}
        />
        <HeaderMetric
          icon={<Percent className="size-4" />}
          label="Ribasso"
          tone="danger"
          value={summary.discountAmount}
        />
        <HeaderMetric
          icon={<WalletCards className="size-4" />}
          label="Residuo"
          tone={summary.budgetResidual < 0 ? "danger" : "success"}
          value={summary.budgetResidual}
        />
      </div>
    </header>
  );
}

function ReceiptSection({
  allocationsByLine,
  discountPercent,
  icon,
  label,
  lines,
  startIndex,
  tone,
}: {
  allocationsByLine: Map<string, MgAllocation[]>;
  discountPercent: number;
  icon: ReactNode;
  label: string;
  lines: SalLineView[];
  startIndex: number;
  tone: ReceiptTone;
}) {
  const amount = lines.reduce((sum, line) => sum + line.totalAmount, 0);

  return (
    <section>
      <SectionHeader amount={amount} count={lines.length} icon={icon} label={label} tone={tone} />
      <div className="divide-y divide-[var(--border-subtle)]/22">
        {lines.map((line, index) => (
          <ReceiptLine
            discountPercent={discountPercent}
            index={startIndex + index}
            key={line.id}
            line={line}
            mgAllocations={allocationsByLine.get(line.id) ?? []}
            tone={tone}
          />
        ))}
      </div>
    </section>
  );
}

function ReceiptLine({
  discountPercent,
  index,
  line,
  mgAllocations,
  tone,
}: {
  discountPercent: number;
  index: number;
  line: SalLineView;
  mgAllocations: MgAllocation[];
  tone: ReceiptTone;
}) {
  const [expanded, setExpanded] = useState(false);
  const charges = line.linkedCharges.filter((charge) => charge.total > 0);
  const hasDetails =
    line.measurementRows.length > 0 ||
    charges.length > 0 ||
    mgAllocations.length > 0 ||
    line.notes.trim().length > 0;
  const surchargeTotal =
    charges.reduce((sum, charge) => sum + charge.total, 0) +
    mgAllocations.reduce((sum, allocation) => sum + allocation.total, 0);

  return (
    <div className="bg-[var(--surface-base)]">
      <button
        className="grid w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--bg-muted)]/32 sm:px-6 xl:grid-cols-[36px_minmax(0,1fr)_440px]"
        disabled={!hasDetails}
        onClick={() => hasDetails && setExpanded((value) => !value)}
        type="button"
      >
        <div className="flex items-start justify-between gap-2 xl:block">
          <span className="text-11px font-bold tabular-nums text-[var(--text-secondary)]">
            {String(index).padStart(2, "0")}
          </span>
          {hasDetails ? (
            <ChevronDown
              className={cn(
                "size-4 text-[var(--text-secondary)] transition-transform xl:mt-2",
                expanded && "rotate-180",
              )}
            />
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CodeBadge code={line.voice.code} tone={tone} />
            {line.voice.isSafetyCost ? <SmallBadge tone="danger">OS</SmallBadge> : null}
            {line.status === "complete" ? (
              <SmallBadge tone="success">Completa</SmallBadge>
            ) : (
              <SmallBadge tone="warning">Da completare</SmallBadge>
            )}
            {mgAllocations.length > 0 ? <SmallBadge tone="info">MG</SmallBadge> : null}
          </div>
          <p className="mt-1.5 line-clamp-2 text-14px font-semibold leading-snug text-[var(--text-primary)]">
            {line.voice.description}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-12px font-medium text-[var(--text-secondary)]">
            <span>
              Qtà{" "}
              <strong className="tabular-nums text-[var(--text-secondary)]">
                {formatQuantity(line.quantity)}
              </strong>{" "}
              {line.voice.unit}
            </span>
            <span>
              PU{" "}
              <strong className="tabular-nums text-[var(--text-secondary)]">
                <Currency value={line.voice.unitPrice} />
              </strong>
            </span>
            <span>{line.measurementRows.length} righe misura</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-right sm:grid-cols-4">
          <AmountColumn label="Lordo" value={line.grossAmount} />
          <AmountColumn label="+ Magg." tone="info" value={surchargeTotal} />
          <AmountColumn
            label={`- ${formatPercent(discountPercent)}`}
            tone="danger"
            value={line.discountAmount}
          />
          <AmountColumn accent label="Netto" value={line.totalAmount} />
        </div>
      </button>

      {expanded ? (
        <LineDetails charges={charges} line={line} mgAllocations={mgAllocations} />
      ) : null}
    </div>
  );
}

function LineDetails({
  charges,
  line,
  mgAllocations,
}: {
  charges: SalLineView["linkedCharges"];
  line: SalLineView;
  mgAllocations: MgAllocation[];
}) {
  return (
    <div className="mx-5 mb-4 rounded-lg border border-[var(--border-subtle)]/55 bg-[var(--bg-muted)]/32 sm:mx-6 xl:ml-[84px]">
      <DetailBlock
        label="Libretto misure"
        value={`${formatQuantity(line.quantity)} ${line.voice.unit}`}
      >
        {line.measurementRows.map((row) => (
          <MeasurementRow key={row.id} row={row} />
        ))}
      </DetailBlock>

      {charges.length > 0 ? (
        <DetailBlock
          label="Maggiorazioni voce"
          value={`+ ${formatCurrencyValue(charges.reduce((sum, charge) => sum + charge.total, 0))}`}
        >
          {charges.map((charge) => (
            <DetailRow
              key={charge.id}
              label={`${charge.code} - ${charge.description}`}
              value={`+ ${formatCurrencyValue(charge.total)}`}
            />
          ))}
        </DetailBlock>
      ) : null}

      {mgAllocations.length > 0 ? (
        <DetailBlock
          label="MG distribuita"
          value={`+ ${formatCurrencyValue(mgAllocations.reduce((sum, item) => sum + item.total, 0))}`}
        >
          {mgAllocations.map((allocation) => (
            <DetailRow
              key={`${allocation.mgCode}-${allocation.lineId}`}
              label={`${allocation.mgCode} ${formatPercent(allocation.percent)} su ${formatCurrencyValue(allocation.baseAmount)}`}
              value={`+ ${formatCurrencyValue(allocation.total)}`}
            />
          ))}
        </DetailBlock>
      ) : null}

      {line.notes.trim() ? (
        <div className="border-t border-[var(--border-subtle)]/35 px-4 py-3 text-12px text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">Note: </span>
          {line.notes}
        </div>
      ) : null}
    </div>
  );
}

function MgSection({
  allocationsByMgLine,
  lines,
  startIndex,
}: {
  allocationsByMgLine: Map<string, MgAllocation[]>;
  lines: SalLineView[];
  startIndex: number;
}) {
  const amount = lines.reduce((sum, line) => sum + line.totalAmount, 0);

  return (
    <section>
      <SectionHeader
        amount={amount}
        count={lines.length}
        icon={<TrendingUp className="size-4" />}
        label="Maggiorazioni MG"
        tone="info"
      />
      <div className="divide-y divide-[var(--border-subtle)]/22">
        {lines.map((line, index) => {
          const allocations = allocationsByMgLine.get(line.id) ?? [];
          const baseAmount = allocations.reduce(
            (sum, allocation) => sum + allocation.baseAmount,
            0,
          );
          return (
            <div
              className="grid gap-3 px-5 py-3.5 sm:px-6 xl:grid-cols-[36px_minmax(0,1fr)_180px]"
              key={line.id}
            >
              <div className="text-11px font-bold tabular-nums text-[var(--text-secondary)]">
                {String(startIndex + index).padStart(2, "0")}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <CodeBadge code={line.voice.code} tone="info" />
                  <SmallBadge tone="info">{formatPercent(line.voice.unitPrice)}</SmallBadge>
                </div>
                <p className="mt-1.5 text-14px font-semibold text-[var(--text-primary)]">
                  {line.voice.description}
                </p>
                <div className="mt-1 text-12px font-medium text-[var(--text-secondary)]">
                  Base <Currency value={baseAmount || line.netAmount} /> - {allocations.length} voci
                  applicate
                </div>
              </div>
              <div className="text-right">
                <div className="text-10px font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                  Totale MG
                </div>
                <div className="mt-1 text-13px font-black tabular-nums text-[var(--info-base)]">
                  +<Currency value={line.totalAmount} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReceiptRail({
  economicRules,
  summary,
}: {
  economicRules: SalEconomicRules;
  summary: SalEconomicSummary;
}) {
  const contractAmount = summary.budgetResidual + summary.previousProgressiveAmount + summary.total;
  const previousPct =
    contractAmount > 0
      ? Math.min((summary.previousProgressiveAmount / contractAmount) * 100, 100)
      : 0;
  const currentPct = contractAmount > 0 ? Math.min((summary.total / contractAmount) * 100, 100) : 0;

  return (
    <aside className="border-t border-[var(--border-subtle)]/60 bg-[var(--bg-muted)]/30 px-5 py-5 sm:px-6 lg:border-l lg:border-t-0">
      <div className="lg:sticky lg:top-[172px]">
        <div className="text-11px font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
          Formula economica
        </div>
        <div className="mt-3 space-y-2">
          <SummaryRow label="Lordo" value={summary.grossAmount} />
          <SummaryRow
            label="Maggiorazioni"
            prefix="+"
            tone="info"
            value={summary.linkedChargeAmount}
          />
          <SummaryDivider />
          <SummaryRow
            label="Subtotale"
            strong
            value={summary.grossAmount + summary.linkedChargeAmount}
          />
          <SummaryRow
            label={`Ribasso ${formatPercent(economicRules.discountPercent)}`}
            prefix="-"
            tone="danger"
            value={summary.discountAmount}
          />
          <SummaryDivider />
          <div className="flex items-center justify-between rounded-xl bg-[var(--accent-primary)]/[0.07] px-4 py-3">
            <span className="text-12px font-black text-[var(--text-primary)]">Netto SAL</span>
            <span className="text-16px font-black tabular-nums text-[var(--accent-primary)]">
              <Currency value={summary.total} />
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/40">
          <div className="text-11px font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            Budget
          </div>
          <div className="mt-3 grid gap-2">
            <BudgetRow label="Contratto" value={contractAmount} />
            <BudgetRow label="SAL precedenti" value={summary.previousProgressiveAmount} />
            <BudgetRow accent label="Questo SAL" value={summary.total} />
            <BudgetRow
              label="Residuo"
              tone={summary.budgetResidual < 0 ? "danger" : "success"}
              value={summary.budgetResidual}
            />
          </div>
          <ProgressBar currentPct={currentPct} previousPct={previousPct} />
        </div>
      </div>
    </aside>
  );
}

function SectionHeader({
  amount,
  count,
  icon,
  label,
  tone,
}: {
  amount: number;
  count: number;
  icon: ReactNode;
  label: string;
  tone: ReceiptTone;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-5 py-3 sm:px-6",
        tone === "accent" && "bg-[var(--accent-primary)]/[0.035]",
        tone === "danger" && "bg-[var(--danger-base)]/[0.035]",
        tone === "info" && "bg-[var(--info-base)]/[0.04]",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            tone === "accent" && "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
            tone === "danger" && "bg-[var(--danger-base)]/10 text-[var(--danger-base)]",
            tone === "info" && "bg-[var(--info-base)]/10 text-[var(--info-base)]",
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-13px font-black text-[var(--text-primary)]">{label}</div>
          <div className="text-12px font-medium text-[var(--text-secondary)]">
            {count} voc{count === 1 ? "e" : "i"}
          </div>
        </div>
      </div>
      <div
        className={cn(
          "shrink-0 text-right text-14px font-black tabular-nums",
          tone === "accent" && "text-[var(--accent-primary)]",
          tone === "danger" && "text-[var(--danger-base)]",
          tone === "info" && "text-[var(--info-base)]",
        )}
      >
        {tone === "info" ? "+" : ""}
        <Currency value={amount} />
      </div>
    </div>
  );
}

function HeaderMetric({
  icon,
  label,
  tone,
  value,
}: {
  icon: ReactNode;
  label: string;
  tone?: "danger" | "info" | "success";
  value: number;
}) {
  return (
    <div className="rounded-lg bg-[var(--surface-base)] px-3 py-2.5 ring-1 ring-[var(--border-subtle)]/35">
      <div className="flex items-center gap-2 text-11px font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)]">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-13px font-black tabular-nums text-[var(--text-primary)]",
          tone === "danger" && "text-[var(--danger-base)]",
          tone === "info" && "text-[var(--info-base)]",
          tone === "success" && "text-[var(--success-base)]",
        )}
      >
        <Currency value={value} />
      </div>
    </div>
  );
}

function AmountColumn({
  accent,
  label,
  tone,
  value,
}: {
  accent?: boolean;
  label: string;
  tone?: "danger" | "info";
  value: number;
}) {
  return (
    <div className="min-w-0">
      <div className="text-10px font-bold uppercase tracking-[0.04em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 whitespace-nowrap text-13px font-bold tabular-nums text-[var(--text-secondary)]",
          accent && "text-[var(--accent-primary)]",
          tone === "danger" && value > 0 && "text-[var(--danger-base)]",
          tone === "info" && value > 0 && "text-[var(--info-base)]",
        )}
      >
        {tone === "info" && value > 0 ? "+" : ""}
        {tone === "danger" && value > 0 ? "-" : ""}
        <Currency value={value} />
      </div>
    </div>
  );
}

function DetailBlock({
  children,
  label,
  value,
}: {
  children: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-[var(--border-subtle)]/35 last:border-b-0">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-11px font-bold uppercase tracking-[0.07em] text-[var(--text-secondary)]">
        <span>{label}</span>
        <span className="tabular-nums text-[var(--text-secondary)]">{value}</span>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]/16">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 px-4 py-2.5 text-12px sm:grid-cols-[1fr_auto]">
      <span className="min-w-0 truncate text-[var(--text-secondary)]">{label}</span>
      <span className="font-bold tabular-nums text-[var(--info-base)]">{value}</span>
    </div>
  );
}

function MeasurementRow({ row }: { row: SalMeasurementRowDraft }) {
  const factors = [row.factor1, row.factor2, row.factor3]
    .filter((value, index) => index === 0 || value !== 1)
    .map(formatQuantity)
    .join(" x ");
  const description = [row.station, row.section, row.description].filter(Boolean).join(" - ");

  return (
    <div className="grid gap-2 px-4 py-2.5 text-12px sm:grid-cols-[96px_minmax(0,1fr)_120px_100px]">
      <span className="font-medium text-[var(--text-secondary)]">{row.date || "-"}</span>
      <span className="min-w-0 truncate text-[var(--text-secondary)]">
        {description || "Misura"}
      </span>
      <span className="text-right font-mono tabular-nums text-[var(--text-secondary)]">
        {factors || "0"}
      </span>
      <span className="text-right font-bold tabular-nums text-[var(--text-primary)]">
        {formatQuantity(row.partialQuantity)} {row.unit}
      </span>
    </div>
  );
}

function CodeBadge({ code, tone }: { code: string; tone: ReceiptTone }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-1 text-11px font-black tabular-nums",
        tone === "accent" && "bg-[var(--accent-primary)]/8 text-[var(--accent-primary)]",
        tone === "danger" && "bg-[var(--danger-base)]/8 text-[var(--danger-base)]",
        tone === "info" && "bg-[var(--info-base)]/8 text-[var(--info-base)]",
      )}
    >
      {code}
    </span>
  );
}

function SmallBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "danger" | "info" | "success" | "warning";
}) {
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-10px font-black uppercase tracking-[0.03em]",
        tone === "danger" && "bg-[var(--danger-base)]/8 text-[var(--danger-base)]",
        tone === "info" && "bg-[var(--info-base)]/8 text-[var(--info-base)]",
        tone === "success" && "bg-[var(--success-base)]/8 text-[var(--success-base)]",
        tone === "warning" && "bg-[var(--warning-base)]/10 text-[var(--warning-base)]",
      )}
    >
      {children}
    </span>
  );
}

function BudgetRow({
  accent,
  label,
  tone,
  value,
}: {
  accent?: boolean;
  label: string;
  tone?: "danger" | "success";
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-12px">
      <span className="font-medium text-[var(--text-secondary)]">{label}</span>
      <span
        className={cn(
          "font-bold tabular-nums text-[var(--text-secondary)]",
          accent && "text-[var(--accent-primary)]",
          tone === "danger" && "text-[var(--danger-base)]",
          tone === "success" && "text-[var(--success-base)]",
        )}
      >
        <Currency value={value} />
      </span>
    </div>
  );
}

function SummaryRow({
  label,
  prefix,
  strong,
  tone,
  value,
}: {
  label: string;
  prefix?: string;
  strong?: boolean;
  tone?: "danger" | "info";
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-12px">
      <span
        className={cn(
          "font-medium text-[var(--text-secondary)]",
          strong && "font-semibold text-[var(--text-primary)]",
          tone === "danger" && "text-[var(--danger-base)]",
          tone === "info" && "text-[var(--info-base)]",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-bold tabular-nums text-[var(--text-secondary)]",
          strong && "text-[var(--text-primary)]",
          tone === "danger" && "text-[var(--danger-base)]",
          tone === "info" && "text-[var(--info-base)]",
        )}
      >
        {prefix}
        <Currency value={value} />
      </span>
    </div>
  );
}

function SummaryDivider() {
  return <div className="border-t border-[var(--border-subtle)]/28" />;
}

function ProgressBar({ currentPct, previousPct }: { currentPct: number; previousPct: number }) {
  const totalPct = Math.min(Math.max(previousPct + currentPct, 0), 100);
  const previousShare = totalPct > 0 ? (Math.max(previousPct, 0) / totalPct) * 100 : 0;
  const currentShare = totalPct > 0 ? (Math.max(currentPct, 0) / totalPct) * 100 : 0;

  return (
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--border-subtle)]/35">
      <div className="flex h-full" style={{ width: `${totalPct}%` }}>
        {previousShare > 0 ? (
          <div
            className="h-full bg-[var(--border-subtle)]/85"
            style={{ width: `${previousShare}%` }}
          />
        ) : null}
        {currentShare > 0 ? (
          <div
            className="h-full bg-[var(--accent-primary)]"
            style={{ width: `${currentShare}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}

function EmptyReceipt() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-[var(--bg-muted)] text-[var(--text-secondary)]">
        <ReceiptText className="size-5" />
      </span>
      <p className="mt-3 text-14px font-black text-[var(--text-primary)]">Nessuna voce inserita</p>
      <p className="mt-1 max-w-sm text-13px leading-relaxed text-[var(--text-secondary)]">
        Aggiungi voci e misure per generare la ricevuta contabile.
      </p>
    </div>
  );
}

function splitReceiptLines(lineViews: SalLineView[]) {
  const workLines: SalLineView[] = [];
  const mgLines: SalLineView[] = [];
  const safetyLines: SalLineView[] = [];
  for (const line of lineViews) {
    if (isMgCode(line.voice.code)) mgLines.push(line);
    else if (line.voice.isSafetyCost) safetyLines.push(line);
    else workLines.push(line);
  }
  return { mgLines, safetyLines, workLines };
}

function buildMgAllocations(baseLines: SalLineView[], mgLines: SalLineView[]) {
  const allocationsByLine = new Map<string, MgAllocation[]>();
  const allocationsByMgLine = new Map<string, MgAllocation[]>();
  const baseLinesByPrefix = new Map<string, SalLineView[]>();

  for (const line of baseLines) {
    if (line.grossAmount <= 0) continue;
    const prefix = line.voice.code.split(".")[0] ?? "";
    const current = baseLinesByPrefix.get(prefix) ?? [];
    current.push(line);
    baseLinesByPrefix.set(prefix, current);
  }

  for (const mgLine of mgLines) {
    const percent = mgLine.voice.unitPrice;
    if (percent <= 0) {
      allocationsByMgLine.set(mgLine.id, []);
      continue;
    }

    const tariffPrefix = extractMgTariffPrefix(mgLine.voice.code);
    const eligibleLines = tariffPrefix
      ? (baseLinesByPrefix.get(tariffPrefix) ?? [])
      : baseLines.filter((line) => line.grossAmount > 0);

    const allocations = eligibleLines
      .map((line) => ({
        baseAmount: line.grossAmount,
        lineCode: line.voice.code,
        lineDescription: line.voice.description,
        lineId: line.id,
        mgCode: mgLine.voice.code,
        percent,
        total: roundCurrency(line.grossAmount * (percent / 100)),
      }))
      .filter((allocation) => allocation.total > 0);

    allocationsByMgLine.set(mgLine.id, allocations);
    for (const allocation of allocations) {
      const current = allocationsByLine.get(allocation.lineId) ?? [];
      current.push(allocation);
      allocationsByLine.set(allocation.lineId, current);
    }
  }

  return { allocationsByLine, allocationsByMgLine };
}

function Currency({ value }: { value: number }) {
  return <>{formatCurrencyValue(value)}</>;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatCurrencyValue(value: number) {
  return value.toLocaleString("it-IT", {
    currency: "EUR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  });
}

function formatPercent(value: number) {
  return `${value.toLocaleString("it-IT", { maximumFractionDigits: 2 })}%`;
}

function formatQuantity(value: number) {
  return value.toLocaleString("it-IT", { maximumFractionDigits: 3 });
}
