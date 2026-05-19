import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { m } from "framer-motion";
import { ArrowRightLeft, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataChangedListener } from "@/hooks/useDataChangedListener";
import type { DesktopMaterial } from "@/lib/desktopData";
import { SalReceipt } from "../components/SalReceipt";
import type {
  SalEconomicRules,
  SalEconomicSummary,
  SalLineView,
  SalVerificationCheck,
} from "../types";
import { SalComparisonView } from "../components/SalComparisonView";

export function VerifyStep({
  checks,
  economicRules,
  lineViews,
  materialUsage,
  materials,
  onAutoSave,
  onMaterialUsageChange,
  onMaterialsChange,
  summary,
  previousSalLines,
  compareLines,
  onToggleCompare,
}: {
  checks: SalVerificationCheck[];
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  materialUsage: Record<string, number>;
  materials: DesktopMaterial[];
  onAutoSave: () => void;
  onMaterialUsageChange: (usage: Record<string, number>) => void;
  onMaterialsChange: (mats: DesktopMaterial[]) => void;
  summary: SalEconomicSummary;
  previousSalLines: SalLineView[];
  compareLines: SalLineView[] | null;
  onToggleCompare: () => void;
}) {
  const [materialsLoadEpoch, setMaterialsLoadEpoch] = useState(0);
  const [isSearchingMaterials, setIsSearchingMaterials] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialExpanded, setMaterialExpanded] = useState(false);
  const onMaterialsChangeRef = useRef(onMaterialsChange);
  onMaterialsChangeRef.current = onMaterialsChange;

  // biome-ignore lint/correctness/useExhaustiveDependencies: epoch trigger
  useEffect(() => {
    setIsSearchingMaterials(true);
    import("@/lib/desktopData").then(({ listDesktopMaterials }) =>
      listDesktopMaterials([]).then((res) => {
        onMaterialsChangeRef.current(res.data);
        setIsSearchingMaterials(false);
      }),
    );
  }, [materialsLoadEpoch]);

  const refreshMaterials = useCallback(() => {
    setMaterialsLoadEpoch((e) => e + 1);
    return undefined;
  }, []);

  useDataChangedListener(refreshMaterials, 0);

  const filteredMaterials = useMemo(() => {
    if (!materialSearch.trim()) return materials;
    const q = materialSearch.toLowerCase();
    return materials.filter(
      (m) =>
        m.code.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        (m.category ?? "").toLowerCase().includes(q),
    );
  }, [materials, materialSearch]);

  const displayMaterials = materialExpanded ? filteredMaterials : filteredMaterials.slice(0, 6);
  const hasMoreMaterials = filteredMaterials.length > 6;
  const usageCount = Object.values(materialUsage).filter((q) => q > 0).length;
  const usageTotalQty = Object.values(materialUsage).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Checks */}
      <div className="rounded-xl bg-[var(--surface-base)] px-4 py-3 ring-1 ring-[var(--border-subtle)]/50">
        <div className="mb-2 text-10px font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
          Controlli automatici
        </div>
        <div className="flex flex-wrap gap-2">
          {checks.map((c) => (
            <CheckPill key={c.id} check={c} />
          ))}
        </div>
        {previousSalLines.length > 0 && (
          <div className="mt-3 flex justify-end">
            <m.button
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-11px font-medium ring-1 transition-all",
                compareLines
                  ? "bg-[var(--accent-primary)]/8 text-[var(--accent-primary)] ring-[var(--accent-primary)]/25"
                  : "bg-[var(--surface-base)] text-[var(--text-secondary)] ring-[var(--border-subtle)] hover:bg-[var(--bg-muted)]",
              )}
              onClick={onToggleCompare}
              type="button"
            >
              <ArrowRightLeft className="size-3.5" />
              {compareLines ? "Nascondi confronto" : "Confronta SAL precedente"}
            </m.button>
          </div>
        )}
      </div>

      {compareLines && <SalComparisonView before={previousSalLines} after={lineViews} />}

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        {/* Receipt */}
        <SalReceipt
          economicRules={economicRules}
          lineViews={lineViews}
          summary={summary}
          title="Verifica riepilogo"
        />

        {/* Right column: Materials */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl bg-[var(--surface-base)] ring-1 ring-[var(--border-subtle)]/60">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)]/40 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--bg-muted)] text-[var(--text-tertiary)]">
                  <Package className="size-4" />
                </span>
                <div>
                  <div className="text-12px font-medium text-[var(--text-primary)]">
                    Materiali in cantiere
                  </div>
                  {usageCount > 0 && (
                    <div className="text-10px text-[var(--text-tertiary)]">
                      {usageCount} material{usageCount !== 1 ? "i" : "e"} ·{" "}
                      {usageTotalQty.toLocaleString("it-IT")} unità
                    </div>
                  )}
                </div>
              </div>
            </div>

            {materials.length > 0 && (
              <div className="border-b border-[var(--border-subtle)]/30 px-3 py-2">
                <div className="relative">
                  <svg
                    aria-label="Cerca"
                    className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-tertiary)]"
                    fill="none"
                    role="img"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    className="h-8 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)]/30 pl-8 pr-3 text-12px outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:bg-[var(--surface-base)]"
                    onChange={(e) => {
                      setMaterialSearch(e.target.value);
                      setMaterialExpanded(true);
                    }}
                    placeholder="Cerca codice, descrizione o categoria..."
                    value={materialSearch}
                  />
                </div>
              </div>
            )}

            {materials.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <Package className="mb-2 size-8 text-[var(--text-tertiary)]" />
                <p className="text-13px font-medium text-[var(--text-primary)]">
                  {isSearchingMaterials ? "Caricamento..." : "Nessun materiale disponibile"}
                </p>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto">
                {displayMaterials.map((mat) => {
                  const available = mat.quantity ?? 0;
                  const minQ = mat.minQuantity ?? 0;
                  const used = materialUsage[mat.id] ?? 0;
                  const remaining = Math.max(0, available - used);
                  const exceeds = used > available;
                  const stockTone =
                    minQ > 0
                      ? remaining < minQ
                        ? "danger"
                        : remaining <= minQ * 1.5
                          ? "warning"
                          : "success"
                      : "success";

                  return (
                    <div
                      key={mat.id}
                      className="flex items-center gap-3 border-b border-[var(--border-subtle)]/30 px-4 py-3 last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="truncate text-12px font-medium text-[var(--text-primary)]">
                            {mat.description}
                          </span>
                          <span className="shrink-0 text-10px text-[var(--text-tertiary)]">
                            {mat.code}
                          </span>
                          {exceeds && (
                            <span className="shrink-0 rounded-full bg-[var(--danger-soft)] px-1.5 py-0.5 text-9px font-bold text-[var(--danger-base)]">
                              Eccesso
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-10px text-[var(--text-tertiary)]">
                          <StockBar
                            coverage={
                              available > 0
                                ? Math.min(100, Math.round((remaining / available) * 100))
                                : 0
                            }
                            tone={stockTone}
                          />
                          <span>{mat.category}</span>
                          <span>
                            disp.{" "}
                            <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                              {available.toLocaleString("it-IT")}
                            </span>{" "}
                            {mat.unit}
                          </span>
                          {minQ > 0 && (
                            <span>
                              soglia{" "}
                              <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                                {minQ.toLocaleString("it-IT")}
                              </span>
                            </span>
                          )}
                          {used > 0 && (
                            <>
                              <span>
                                usati{" "}
                                <span className="font-semibold tabular-nums text-[var(--accent-primary)]">
                                  {used.toLocaleString("it-IT")}
                                </span>
                              </span>
                              <span>
                                restano{" "}
                                <span
                                  className={cn(
                                    "font-semibold tabular-nums",
                                    remaining < minQ
                                      ? "text-[var(--danger-base)]"
                                      : remaining <= minQ * 1.5
                                        ? "text-[var(--warning-base)]"
                                        : "text-[var(--success-base)]",
                                  )}
                                >
                                  {remaining.toLocaleString("it-IT")}
                                </span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center overflow-hidden rounded-md border border-[var(--border-subtle)]">
                        <button
                          className="flex size-7 items-center justify-center text-13px text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-muted)] disabled:opacity-30"
                          disabled={used <= 0}
                          onClick={() =>
                            onMaterialUsageChange({
                              ...materialUsage,
                              [mat.id]: Math.max(0, used - 1),
                            })
                          }
                          type="button"
                        >
                          −
                        </button>
                        <input
                          className="h-7 w-14 border-x border-[var(--border-subtle)] bg-[var(--surface-base)] px-1 text-center text-11px font-semibold tabular-nums outline-none transition focus:bg-[var(--bg-muted)]"
                          inputMode="decimal"
                          onBlur={onAutoSave}
                          onChange={(e) => {
                            const qty = Math.max(
                              0,
                              Number.parseFloat(e.target.value.replace(",", ".")) || 0,
                            );
                            onMaterialUsageChange({ ...materialUsage, [mat.id]: qty });
                          }}
                          placeholder="0"
                          type="text"
                          value={used || ""}
                        />
                        <button
                          className="flex size-7 items-center justify-center text-13px text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-muted)]"
                          onClick={() =>
                            onMaterialUsageChange({ ...materialUsage, [mat.id]: used + 1 })
                          }
                          type="button"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {hasMoreMaterials && (
              <button
                className="flex w-full items-center justify-center gap-1 border-t border-[var(--border-subtle)]/30 px-4 py-2 text-11px font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--bg-muted)]/30"
                onClick={() => setMaterialExpanded((o) => !o)}
                type="button"
              >
                {materialExpanded ? "Mostra meno" : `Mostra tutti (${filteredMaterials.length})`}
              </button>
            )}

            {usageCount > 0 && (
              <div className="flex items-center justify-between border-t border-[var(--border-subtle)]/30 bg-[var(--bg-muted)]/20 px-4 py-2 text-11px text-[var(--text-tertiary)]">
                <span>
                  <span className="font-medium text-[var(--text-secondary)]">{usageCount}</span>{" "}
                  materiali con consumo
                </span>
                <span>
                  Totale{" "}
                  <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                    {usageTotalQty.toLocaleString("it-IT")}
                  </span>{" "}
                  unità
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckPill({ check }: { check: SalVerificationCheck }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-11px font-medium",
        check.tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
        check.tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
        check.tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger-base)]",
      )}
      title={check.detail}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          check.tone === "success" ? "bg-current" : "bg-current opacity-60",
        )}
      />
      {check.result}
    </span>
  );
}

function StockBar({ coverage, tone }: { coverage: number; tone: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex h-1.5 w-16 overflow-hidden rounded-full bg-[var(--border-subtle)] sm:w-20">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            tone === "danger" && "bg-[var(--danger-base)]",
            tone === "warning" && "bg-[var(--warning-base)]",
            tone === "success" && "bg-[var(--success-base)]",
          )}
          style={{ width: `${coverage}%` }}
        />
      </div>
      <span
        className={cn(
          "w-7 text-right font-semibold tabular-nums text-10px",
          tone === "danger" && "text-[var(--danger-base)]",
          tone === "warning" && "text-[var(--warning-base)]",
          tone === "success" && "text-[var(--success-base)]",
        )}
      >
        {coverage}%
      </span>
    </div>
  );
}
