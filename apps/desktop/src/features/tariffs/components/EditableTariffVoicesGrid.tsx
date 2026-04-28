import { useMemo } from "react";
import type { DesktopTariffVoice } from "@/lib/desktopData";
import type { ImportValidation } from "../tariffs-types";
import { formatEditablePercent } from "../utils/tariffs-validation";

function ImportCell({
  align = "left",
  field,
  index,
  isInvalid,
  onChange,
  value,
}: {
  align?: "left" | "right";
  field: keyof DesktopTariffVoice;
  index: number;
  isInvalid: boolean;
  onChange: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  value: string;
}) {
  return (
    <input
      className={`h-9 min-w-0 rounded-md border bg-[var(--surface-base)] px-2 text-[12px] font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)] ${
        align === "right" ? "text-right" : ""
      } ${
        isInvalid
          ? "border-[var(--warning-base)] bg-[var(--warning-soft)]/40"
          : "border-transparent hover:border-[var(--border-subtle)]"
      }`}
      id={`import-cell-${index}-${field}`}
      onChange={(event) => onChange(index, field, event.target.value)}
      value={value}
    />
  );
}

export function EditableTariffVoicesGrid({
  duplicateCodes,
  groups,
  onChange,
  validation,
}: {
  duplicateCodes: Set<string>;
  groups: Array<{
    children: Array<{ index: number; voice: DesktopTariffVoice }>;
    code: string;
    description: string;
  }>;
  onChange: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  validation: ImportValidation;
}) {
  const invalidCellKeys = useMemo(
    () => new Set(validation.invalidRows.map((row) => `${row.index}-${row.field}`)),
    [validation.invalidRows],
  );
  const totalVoices = useMemo(
    () => groups.reduce((sum, group) => sum + group.children.length, 0),
    [groups],
  );

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border-subtle)]/80">
      <div className="grid grid-cols-[minmax(86px,0.9fr)_minmax(140px,1.8fr)_minmax(46px,0.45fr)_minmax(76px,0.65fr)_minmax(76px,0.65fr)] gap-2 border-b border-[var(--border-subtle)]/80 bg-[var(--bg-muted)]/35 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        <span>Codice</span>
        <span>Descrizione</span>
        <span>U.M.</span>
        <span className="text-right">Manod.</span>
        <span className="text-right">Prezzo</span>
      </div>
      <div>
        {groups.map((group) => (
          <div key={group.code}>
            <div className="grid grid-cols-[minmax(86px,0.9fr)_minmax(140px,1.8fr)_minmax(46px,0.45fr)_minmax(76px,0.65fr)_minmax(76px,0.65fr)] gap-2 border-b border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 px-3 py-2 text-[12px] font-bold text-[var(--text-primary)]">
              <span className="break-words leading-5">{group.code}</span>
              <span className="min-w-0 break-words leading-5">{group.description}</span>
              <span>-</span>
              <span className="text-right">-</span>
              <span className="text-right">-</span>
            </div>
            {group.children.map(({ index, voice }) => {
              const code = voice.officialCode.trim();
              const isDuplicate = duplicateCodes.has(code);

              return (
                <div
                  className={`grid grid-cols-[minmax(86px,0.9fr)_minmax(140px,1.8fr)_minmax(46px,0.45fr)_minmax(76px,0.65fr)_minmax(76px,0.65fr)] gap-2 border-b border-[var(--border-subtle)]/65 px-3 py-2 last:border-b-0 ${
                    isDuplicate ? "bg-[var(--warning-soft)]/35" : ""
                  }`}
                  key={voice.id}
                >
                  <ImportCell
                    field="officialCode"
                    index={index}
                    isInvalid={invalidCellKeys.has(`${index}-officialCode`) || isDuplicate}
                    onChange={onChange}
                    value={voice.officialCode}
                  />
                  <ImportCell
                    field="description"
                    index={index}
                    isInvalid={invalidCellKeys.has(`${index}-description`)}
                    onChange={onChange}
                    value={voice.description}
                  />
                  <ImportCell
                    field="unitOfMeasure"
                    index={index}
                    isInvalid={invalidCellKeys.has(`${index}-unitOfMeasure`)}
                    onChange={onChange}
                    value={voice.unitOfMeasure}
                  />
                  <ImportCell
                    align="right"
                    field="laborPercentage"
                    index={index}
                    isInvalid={false}
                    onChange={onChange}
                    value={formatEditablePercent(voice.laborPercentage)}
                  />
                  <ImportCell
                    align="right"
                    field="unitPrice"
                    index={index}
                    isInvalid={invalidCellKeys.has(`${index}-unitPrice`)}
                    onChange={onChange}
                    value={
                      Number.isFinite(voice.unitPrice)
                        ? String(voice.unitPrice).replace(".", ",")
                        : ""
                    }
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="px-3 py-3 text-[12px] font-medium text-[var(--text-secondary)]">
        {totalVoices.toLocaleString("it-IT")} sottovoci modificabili in{" "}
        {groups.length.toLocaleString("it-IT")} voci
      </div>
    </div>
  );
}
