import { AnimatePresence, m } from "framer-motion";
import { ArrowLeft, ChevronRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog } from "@/components/shared/Dialog";
import { MOTION_VARIANTS } from "@/components/shared/easings";
import type { DesktopTariffVoice } from "@/lib/desktopData";

import { formatEuro } from "@/lib/formatters";

import { cn } from "@/lib/utils";

import { formatPercent } from "../utils/tariffs-validation";

type TariffVoiceGroup = {
  children: DesktopTariffVoice[];
  code: string;
  description: string;
};

export function TariffVoicesExplorerModal({
  groups,
  onClose,
  tariffBookName,
  total,
}: {
  groups: TariffVoiceGroup[];
  onClose: () => void;
  tariffBookName: string;
  total: number;
}) {
  const [query, setQuery] = useState("");
  const [focusedGroupCode, setFocusedGroupCode] = useState<string | null>(null);
  const normalizedQuery = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) {
      return groups;
    }

    const result: TariffVoiceGroup[] = [];
    for (const group of groups) {
      const groupMatch = `${group.code} ${group.description}`
        .toLowerCase()
        .includes(normalizedQuery);
      if (groupMatch) {
        result.push(group);
      } else {
        const matchedChildren = group.children.filter((voice) =>
          `${voice.officialCode} ${voice.description} ${voice.unitOfMeasure}`
            .toLowerCase()
            .includes(normalizedQuery),
        );
        if (matchedChildren.length > 0) {
          result.push({ ...group, children: matchedChildren });
        }
      }
    }
    return result;
  }, [groups, normalizedQuery]);

  const visibleVoices = useMemo(
    () => filteredGroups.reduce((sum, group) => sum + group.children.length, 0),
    [filteredGroups],
  );

  const focusedGroup = focusedGroupCode
    ? (filteredGroups.find((g) => g.code === focusedGroupCode) ?? null)
    : null;

  return (
    <Dialog
      className="max-w-6xl"
      contentClassName="flex max-h-[92vh] min-h-0 flex-col overflow-hidden bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] p-0"
      isOpen
      onClose={onClose}
      zIndex={80}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
        <div className="min-w-0">
          <div className="text-10px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
            Voci tariffarie
          </div>
          <h3 className="mt-2 text-21px font-semibold leading-tight text-[var(--text-primary)]">
            Voci tariffarie complete
          </h3>
          <p className="mt-1 text-13px font-medium text-[var(--text-secondary)]">
            {tariffBookName}
          </p>
          <div className="mt-2 text-12px font-semibold text-[var(--text-secondary)]">
            {visibleVoices.toLocaleString("it-IT")} di {total.toLocaleString("it-IT")} sottovoci
          </div>
        </div>
        <m.button
          aria-label="Chiudi"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]"
          onClick={onClose}
          type="button"
        >
          <X className="size-4" />
        </m.button>
      </div>

      <div className="border-b border-[var(--border-subtle)] px-5 py-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] pl-10 pr-3 text-13px font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca voce o sottovoce (codice, descrizione, U.M.)"
            type="search"
            value={query}
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {focusedGroup ? (
            <m.div
              animate={MOTION_VARIANTS.viewSwap.animate}
              className="flex h-full flex-col"
              exit={MOTION_VARIANTS.viewSwap.exit}
              initial={MOTION_VARIANTS.viewSwap.initial}
              key="focus"
              transition={MOTION_VARIANTS.viewSwap.transition}
            >
              <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-muted)]/40 px-5 py-3">
                <m.button
                  className="flex size-8 items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                  onClick={() => setFocusedGroupCode(null)}
                  type="button"
                >
                  <ArrowLeft className="size-4" />
                </m.button>
                <div className="min-w-0">
                  <div className="truncate text-13px font-bold text-[var(--text-primary)]">
                    {focusedGroup.code}
                  </div>
                  <div className="truncate text-11px font-medium text-[var(--text-secondary)]">
                    {focusedGroup.description || "Descrizione voce mancante"} ·{" "}
                    {focusedGroup.children.length.toLocaleString("it-IT")} sottovoci
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="min-w-[600px]">
                  <div className="sticky top-0 z-10 grid grid-cols-[1fr_60px_80px_90px] gap-3 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-muted)_76%,var(--surface-base)_24%)] px-5 py-2.5 text-10px font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                    <span>Voce</span>
                    <span>U.M.</span>
                    <span>Manod.</span>
                    <span className="text-right">Prezzo</span>
                  </div>
                  {focusedGroup.children.map((voice, idx) => (
                    <div
                      className={cn(
                        "grid grid-cols-[1fr_60px_80px_90px] gap-3 border-b border-[var(--border-subtle)]/50 px-5 py-3 text-12px transition-colors last:border-b-0 hover:bg-[var(--bg-muted)]/50",
                        idx % 2 === 1 && "bg-[var(--bg-muted)]/20",
                      )}
                      key={voice.id}
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-[var(--text-primary)]">
                          {voice.officialCode}
                        </span>
                        {voice.description ? (
                          <span className="ml-2 text-[var(--text-secondary)]">
                            · {voice.description}
                          </span>
                        ) : null}
                      </div>
                      <div className="self-center text-[var(--text-secondary)]">
                        {voice.unitOfMeasure || "—"}
                      </div>
                      <div className="self-center font-semibold text-[var(--text-primary)]">
                        {formatPercent(voice.laborPercentage)}
                      </div>
                      <div className="self-center text-right font-semibold text-[var(--text-primary)]">
                        {formatEuro(voice.unitPrice)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </m.div>
          ) : filteredGroups.length === 0 ? (
            <m.div
              animate={MOTION_VARIANTS.viewSwap.animate}
              className="px-5 py-8 text-sm font-medium text-[var(--text-secondary)]"
              exit={MOTION_VARIANTS.viewSwap.exit}
              initial={MOTION_VARIANTS.viewSwap.initial}
              key="empty"
              transition={MOTION_VARIANTS.viewSwap.transition}
            >
              {normalizedQuery
                ? "Nessun risultato per la ricerca corrente."
                : "Nessuna voce disponibile."}
            </m.div>
          ) : (
            <m.div
              animate={MOTION_VARIANTS.viewSwap.animate}
              className="divide-y divide-[var(--border-subtle)]/70"
              exit={MOTION_VARIANTS.viewSwap.exit}
              initial={MOTION_VARIANTS.viewSwap.initial}
              key="list"
              transition={MOTION_VARIANTS.viewSwap.transition}
            >
              {filteredGroups.map((group) => (
                <button
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--bg-muted)]/50"
                  key={group.code}
                  onClick={() => setFocusedGroupCode(group.code)}
                  type="button"
                >
                  <div className="min-w-0">
                    <div className="text-13px font-bold leading-5 text-[var(--text-primary)]">
                      {group.code}
                    </div>
                    <div className="mt-1 text-12px font-medium leading-5 text-[var(--text-secondary)]">
                      {group.description || "Descrizione voce mancante"}
                    </div>
                    <div className="mt-1.5 text-11px font-medium text-[var(--text-secondary)]">
                      {group.children.length.toLocaleString("it-IT")} sottovoci
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-[var(--text-secondary)]" />
                </button>
              ))}
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </Dialog>
  );
}
