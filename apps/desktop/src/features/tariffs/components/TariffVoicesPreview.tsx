import { useState } from "react";
import type { DesktopTariffVoice } from "@/lib/desktopData";
import { formatEuro } from "@/lib/formatters";
import { formatPercent } from "../utils/tariffs-validation";

export function TariffVoicesPreview({
  groups,
  isExpandable = false,
  total,
}: {
  groups: Array<{ children: DesktopTariffVoice[]; code: string; description: string }>;
  isExpandable?: boolean;
  total: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const visibleGroups = showAll || !isExpandable ? groups : groups.slice(0, 3);
  const visibleVoiceCount = visibleGroups.reduce((sum, group) => sum + group.children.length, 0);
  const toggleGroup = (code: string) => {
    setOpenGroups((current) => ({ ...current, [code]: !current[code] }));
  };

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border-subtle)]/80">
      <div className="border-b border-[var(--border-subtle)]/80 bg-[var(--bg-muted)]/35 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        Voci e sottovoci
      </div>
      <div>
        {visibleGroups.map((group) => {
          const isOpen = openGroups[group.code] ?? false;

          return (
            <div
              className="border-b border-[var(--border-subtle)]/70 last:border-b-0"
              key={group.code}
            >
              <button
                className="flex w-full items-start justify-between gap-3 bg-[var(--bg-muted)]/55 px-4 py-3 text-left transition hover:bg-[var(--bg-muted)]/80"
                onClick={() => toggleGroup(group.code)}
                type="button"
              >
                <div className="min-w-0">
                  <div className="text-[12px] font-bold leading-5 text-[var(--text-primary)]">
                    {group.code}
                  </div>
                  <div className="mt-1 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
                    {group.description || "Descrizione voce mancante"}
                  </div>
                  <div className="mt-2 text-[11px] font-medium text-[var(--text-secondary)]">
                    {group.children.length.toLocaleString("it-IT")} sottovoci
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-bold text-[var(--info-base)]">
                  {isOpen ? "Chiudi" : "Apri"}
                </span>
              </button>
              {isOpen ? (
                <div className="space-y-2 px-3 py-3">
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
        })}
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-3 text-[12px] font-medium text-[var(--text-secondary)]">
        <span>
          Mostra {visibleVoiceCount.toLocaleString("it-IT")} di {total.toLocaleString("it-IT")} voci
        </span>
        {isExpandable && groups.length > 3 ? (
          <button
            className="font-bold text-[var(--info-base)]"
            onClick={() => setShowAll((value) => !value)}
            type="button"
          >
            {showAll ? "Riduci" : "Vedi tutte le voci"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
