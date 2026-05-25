import { m } from "framer-motion";
import { Building2, Calculator, CheckCircle2, FileText, Loader2, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { DatePicker } from "@/components/shared/form";
import { cn } from "@/lib/utils";
import { EconomicEquation } from "../components/SalCreationSummary";
import { Currency } from "../components/SalCreationTables";
import type { SalEconomicSummary, SalProjectContext, SalTariffBookOption } from "../types";

const MAX_RENDERED_TARIFF_BOOKS = 80;

export function ProjectStep({
  project,
  contracts,
  onSelectContract,
  salDate,
  salTitle,
  suggestedSalTitle,
  selectedTariffBooks,
  selectedTariffBook,
  selectTariffBook,
  setSelectedTariffBookIds,
  isLoading,
  setSalDate,
  setSalTitle,
  summary,
  tariffBooks,
  voicesCount,
}: {
  project: SalProjectContext | null;
  contracts: { id: string; title: string; contractor?: string }[];
  onSelectContract?: (id: string) => void;
  salDate: string;
  salTitle: string;
  suggestedSalTitle: string;
  selectedTariffBooks: SalTariffBookOption[];
  selectedTariffBook: SalTariffBookOption | null;
  selectTariffBook: (id: string) => Promise<void>;
  setSelectedTariffBookIds: (ids: string[]) => Promise<void>;
  isLoading?: boolean;
  setSalDate: (date: string) => void;
  setSalTitle: (value: string) => void;
  summary: SalEconomicSummary;
  tariffBooks: SalTariffBookOption[];
  voicesCount: number;
}) {
  const [contractOpen, setContractOpen] = useState(false);
  const [tariffSearch, setTariffSearch] = useState("");

  const filteredTariffBooks = useMemo(() => {
    if (!tariffSearch.trim()) return tariffBooks;
    const q = tariffSearch.toLowerCase();
    return tariffBooks.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        String(b.year).includes(q) ||
        b.id.toLowerCase().includes(q),
    );
  }, [tariffBooks, tariffSearch]);
  const selectedTariffBookIdSet = useMemo(
    () => new Set(selectedTariffBooks.map((book) => book.id)),
    [selectedTariffBooks],
  );
  const visibleTariffBooks = useMemo(
    () => filteredTariffBooks.slice(0, MAX_RENDERED_TARIFF_BOOKS),
    [filteredTariffBooks],
  );
  const hiddenTariffBookCount = Math.max(0, filteredTariffBooks.length - visibleTariffBooks.length);

  const showContractSelector = contracts.length > 1 && onSelectContract;

  if (!project) {
    return (
      <EmptyState
        description="Crea o apri un progetto prima di generare una SAL."
        icon={Building2}
        title="Nessun contratto disponibile"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Project + Date */}
      <div className="rounded-2xl bg-[var(--surface-base)] ring-1 ring-[var(--border-subtle)]/60">
        <div className="px-5 py-4">
          {showContractSelector ? (
            <div className="relative">
              <button
                className="flex w-full items-center gap-4 text-left"
                onClick={() => setContractOpen(!contractOpen)}
                type="button"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--info-soft)] text-[var(--info-base)]">
                  <Building2 className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-11px font-medium text-[var(--text-tertiary)]">Progetto</div>
                  <div className="mt-0.5 truncate text-15px font-bold text-[var(--text-primary)]">
                    {project.title}
                  </div>
                  <div className="mt-0.5 truncate text-12px text-[var(--text-secondary)]">
                    {project.contractor}
                  </div>
                </div>
                <span className="shrink-0 rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-11px font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)]">
                  Cambia
                </span>
              </button>
              {contractOpen && (
                <>
                  <button
                    className="fixed inset-0 z-[var(--z-dropdown-menu)] cursor-default"
                    onClick={() => setContractOpen(false)}
                    type="button"
                    aria-label="Chiudi"
                  />
                  <div className="absolute left-0 top-full z-[var(--z-dropdown-menu)] mt-2 w-full overflow-hidden rounded-xl bg-[var(--surface-base)] p-1.5 shadow-soft ring-1 ring-[var(--border-subtle)]">
                    {contracts.map((c) => {
                      const isActive = c.id === project.id;
                      return (
                        <button
                          key={c.id}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                            isActive
                              ? "bg-[var(--accent-primary)]/8 ring-1 ring-[var(--accent-primary)]/25"
                              : "hover:bg-[var(--bg-muted)]",
                          )}
                          onClick={() => {
                            if (!isActive && onSelectContract) onSelectContract(c.id);
                            setContractOpen(false);
                          }}
                          type="button"
                        >
                          <span
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-lg",
                              isActive
                                ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                                : "bg-[var(--info-soft)] text-[var(--info-base)]",
                            )}
                          >
                            <Building2 className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-13px font-semibold text-[var(--text-primary)]">
                              {c.title}
                            </div>
                            <div className="truncate text-11px text-[var(--text-secondary)]">
                              {c.contractor ?? "—"}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--info-soft)] text-[var(--info-base)]">
                <Building2 className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-11px font-medium text-[var(--text-tertiary)]">Progetto</div>
                <div className="mt-0.5 truncate text-15px font-bold text-[var(--text-primary)]">
                  {project.title}
                </div>
                <div className="mt-0.5 truncate text-12px text-[var(--text-secondary)]">
                  {project.contractor}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border-subtle)]/40 px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="text-12px font-medium text-[var(--text-secondary)]"
                htmlFor="sal-title-input"
              >
                Titolo SAL
              </label>
              <input
                className="mt-1.5 h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)]/30 px-3.5 text-14px font-semibold text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:bg-[var(--surface-base)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                id="sal-title-input"
                onChange={(e) => setSalTitle(e.target.value)}
                placeholder={suggestedSalTitle}
                value={salTitle}
              />
            </div>
            <div>
              <label
                className="text-12px font-medium text-[var(--text-secondary)]"
                htmlFor="sal-date-input"
              >
                Data SAL
              </label>
              <DatePicker
                ariaLabel="Data SAL"
                className="mt-1.5 h-10 rounded-lg bg-[var(--bg-muted)]/30 text-14px font-semibold focus-visible:bg-[var(--surface-base)]"
                id="sal-date-input"
                onChange={setSalDate}
                value={salDate}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tariff books */}
      <div className="rounded-2xl bg-[var(--surface-base)] px-5 py-4 ring-1 ring-[var(--border-subtle)]/60">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-15px font-semibold text-[var(--text-primary)]">Tariffari</h3>
            <div className="mt-0.5 flex items-center gap-1.5 text-12px text-[var(--text-secondary)]">
              {selectedTariffBooks.length > 0 ? (
                <>
                  <CheckCircle2 className="size-3.5 text-[var(--success-base)]" />
                  <span>
                    {selectedTariffBooks.length} selezionat
                    {selectedTariffBooks.length !== 1 ? "i" : "o"}
                    {isLoading ? (
                      <>
                        {" · "}
                        <Loader2 className="inline size-3 animate-spin align-text-top" />
                        {" Caricamento voci..."}
                      </>
                    ) : selectedTariffBook ? (
                      ` · ${voicesCount} voci caricate`
                    ) : (
                      ""
                    )}
                  </span>
                </>
              ) : (
                <span className="font-medium text-[var(--warning-base)]">
                  Seleziona almeno un tariffario
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            className="inline-flex h-7 items-center rounded-md bg-[var(--accent-primary)]/[0.08] px-2.5 text-11px font-bold text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/[0.12]"
            onClick={() => void setSelectedTariffBookIds(tariffBooks.map((b) => b.id))}
            type="button"
          >
            Seleziona tutto
          </button>
          <button
            className="inline-flex h-7 items-center rounded-md bg-[var(--bg-muted)] px-2.5 text-11px font-bold text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]/60 transition-colors hover:bg-[var(--bg-muted-strong)]"
            onClick={() => {
              const first = tariffBooks[0];
              if (first) void setSelectedTariffBookIds([first.id]);
            }}
            type="button"
          >
            Deseleziona tutto
          </button>
        </div>

        {tariffBooks.length > 6 && (
          <div className="relative mt-3">
            <svg
              aria-label="Cerca"
              className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-tertiary)]"
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
              className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)]/30 pl-9 pr-3 text-12px outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:bg-[var(--surface-base)]"
              onChange={(e) => setTariffSearch(e.target.value)}
              placeholder="Cerca tariffario per nome, anno o codice..."
              value={tariffSearch}
            />
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {visibleTariffBooks.map((book) => {
            const isSelected = selectedTariffBookIdSet.has(book.id);
            return (
              <m.button
                key={book.id}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-12px font-medium transition-all",
                  isSelected
                    ? "border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/8 text-[var(--accent-primary)]"
                    : "border-[var(--border-subtle)]/60 bg-[var(--surface-base)] text-[var(--text-tertiary)] hover:border-[var(--border-subtle)] hover:text-[var(--text-secondary)]",
                )}
                layout
                onClick={() => void selectTariffBook(book.id)}
                type="button"
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-sm border",
                    isSelected
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                      : "border-[var(--border-subtle)]",
                  )}
                >
                  {isSelected && (
                    <svg
                      className="size-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  )}
                </span>
                <span className="max-w-[200px] truncate">{book.name}</span>
                <span className="text-11px text-[var(--text-tertiary)]">{book.year}</span>
              </m.button>
            );
          })}
        </div>
        {hiddenTariffBookCount > 0 ? (
          <div className="mt-2 text-11px font-medium text-[var(--text-tertiary)]">
            Mostrati {visibleTariffBooks.length} tariffari su {filteredTariffBooks.length}. Usa la
            ricerca per restringere l'elenco.
          </div>
        ) : null}
      </div>

      {/* Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Wallet className="size-4" />}
          label="Budget totale"
          value={<Currency value={project.contractAmount} />}
        />
        <KpiCard
          icon={<Calculator className="size-4" />}
          label="Residuo stimato"
          value={<Currency value={summary.budgetResidual} />}
          valueTone={summary.budgetResidual >= 0 ? "success" : "danger"}
        />
        <KpiCard
          icon={<FileText className="size-4" />}
          label="Ribasso contratto"
          value={`${project.tenderDiscountPercent}%`}
          subtitle={
            summary.discountAmount > 0
              ? `−${summary.discountAmount.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}`
              : undefined
          }
        />
        <KpiCard
          icon={<Calculator className="size-4" />}
          label="Voci disponibili"
          value={voicesCount.toString()}
          subtitle="nel tariffario"
        />
      </div>

      <EconomicEquation summary={summary} />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  subtitle,
  valueTone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subtitle?: string | undefined;
  valueTone?: "success" | "danger";
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/50">
      <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
        <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--bg-muted)]">
          {icon}
        </span>
        <span className="text-11px font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div
        className={cn(
          "mt-2 text-18px font-black tabular-nums",
          valueTone === "success" && "text-[var(--success-base)]",
          valueTone === "danger" && "text-[var(--danger-base)]",
          !valueTone && "text-[var(--text-primary)]",
        )}
      >
        {value}
      </div>
      {subtitle && <div className="mt-1 text-11px text-[var(--text-secondary)]">{subtitle}</div>}
    </div>
  );
}
