import { ChevronDown, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/shared/Button";
import type { DesktopTariffVoice } from "@/lib/desktopData";
import { formatEuro } from "@/lib/formatters";
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
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

  function toggleGroup(code: string) {
    setOpenGroups((current) => ({ ...current, [code]: !current[code] }));
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] shadow-xl">
        <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h3 className="text-[21px] font-bold leading-tight text-[var(--text-primary)]">
              Voci tariffarie complete
            </h3>
            <p className="mt-1 text-[13px] font-medium text-[var(--text-secondary)]">
              {tariffBookName}
            </p>
            <div className="mt-3 text-[12px] font-semibold text-[var(--text-secondary)]">
              {visibleVoices.toLocaleString("it-IT")} di {total.toLocaleString("it-IT")} sottovoci
            </div>
          </div>
          <Button
            aria-label="Chiudi vista voci"
            onClick={onClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] pl-10 pr-3 text-[13px] font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca voce o sottovoce (codice, descrizione, U.M.)"
              type="search"
              value={query}
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredGroups.length === 0 ? (
            <div className="px-5 py-8 text-sm font-medium text-[var(--text-secondary)]">
              Nessun risultato per la ricerca corrente.
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isOpen = normalizedQuery.length > 0 ? true : (openGroups[group.code] ?? false);

              return (
                <div
                  className="border-b border-[var(--border-subtle)]/70 last:border-b-0"
                  key={group.code}
                >
                  <button
                    className="flex w-full items-start justify-between gap-3 bg-[var(--bg-muted)]/55 px-5 py-3 text-left transition hover:bg-[var(--bg-muted)]/80"
                    onClick={() => toggleGroup(group.code)}
                    type="button"
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold leading-5 text-[var(--text-primary)]">
                        {group.code}
                      </div>
                      <div className="mt-1 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
                        {group.description || "Descrizione voce mancante"}
                      </div>
                      <div className="mt-2 text-[11px] font-medium text-[var(--text-secondary)]">
                        {group.children.length.toLocaleString("it-IT")} sottovoci
                      </div>
                    </div>
                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--info-base)]">
                      <ChevronDown
                        className={`size-4 transition ${isOpen ? "rotate-180" : "rotate-0"}`}
                      />
                      {isOpen ? "Chiudi" : "Apri"}
                    </span>
                  </button>

                  {isOpen ? (
                    <div className="space-y-2 px-4 py-3">
                      {group.children.map((voice) => (
                        <div
                          className="rounded-lg border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] px-3 py-3"
                          key={voice.id}
                        >
                          <div className="text-[12px] font-bold leading-5 text-[var(--text-primary)]">
                            {voice.officialCode}
                          </div>
                          <div className="mt-1 whitespace-normal break-words text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
                            {voice.description || "Descrizione sottovoce mancante"}
                          </div>
                          <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-3">
                            <div>
                              <div className="font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                                U.M.
                              </div>
                              <div className="mt-1 font-semibold text-[var(--text-primary)]">
                                {voice.unitOfMeasure || "-"}
                              </div>
                            </div>
                            <div>
                              <div className="font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                                Manodopera
                              </div>
                              <div className="mt-1 font-semibold text-[var(--text-primary)]">
                                {formatPercent(voice.laborPercentage)}
                              </div>
                            </div>
                            <div>
                              <div className="font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                                Prezzo
                              </div>
                              <div className="mt-1 font-semibold text-[var(--text-primary)]">
                                {formatEuro(voice.unitPrice)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
