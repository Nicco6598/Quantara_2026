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
  const visibleGroups = showAll || !isExpandable ? groups : groups.slice(0, 3);
  const visibleVoiceCount = visibleGroups.reduce((sum, group) => sum + group.children.length, 0);

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border-subtle)]/80">
      <div className="grid min-w-[860px] grid-cols-[150px_minmax(280px,1fr)_90px_110px_110px] border-b border-[var(--border-subtle)]/80 bg-[var(--bg-muted)]/35 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        <span>Codice</span>
        <span>Descrizione</span>
        <span>U.M.</span>
        <span className="text-right">Manodopera</span>
        <span className="text-right">Prezzo</span>
      </div>
      <div className="overflow-x-auto">
        {visibleGroups.map((group) => (
          <div className="min-w-[860px]" key={group.code}>
            <div className="grid grid-cols-[150px_minmax(280px,1fr)_90px_110px_110px] border-b border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 px-4 py-3 text-[12px] font-bold text-[var(--text-primary)]">
              <span className="break-words">{group.code}</span>
              <span className="leading-5">{group.description}</span>
              <span>-</span>
              <span className="text-right">-</span>
              <span className="text-right">-</span>
            </div>
            {group.children.map((voice) => (
              <div
                className="grid grid-cols-[150px_minmax(280px,1fr)_90px_110px_110px] gap-x-3 border-b border-[var(--border-subtle)]/70 px-4 py-3 text-[12px] last:border-b-0"
                key={voice.id}
              >
                <span className="break-words font-semibold leading-5 text-[var(--text-primary)]">
                  {voice.officialCode}
                </span>
                <span className="min-w-0 whitespace-normal break-words font-medium leading-5 text-[var(--text-secondary)]">
                  {voice.description || "Descrizione mancante"}
                </span>
                <span className="font-medium text-[var(--text-secondary)]">
                  {voice.unitOfMeasure || "-"}
                </span>
                <span className="text-right font-semibold text-[var(--text-primary)]">
                  {formatPercent(voice.laborPercentage)}
                </span>
                <span className="text-right font-semibold text-[var(--text-primary)]">
                  {formatEuro(voice.unitPrice)}
                </span>
              </div>
            ))}
          </div>
        ))}
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
