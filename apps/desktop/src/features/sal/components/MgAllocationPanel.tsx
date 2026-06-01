import { Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/shared/Button";
import { Currency } from "@/components/shared/Currency";
import { Dialog } from "@/components/shared/Dialog";
import { Panel } from "@/components/shared/Panel";
import { cn } from "@/lib/utils";
import { extractMgTariffPrefix, getMgAssignableTargetLines } from "../domain/sal-calculations";
import type { SalEconomicRules, SalLineView } from "../types";

function getVoicePrefix(code: string): string {
  const p = code.split(".")[0];
  return p?.trim().toUpperCase() ?? "";
}

type MgAllocationPanelProps = {
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  mgLine: SalLineView;
  onClose: () => void;
  onSave: (mgLineId: string, targetLineIds: string[]) => void;
};

/**
 * Clean, non-repetitive MG allocation modal.
 *
 * Philosophy:
 * - Header: only the MG identity (code + %). Minimal.
 * - Top: clear "Attualmente applicata a" chips (removable). This is the single source of truth for "what is already linked".
 * - Main area: discovery + multi-select of voices to link (search, prefixes, list).
 * - Footer: one compact live summary of the *pending selection* + strong primary action.
 * - Zero duplicate numbers across sections.
 * - Confirm button explicitly white text on accent bg.
 */
export function MgAllocationPanel({
  economicRules,
  lineViews,
  mgLine,
  onClose,
  onSave,
}: MgAllocationPanelProps) {
  const eligible = useMemo(() => getMgAssignableTargetLines(lineViews), [lineViews]);

  const prefixes = useMemo(() => {
    const set = new Set<string>();
    for (const line of eligible) {
      const p = getVoicePrefix(line.voice.code);
      if (p) set.add(p);
    }
    return [...set].sort();
  }, [eligible]);

  const [query, setQuery] = useState("");
  const [activePrefixes, setActivePrefixes] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    const alloc = economicRules.mgManualAllocations?.[mgLine.id] ?? [];
    const assignableIds = new Set(eligible.map((line) => line.id));
    setSelected((prev) => {
      const next = new Set(alloc.filter((id) => assignableIds.has(id)));
      if (prev.size === next.size && [...next].every((id) => prev.has(id))) return prev;
      return next;
    });
  }, [eligible, mgLine.id, economicRules.mgManualAllocations]);

  const filtered = useMemo(() => {
    let result = eligible;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (line) =>
          line.voice.code.toLowerCase().includes(q) ||
          line.voice.description.toLowerCase().includes(q),
      );
    }
    if (activePrefixes.size > 0) {
      result = result.filter((line) => activePrefixes.has(getVoicePrefix(line.voice.code)));
    }
    return result;
  }, [eligible, query, activePrefixes]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((line) => selected.has(line.id));
  const someFilteredSelected =
    filtered.some((line) => selected.has(line.id)) && !allFilteredSelected;

  // Currently linked to this MG (shown as removable chips at the top)
  const assignedVoices = useMemo(
    () => eligible.filter((line) => selected.has(line.id)),
    [eligible, selected],
  );

  const togglePrefix = useCallback((prefix: string) => {
    setActivePrefixes((prev) => {
      const next = new Set(prev);
      if (next.has(prefix)) next.delete(prefix);
      else next.add(prefix);
      return next;
    });
  }, []);

  const toggleLine = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleFiltered = useCallback(() => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const line of filtered) next.delete(line.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const line of filtered) next.add(line.id);
        return next;
      });
    }
  }, [filtered, allFilteredSelected]);

  const handleSave = useCallback(() => {
    onSave(mgLine.id, [...selectedRef.current]);
    onClose();
  }, [onSave, mgLine.id, onClose]);

  // "Disattiva" = clear all allocations for this MG voice (the MG line itself stays in the SAL, just becomes inactive/unassigned).
  // Full deletion of the MG line is done via the trash icon on the pill in the header cluster.
  const handleDeactivateMg = useCallback(() => {
    onSave(mgLine.id, []);
    // Defer the close so the parent's state update (economicRules) has a chance to flush
    // before the modal unmounts. This prevents the cluster from re-rendering with stale
    // rules and the pill briefly "reactivating".
    setTimeout(() => {
      onClose();
    }, 0);
  }, [onSave, mgLine.id, onClose]);

  const removeAssigned = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const tariffPrefix = extractMgTariffPrefix(mgLine.voice.code);
  const isRealMg = mgLine.voice.code.includes(".MG.");

  // Live numbers for the *current checkbox selection* (what will be saved)
  const selectedGross = eligible
    .filter((line) => selected.has(line.id))
    .reduce((sum, line) => sum + line.grossAmount, 0);

  const prospectiveSurcharge = selectedGross * (mgLine.voice.unitPrice / 100);

  return (
    <Dialog className="max-w-3xl" contentClassName="p-0" isOpen onClose={onClose} title="">
      <Panel padding="none">
        {/* Clean minimal header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)]/50 px-6 py-4">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-20px font-bold tracking-[-0.01em] text-[var(--text-primary)]">
              {mgLine.voice.code}
            </span>
            <span className="font-mono text-20px font-extrabold text-[var(--accent-primary)]">
              {mgLine.voice.unitPrice.toLocaleString("it-IT")}%
            </span>
            {tariffPrefix && (
              <span className="text-12px font-medium text-[var(--text-tertiary)]">
                su {tariffPrefix}
              </span>
            )}
          </div>
          <div className="text-10px font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            {isRealMg ? "Maggiorazione tariffaria" : "Maggiorazione"}
          </div>
        </div>

        {/* "Attualmente applicata a" — single clear source for already-linked voices */}
        <div className="border-b border-[var(--border-subtle)]/40 bg-[var(--surface-base)] px-6 py-3.5">
          <div className="mb-2 flex items-center gap-2 text-10px font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Attualmente applicata a
            <span className="font-mono text-11px font-black text-[var(--text-primary)]">
              {assignedVoices.length}
            </span>
          </div>

          {assignedVoices.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {assignedVoices.map((line) => (
                <span
                  key={line.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)]/60 bg-[var(--bg-muted)]/60 pl-2.5 pr-1 py-px text-10px"
                >
                  <span className="font-mono font-semibold text-[var(--text-primary)]">
                    {line.voice.code}
                  </span>
                  <span className="font-mono text-[var(--text-tertiary)]">
                    <Currency value={line.grossAmount} />
                  </span>
                  <button
                    aria-label={`Rimuovi ${line.voice.code}`}
                    className="ml-0.5 flex size-4 items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)]"
                    onClick={() => removeAssigned(line.id)}
                    type="button"
                  >
                    <X className="size-2.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-11px text-[var(--text-tertiary)]">
              Nessuna voce collegata a questa maggiorazione.
            </div>
          )}
        </div>

        {/* Filters (compact) */}
        <div className="space-y-2.5 border-b border-[var(--border-subtle)]/40 px-6 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              className="h-8 w-full rounded-md border border-[var(--border-subtle)]/50 bg-[var(--surface-base)] pl-8 pr-8 text-12px placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)]/40 focus:outline-none"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca codice o descrizione..."
              value={query}
            />
            {query && (
              <button
                className="absolute right-2 top-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                onClick={() => setQuery("")}
                type="button"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {prefixes.length > 1 && (
            <div className="flex flex-wrap items-center gap-1">
              {prefixes.map((prefix) => {
                const active = activePrefixes.has(prefix);
                const count = eligible.filter(
                  (l) => getVoicePrefix(l.voice.code) === prefix,
                ).length;
                const selCount = eligible.filter(
                  (l) => getVoicePrefix(l.voice.code) === prefix && selected.has(l.id),
                ).length;
                return (
                  <button
                    key={prefix}
                    onClick={() => togglePrefix(prefix)}
                    className={cn(
                      "rounded px-2 py-0.5 text-9px font-bold uppercase tracking-wider transition-colors",
                      active
                        ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                        : "bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted-strong)]",
                    )}
                    type="button"
                  >
                    {prefix} <span className="opacity-70 tabular-nums">{selCount || count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selection toolbar (very light) */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)]/30 bg-[var(--bg-muted)]/30 px-6 py-2 text-10px">
          <label className="flex cursor-pointer items-center gap-1.5 text-[var(--text-secondary)]">
            <input
              checked={allFilteredSelected}
              className="size-3.5 rounded border-[var(--border-subtle)] accent-[var(--accent-primary)] focus:ring-0"
              onChange={toggleFiltered}
              ref={(el) => {
                if (el) el.indeterminate = someFilteredSelected;
              }}
              type="checkbox"
            />
            <span className="font-medium">
              {allFilteredSelected ? "Deseleziona" : "Seleziona"} filtrate
            </span>
          </label>
          <span className="text-[var(--text-tertiary)]">
            {filtered.length} di {eligible.length}
          </span>

          <span className="ml-auto font-mono text-[var(--text-tertiary)]">
            {selected.size} selezionate · <Currency value={selectedGross} />
          </span>
        </div>

        {/* The list — clean and dense */}
        <div className="max-h-[320px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-6 py-8 text-center text-12px text-[var(--text-tertiary)]">
              Nessuna voce corrisponde ai filtri.
            </div>
          ) : (
            filtered.map((line) => {
              const prefix = getVoicePrefix(line.voice.code);
              const checked = selected.has(line.id);
              return (
                <label
                  key={line.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 border-b border-[var(--border-subtle)]/10 px-6 py-2 text-12px transition-colors hover:bg-[var(--accent-primary)]/[0.02]",
                    checked && "bg-[var(--accent-primary)]/[0.035]",
                  )}
                >
                  <input
                    checked={checked}
                    className="size-3.5 rounded border-[var(--border-subtle)] accent-[var(--accent-primary)] focus:ring-0"
                    onChange={() => toggleLine(line.id)}
                    type="checkbox"
                  />

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-[var(--text-primary)]">
                        {line.voice.code}
                      </span>
                      {prefix && (
                        <span className="rounded bg-[var(--info-soft)]/70 px-1 py-px text-8px font-bold uppercase tracking-wider text-[var(--info-base)]">
                          {prefix}
                        </span>
                      )}
                    </span>
                    <span className="mt-px block truncate text-10px text-[var(--text-tertiary)]">
                      {line.voice.description}
                    </span>
                  </span>

                  <span className="shrink-0 font-mono text-11px font-semibold tabular-nums text-[var(--text-secondary)]">
                    <Currency value={line.grossAmount} />
                  </span>
                </label>
              );
            })
          )}
        </div>

        {/* Clean footer with single summary + actions */}
        <div className="border-t border-[var(--border-subtle)]/50 bg-[var(--surface-base)] px-6 py-3">
          <div className="mb-2 text-10px font-semibold text-[var(--text-tertiary)]">
            Selezione corrente
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-12px">
            <div className="font-mono text-[var(--text-primary)]">
              {selected.size} voc{selected.size === 1 ? "e" : "i"} ·{" "}
              <span className="font-semibold text-[var(--accent-primary)]">
                <Currency value={selectedGross} />
              </span>{" "}
              imponibile
            </div>

            <div className="font-mono font-semibold text-[var(--success-base)]">
              Genererà <Currency value={prospectiveSurcharge} /> di maggiorazione
            </div>

            <div className="flex items-center gap-2">
              <Button
                className="h-8 px-3 text-11px"
                onClick={handleDeactivateMg}
                size="sm"
                title="Svuota le assegnazioni di questa maggiorazione (la voce MG rimane nel SAL ma senza voci collegate)"
                variant="ghost"
              >
                Disattiva
              </Button>
              <Button
                className="h-8 px-4 text-11px"
                onClick={onClose}
                size="sm"
                variant="secondary"
              >
                Annulla
              </Button>
              <Button
                className="h-8 px-5 text-11px text-white"
                disabled={selected.size === 0}
                onClick={handleSave}
                size="sm"
                variant="primary"
              >
                Conferma {selected.size > 0 ? `(${selected.size})` : ""}
              </Button>
            </div>
          </div>
        </div>
      </Panel>
    </Dialog>
  );
}
