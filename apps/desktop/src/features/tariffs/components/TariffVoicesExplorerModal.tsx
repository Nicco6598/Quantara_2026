import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { DesktopTariffVoice } from "@/lib/desktopData";
import { formatEuro } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { formatPercent } from "../utils/tariffs-validation";

const SPRING_EASE = [0.22, 1, 0.36, 1] as const;

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

    return groups
      .map((group) => {
        const groupMatch = `${group.code} ${group.description}`
          .toLowerCase()
          .includes(normalizedQuery);
        if (groupMatch) {
          return group;
        }

        const matchedChildren = group.children.filter((voice) =>
          `${voice.officialCode} ${voice.description} ${voice.unitOfMeasure}`
            .toLowerCase()
            .includes(normalizedQuery),
        );

        return matchedChildren.length > 0 ? { ...group, children: matchedChildren } : null;
      })
      .filter((group): group is TariffVoiceGroup => group != null);
  }, [groups, normalizedQuery]);

  const visibleVoices = useMemo(
    () => filteredGroups.reduce((sum, group) => sum + group.children.length, 0),
    [filteredGroups],
  );

  const focusedGroup = focusedGroupCode
    ? (filteredGroups.find((g) => g.code === focusedGroupCode) ?? null)
    : null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4 backdrop-blur-md">
      <button
        aria-label="Chiudi vista voci"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <motion.div
        className="relative flex min-h-0 max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.5, ease: SPRING_EASE }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <div className="flex min-h-0 flex-col rounded-[22px] bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                Voci tariffarie
              </div>
              <h3 className="mt-2 text-[21px] font-bold leading-tight text-[var(--text-primary)]">
                Voci tariffarie complete
              </h3>
              <p className="mt-1 text-[13px] font-medium text-[var(--text-secondary)]">
                {tariffBookName}
              </p>
              <div className="mt-2 text-[12px] font-semibold text-[var(--text-secondary)]">
                {visibleVoices.toLocaleString("it-IT")} di {total.toLocaleString("it-IT")} sottovoci
              </div>
            </div>
            <motion.button
              aria-label="Chiudi"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]"
              onClick={onClose}
              type="button"
              whileHover={{ scale: 1.08, y: -1 }}
              whileTap={{ scale: 0.92 }}
            >
              <X className="size-4" />
            </motion.button>
          </div>

          <div className="border-b border-[var(--border-subtle)] px-5 py-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] pl-10 pr-3 text-[13px] font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
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
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className="flex h-full flex-col"
                  exit={{ opacity: 0, x: 40 }}
                  initial={{ opacity: 0, x: 40 }}
                  key="focus"
                  transition={{ duration: 0.32, ease: SPRING_EASE }}
                >
                  <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-muted)]/40 px-5 py-3">
                    <motion.button
                      className="flex size-8 items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                      onClick={() => setFocusedGroupCode(null)}
                      type="button"
                      whileHover={{
                        scale: 1.1,
                        y: -1,
                        backgroundColor:
                          "color-mix(in srgb, var(--accent-primary) 20%, transparent)",
                      }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <ArrowLeft className="size-4" />
                    </motion.button>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-bold text-[var(--text-primary)]">
                        {focusedGroup.code}
                      </div>
                      <div className="truncate text-[11px] font-medium text-[var(--text-secondary)]">
                        {focusedGroup.description || "Descrizione voce mancante"} ·{" "}
                        {focusedGroup.children.length.toLocaleString("it-IT")} sottovoci
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <div className="min-w-[600px]">
                      <div className="sticky top-0 z-10 grid grid-cols-[1fr_60px_80px_90px] gap-3 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-muted)_76%,var(--surface-base)_24%)] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                        <span>Voce</span>
                        <span>U.M.</span>
                        <span>Manod.</span>
                        <span className="text-right">Prezzo</span>
                      </div>
                      {focusedGroup.children.map((voice, idx) => (
                        <div
                          className={cn(
                            "grid grid-cols-[1fr_60px_80px_90px] gap-3 border-b border-[var(--border-subtle)]/50 px-5 py-3 text-[12px] transition-colors last:border-b-0 hover:bg-[var(--bg-muted)]/50",
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
                </motion.div>
              ) : filteredGroups.length === 0 ? (
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className="px-5 py-8 text-sm font-medium text-[var(--text-secondary)]"
                  exit={{ opacity: 0, x: -40 }}
                  initial={{ opacity: 0, x: -40 }}
                  key="empty"
                  transition={{ duration: 0.32, ease: SPRING_EASE }}
                >
                  {normalizedQuery
                    ? "Nessun risultato per la ricerca corrente."
                    : "Nessuna voce disponibile."}
                </motion.div>
              ) : (
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className="divide-y divide-[var(--border-subtle)]/70"
                  exit={{ opacity: 0, x: -40 }}
                  initial={{ opacity: 0, x: -40 }}
                  key="list"
                  transition={{ duration: 0.32, ease: SPRING_EASE }}
                >
                  {filteredGroups.map((group) => (
                    <button
                      className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--bg-muted)]/50"
                      key={group.code}
                      onClick={() => setFocusedGroupCode(group.code)}
                      type="button"
                    >
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold leading-5 text-[var(--text-primary)]">
                          {group.code}
                        </div>
                        <div className="mt-1 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
                          {group.description || "Descrizione voce mancante"}
                        </div>
                        <div className="mt-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
                          {group.children.length.toLocaleString("it-IT")} sottovoci
                        </div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-[var(--text-secondary)]" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
