import { Info, Trash2, X } from "lucide-react";
import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { DesktopTariffVoice, TariffWarning } from "@/lib/desktopData";
import type { ImportValidation } from "../tariffs-types";
import type { VoiceGroup } from "../utils/tariff-grouping";
import { formatEditablePercent } from "../utils/tariffs-validation";

const CELL_BASE =
  "h-8 min-w-0 flex-1 rounded-md border bg-transparent px-2 text-12px font-semibold text-[var(--text-primary)] outline-none transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus:bg-[var(--surface-base)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]";
const CELL_EDIT = "border-transparent hover:border-[var(--border-subtle)]";
const GRID_COLS = "grid grid-cols-[160px_minmax(360px,1fr)_80px_100px_110px_36px] gap-3 px-5 py-2";

export type TariffGridSectionSummary = {
  id: string;
  categoria: string;
  groupsCount: number;
  rowsCount: number;
  warningCount: number;
};

function ImportCell({
  align = "left",
  field,
  index,
  onChange,
  value,
  warnings,
}: {
  align?: "left" | "right";
  field: keyof DesktopTariffVoice;
  index: number;
  onChange: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  value: string;
  warnings: TariffWarning[] | undefined;
}) {
  const [showWarnings, setShowWarnings] = useState(false);

  return (
    <div className="relative flex items-center gap-1">
      <input
        className={`${CELL_BASE} ${CELL_EDIT} ${align === "right" ? "text-right" : ""}`}
        id={`import-cell-${index}-${field}`}
        onChange={(event) => onChange(index, field, event.target.value)}
        value={value}
      />
      {warnings && warnings.length > 0 ? (
        <>
          <button
            className="flex size-5 shrink-0 items-center justify-center rounded-full text-[var(--warning-base)] transition-colors hover:bg-[var(--warning-soft)]"
            onClick={() => setShowWarnings(!showWarnings)}
            type="button"
          >
            <Info className="size-3.5" />
          </button>
          {showWarnings ? (
            <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-14px bg-[var(--surface-base)] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.3)] ring-1 ring-[var(--border-subtle)]">
              <button
                className="absolute right-2 top-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                onClick={() => setShowWarnings(false)}
                type="button"
              >
                <X className="size-3" />
              </button>
              <div className="max-h-48 space-y-3 overflow-y-auto pr-2">
                {warnings.map((w) => (
                  <div key={w.id} className="space-y-1">
                    <div className="text-11px font-bold text-[var(--warning-base)]">
                      #{w.id} {w.title}
                    </div>
                    <div className="text-11px font-medium leading-normal text-[var(--text-secondary)]">
                      {w.body}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function DescriptionCell({
  field,
  index,
  onChange,
  value,
}: {
  field: keyof DesktopTariffVoice;
  index: number;
  onChange: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  value: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fitContent = useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    const nextHeight = Math.min(Math.max(element.scrollHeight, 38), 132);
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > 132 ? "auto" : "hidden";
  }, []);

  useLayoutEffect(() => {
    fitContent();
  }, [fitContent]);

  return (
    <textarea
      className="min-h-[34px] w-full resize-none rounded-md border border-transparent bg-transparent px-2.5 py-2 text-12px font-semibold leading-1_45 text-[var(--text-primary)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[var(--border-subtle)] focus:bg-[var(--surface-base)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
      id={`import-cell-${index}-${field}`}
      onChange={(event) => {
        fitContent();
        onChange(index, field, event.target.value);
      }}
      ref={textareaRef}
      rows={1}
      value={value}
    />
  );
}

type VoiceRowProps = {
  index: number;
  isDuplicate: boolean;
  isInvalid: boolean;
  voice: DesktopTariffVoice;
  onChange: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  onDelete: (index: number) => void;
};

const VoiceRow = memo(function VoiceRow({
  index,
  isDuplicate,
  isInvalid,
  voice,
  onChange,
  onDelete,
}: VoiceRowProps) {
  return (
    <div
      className={`${GRID_COLS} min-w-[900px] items-center [contain:layout_style] [content-visibility:auto] [contain-intrinsic-size:auto_44px] ${
        isDuplicate ? "bg-[var(--warning-soft)]/25" : ""
      } ${index % 2 === 0 && !isDuplicate ? "bg-[var(--surface-base)]/55" : ""} ${
        isInvalid && !isDuplicate ? "border-l-2 border-l-[var(--warning-base)]/50" : ""
      }`}
    >
      <ImportCell
        field="officialCode"
        index={index}
        onChange={onChange}
        value={voice.officialCode}
        warnings={voice.warnings}
      />
      <DescriptionCell
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
        warnings={undefined}
      />
      <ImportCell
        align="right"
        field="laborPercentage"
        index={index}
        onChange={onChange}
        value={formatEditablePercent(voice.laborPercentage)}
        warnings={undefined}
      />
      <ImportCell
        align="right"
        field="unitPrice"
        index={index}
        onChange={onChange}
        value={Number.isFinite(voice.unitPrice) ? String(voice.unitPrice).replace(".", ",") : ""}
        warnings={undefined}
      />
      <button
        aria-label={`Elimina voce ${voice.officialCode || index + 1}`}
        className="flex size-9 items-center justify-center rounded-10px text-[var(--danger-base,var(--warning-base))] transition-colors hover:bg-[var(--warning-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
        onClick={() => onDelete(index)}
        title="Elimina voce"
        type="button"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}, areVoiceRowsEqual);

function areVoiceRowsEqual(previous: Readonly<VoiceRowProps>, next: Readonly<VoiceRowProps>) {
  return (
    previous.index === next.index &&
    previous.isDuplicate === next.isDuplicate &&
    previous.isInvalid === next.isInvalid &&
    previous.voice === next.voice &&
    previous.onChange === next.onChange &&
    previous.onDelete === next.onDelete
  );
}

export const EditableTariffVoicesGrid = memo(function EditableTariffVoicesGrid({
  duplicateCodes,
  groups,
  onChange,
  onDelete,
  onSectionsChange,
  validation,
}: {
  duplicateCodes: Set<string>;
  groups: VoiceGroup[];
  onChange: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  onDelete: (index: number) => void;
  onSectionsChange?: (sections: TariffGridSectionSummary[]) => void;
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

  const sections = useMemo(() => {
    const catMap = new Map<string, Map<string, VoiceGroup[]>>();
    for (const group of groups) {
      const cat = group.categoria || "Altre";
      const grp = group.gruppo || "Altro";
      if (!catMap.has(cat)) catMap.set(cat, new Map());
      const grpMap = catMap.get(cat);
      if (!grpMap) continue;
      if (!grpMap.has(grp)) grpMap.set(grp, []);
      grpMap.get(grp)?.push(group);
    }
    return [...catMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "it", { numeric: true }))
      .map(([cat, grpMap]) => ({
        id: createCategoryId(cat),
        categoria: cat,
        groups: [...grpMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b, "it", { numeric: true }))
          .map(([grp, voci]) => ({
            gruppo: grp,
            gruppoDesc: voci[0]?.gruppoDesc ?? "",
            voci: voci.sort((a, b) => Number(a.voce || "0") - Number(b.voce || "0")),
          })),
      }));
  }, [groups]);

  const sectionSummaries = useMemo<TariffGridSectionSummary[]>(
    () =>
      sections.map((section) => {
        const rowsCount = section.groups.reduce(
          (sum, group) =>
            sum + group.voci.reduce((voiceSum, voice) => voiceSum + voice.children.length, 0),
          0,
        );
        const warningCount = section.groups.reduce(
          (sum, group) =>
            sum +
            group.voci.reduce(
              (voiceSum, voice) =>
                voiceSum +
                voice.children.reduce(
                  (rowSum, child) => rowSum + (child.voice.warnings?.length ?? 0),
                  0,
                ),
              0,
            ),
          0,
        );
        return {
          id: section.id,
          categoria: section.categoria,
          groupsCount: section.groups.length,
          rowsCount,
          warningCount,
        };
      }),
    [sections],
  );

  useLayoutEffect(() => {
    onSectionsChange?.(sectionSummaries);
  }, [onSectionsChange, sectionSummaries]);

  return (
    <div className="space-y-6">
      {sections.length === 0 ? (
        <div className="rounded-2xl bg-[var(--bg-muted)]/50 p-6 text-center text-13px font-medium text-[var(--text-secondary)]">
          Nessuna voce da importare.
        </div>
      ) : (
        sections.map((section) => (
          <div
            className="scroll-mt-24 space-y-4"
            data-category={section.categoria}
            id={section.id}
            key={section.categoria}
          >
            <div className="flex items-center gap-3 pt-1">
              <h4 className="text-18px font-bold tracking-neg-0_03em text-[var(--text-primary)]">
                Categorie {section.categoria || "Altre"}
              </h4>
              <span className="rounded-full bg-[var(--bg-muted-strong)] px-3 py-1 text-12px font-bold text-[var(--text-secondary)]">
                {section.groups.reduce(
                  (s, g) => s + g.voci.reduce((ss, v) => ss + v.children.length, 0),
                  0,
                )}
              </span>
            </div>

            {section.groups.map((grp) => {
              const totalSubVoices = grp.voci.reduce((s, v) => s + v.children.length, 0);
              const grpWarnings = grp.voci.flatMap((v) =>
                v.children.flatMap((c) => c.voice.warnings ?? []),
              );
              const hasGrpWarnings = grpWarnings.length > 0;

              return (
                <div
                  className="overflow-hidden rounded-18px bg-[var(--surface-base)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_60%,transparent)] shadow-[0_16px_36px_color-mix(in_srgb,var(--shadow-color,rgba(15,23,42,0.10))_18%,transparent)] [content-visibility:auto] [contain-intrinsic-size:auto_420px]"
                  key={grp.gruppo}
                >
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)]/55 bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="rounded-md bg-[var(--info-soft)] px-2 py-1 text-12px font-bold text-[var(--info-base)]">
                        {grp.gruppo}
                      </span>
                      {grp.gruppoDesc ? (
                        <span className="text-13px font-bold text-[var(--text-secondary)]">
                          {grp.gruppoDesc}
                        </span>
                      ) : null}
                      {hasGrpWarnings ? (
                        <span className="flex size-5 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning-base)]">
                          <Info className="size-3" />
                        </span>
                      ) : null}
                    </div>
                    <span className="text-11px font-semibold text-[var(--text-secondary)]">
                      {grp.voci.length} voci · {totalSubVoices} sottovoci
                    </span>
                  </div>

                  <div className="divide-y divide-[var(--border-subtle)]/45 bg-[color-mix(in_srgb,var(--surface-base)_94%,var(--bg-muted)_6%)]">
                    {grp.voci.map((voiceGroup) => (
                      <div key={voiceGroup.code}>
                        {voiceGroup.voce || voiceGroup.voceDesc ? (
                          <div className="flex items-center gap-3 bg-[var(--bg-muted)]/45 px-5 py-3">
                            <span className="rounded-md bg-[var(--warning-soft)] px-2.5 py-1 text-11px font-bold text-[var(--accent-primary)]">
                              VOCE {voiceGroup.voce}
                            </span>
                            {voiceGroup.voceDesc ? (
                              <span className="min-w-0 flex-1 text-12px font-semibold leading-normal text-[var(--text-secondary)]">
                                {voiceGroup.voceDesc}
                              </span>
                            ) : null}
                            <span className="ml-auto shrink-0 text-11px font-medium text-[var(--text-secondary)]">
                              {voiceGroup.children.length} righe
                            </span>
                          </div>
                        ) : null}

                        <div>
                          <div
                            className={`${GRID_COLS} min-w-[900px] border-b border-[var(--border-subtle)]/35 text-10px font-bold uppercase tracking-0_08em text-[var(--text-secondary)]`}
                          >
                            <span>Codice</span>
                            <span>Descrizione</span>
                            <span>U.M.</span>
                            <span className="text-right">Manod.</span>
                            <span className="text-right">Prezzo</span>
                            <span className="sr-only">Azioni</span>
                          </div>

                          <div className="divide-y divide-[var(--border-subtle)]/20">
                            {voiceGroup.children.map(({ index, voice }) => {
                              const code = voice.officialCode.trim();
                              const isDuplicate = duplicateCodes.has(code);
                              const rowInvalid =
                                invalidCellKeys.has(`${index}-officialCode`) ||
                                isDuplicate ||
                                invalidCellKeys.has(`${index}-description`) ||
                                invalidCellKeys.has(`${index}-unitOfMeasure`) ||
                                invalidCellKeys.has(`${index}-unitPrice`);

                              return (
                                <VoiceRow
                                  index={index}
                                  isDuplicate={isDuplicate}
                                  isInvalid={rowInvalid}
                                  key={voice.id}
                                  onChange={onChange}
                                  onDelete={onDelete}
                                  voice={voice}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}

      <div className="rounded-xl border border-[var(--border-subtle)]/50 bg-[var(--bg-muted)]/40 px-5 py-3 text-12px font-medium text-[var(--text-secondary)]">
        {totalVoices.toLocaleString("it-IT")} sottovoci in {groups.length.toLocaleString("it-IT")}{" "}
        voci
      </div>
    </div>
  );
});

export function createCategoryId(categoria: string): string {
  const safeCategoria = categoria.replace(/[^a-zA-Z0-9_-]+/g, "-") || "altre";
  return `tariff-cat-${safeCategoria}`;
}
