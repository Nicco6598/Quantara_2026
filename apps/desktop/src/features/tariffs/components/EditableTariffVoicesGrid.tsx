import { memo, useMemo } from "react";
import type { DesktopTariffVoice } from "@/lib/desktopData";
import type { ImportValidation } from "../tariffs-types";
import { formatEditablePercent } from "../utils/tariffs-validation";

function ImportCell({
  align = "left",
  field,
  index,
  onChange,
  value,
}: {
  align?: "left" | "right";
  field: keyof DesktopTariffVoice;
  index: number;
  isInvalid?: boolean;
  onChange: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  value: string;
}) {
  return (
    <input
      className={`h-9 min-w-0 rounded-[10px] border bg-[var(--surface-base)] px-2 text-[12px] font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)] ${
        align === "right" ? "text-right" : ""
      } border-transparent hover:border-[var(--border-subtle)]`}
      id={`import-cell-${index}-${field}`}
      onChange={(event) => onChange(index, field, event.target.value)}
      value={value}
    />
  );
}

export const EditableTariffVoicesGrid = memo(function EditableTariffVoicesGrid({
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
    <div className="mt-4 rounded-[20px] bg-[var(--bg-muted)]/50">
      <div className="sticky top-0 z-10 grid grid-cols-[160px_1fr_80px_100px_110px] gap-3 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-muted)_76%,var(--surface-base)_24%)] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
        <span>Codice</span>
        <span>Descrizione</span>
        <span>U.M.</span>
        <span className="text-right">Manod.</span>
        <span className="text-right">Prezzo</span>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]/60">
        {groups.map((group) => (
          <div key={group.code}>
            <div className="bg-[var(--bg-muted)]/30 px-4 py-2">
              <div className="flex items-center gap-2 text-[12px]">
                <span className="font-bold text-[var(--text-primary)]">{group.code}</span>
                <span className="ml-auto text-[11px] font-medium text-[var(--text-secondary)]">
                  {group.children.length} voci
                </span>
              </div>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]/40">
              {group.children.map(({ index, voice }) => {
                const code = voice.officialCode.trim();
                const isDuplicate = duplicateCodes.has(code);
                const rowInvalid =
                  invalidCellKeys.has(`${index}-officialCode`) ||
                  isDuplicate ||
                  invalidCellKeys.has(`${index}-description`) ||
                  invalidCellKeys.has(`${index}-unitOfMeasure`) ||
                  invalidCellKeys.has(`${index}-unitPrice`);

                return (
                  <div
                    className={`grid grid-cols-[160px_1fr_80px_100px_110px] gap-3 px-4 py-2 ${
                      isDuplicate ? "bg-[var(--warning-soft)]/25" : ""
                    } ${index % 2 === 0 && !isDuplicate ? "bg-[var(--surface-base)]/40" : ""} ${
                      rowInvalid && !isDuplicate
                        ? "border-l-2 border-l-[var(--warning-base)]/50"
                        : ""
                    }`}
                    key={voice.id}
                  >
                    <ImportCell
                      field="officialCode"
                      index={index}
                      onChange={onChange}
                      value={voice.officialCode}
                    />
                    <ImportCell
                      field="description"
                      index={index}
                      onChange={onChange}
                      value={voice.description}
                    />
                    <ImportCell
                      field="unitOfMeasure"
                      index={index}
                      onChange={onChange}
                      value={voice.unitOfMeasure}
                    />
                    <ImportCell
                      align="right"
                      field="laborPercentage"
                      index={index}
                      onChange={onChange}
                      value={formatEditablePercent(voice.laborPercentage)}
                    />
                    <ImportCell
                      align="right"
                      field="unitPrice"
                      index={index}
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
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--border-subtle)]/60 px-4 py-3 text-[12px] font-medium text-[var(--text-secondary)]">
        {totalVoices.toLocaleString("it-IT")} sottovoci in {groups.length.toLocaleString("it-IT")}{" "}
        voci — modifica i campi direttamente nelle celle
      </div>
    </div>
  );
});
