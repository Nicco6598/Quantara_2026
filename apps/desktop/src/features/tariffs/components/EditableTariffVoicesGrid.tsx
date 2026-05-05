import { motion } from "framer-motion";
import { Info, X } from "lucide-react";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { DesktopTariffVoice, TariffWarning } from "@/lib/desktopData";
import type { ImportValidation } from "../tariffs-types";
import type { VoiceGroup } from "../utils/tariff-grouping";
import { formatEditablePercent } from "../utils/tariffs-validation";

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
        className={`h-9 min-w-0 flex-1 rounded-[10px] border bg-[var(--surface-base)] px-2 text-[12px] font-medium text-[var(--text-primary)] outline-none transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)] ${
          align === "right" ? "text-right" : ""
        } border-transparent hover:border-[var(--border-subtle)]`}
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
            <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-[14px] bg-[var(--surface-base)] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.3)] ring-1 ring-[var(--border-subtle)]">
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
                    <div className="text-[11px] font-bold text-[var(--warning-base)]">
                      #{w.id} {w.title}
                    </div>
                    <div className="text-[11px] font-medium leading-[1.5] text-[var(--text-secondary)]">
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
      className="min-h-[38px] w-full resize-none rounded-[10px] border border-transparent bg-[var(--surface-base)] px-2.5 py-2 text-[12px] font-medium leading-[1.45] text-[var(--text-primary)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
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

export const EditableTariffVoicesGrid = memo(function EditableTariffVoicesGrid({
  duplicateCodes,
  groups,
  loadMoreAnchorId,
  onChange,
  onLoadMoreVisibilityChange,
  validation,
}: {
  duplicateCodes: Set<string>;
  groups: VoiceGroup[];
  loadMoreAnchorId?: string;
  onChange: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  onLoadMoreVisibilityChange?: (isVisible: boolean) => void;
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

    return [...catMap.entries()].map(([cat, grpMap]) => ({
      categoria: cat,
      groups: [...grpMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([grp, voci]) => ({
          gruppo: grp,
          gruppoDesc: voci[0]?.gruppoDesc ?? "",
          voci: voci.sort((a, b) => Number(a.voce || "0") - Number(b.voce || "0")),
        })),
    }));
  }, [groups]);

  const [showAll, setShowAll] = useState(false);
  const SECTION_CHUNK = 3;
  const visibleSections = showAll ? sections : sections.slice(0, SECTION_CHUNK);
  const hasMore = sections.length > SECTION_CHUNK;

  useEffect(() => {
    onLoadMoreVisibilityChange?.(hasMore && !showAll);
  }, [hasMore, onLoadMoreVisibilityChange, showAll]);

  return (
    <div className="space-y-6">
      {sections.length === 0 ? (
        <div className="rounded-[20px] bg-[var(--bg-muted)]/50 p-6 text-center text-[13px] font-medium text-[var(--text-secondary)]">
          Nessuna voce da importare.
        </div>
      ) : (
        visibleSections.map((section, si) => (
          <motion.div
            key={section.categoria}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.58, delay: si * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            <div className="flex items-center gap-3">
              <div className="h-7 w-1 rounded-full bg-[var(--accent-primary)]" />
              <h4 className="text-[15px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                Categoria {section.categoria}
              </h4>
            </div>

            {section.groups.map((grp, gi) => {
              const totalSubVoices = grp.voci.reduce((s, v) => s + v.children.length, 0);
              const grpWarnings = grp.voci.flatMap((v) =>
                v.children.flatMap((c) => c.voice.warnings ?? []),
              );
              const hasGrpWarnings = grpWarnings.length > 0;

              return (
                <motion.div
                  className="overflow-hidden rounded-[20px] bg-[color-mix(in_srgb,var(--bg-muted-strong)_60%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_50%,transparent)] [content-visibility:auto] [contain-intrinsic-size:auto_400px]"
                  key={grp.gruppo}
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: gi * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex items-center justify-between bg-[color-mix(in_srgb,var(--surface-base)_88%,var(--bg-muted)_12%)] px-5 py-3.5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_60%,transparent)]">
                    <div className="flex items-center gap-2.5">
                      <span className="rounded-full bg-[var(--info-soft)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--info-base)]">
                        {grp.gruppo}
                      </span>
                      {grp.gruppoDesc ? (
                        <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                          — {grp.gruppoDesc}
                        </span>
                      ) : null}
                      {hasGrpWarnings ? (
                        <span className="flex size-5 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning-base)]">
                          <Info className="size-3" />
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                      {grp.voci.length} voci · {totalSubVoices} sottovoci
                    </span>
                  </div>

                  <div className="divide-y divide-[var(--border-subtle)]/40 bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)]">
                    {grp.voci.map((voiceGroup) => (
                      <div key={voiceGroup.code}>
                        {voiceGroup.voce || voiceGroup.voceDesc ? (
                          <div className="flex items-center gap-2 bg-[var(--bg-muted)]/45 px-5 py-2.5">
                            <span className="rounded-md bg-[var(--accent-primary)]/10 px-2 py-0.5 text-[12px] font-bold text-[var(--accent-primary)]">
                              VOCE {voiceGroup.voce}
                            </span>
                            {voiceGroup.voceDesc ? (
                              <span className="truncate text-[12px] font-medium text-[var(--text-secondary)]">
                                — {voiceGroup.voceDesc}
                              </span>
                            ) : null}
                            <span className="ml-auto shrink-0 text-[11px] font-medium text-[var(--text-secondary)]">
                              {voiceGroup.children.length} righe
                            </span>
                          </div>
                        ) : null}

                        <div>
                          <div className="grid grid-cols-[160px_1fr_80px_100px_110px] gap-3 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                            <span>Codice</span>
                            <span>Descrizione</span>
                            <span>U.M.</span>
                            <span className="text-right">Manod.</span>
                            <span className="text-right">Prezzo</span>
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
                                <div
                                  className={`grid grid-cols-[160px_1fr_80px_100px_110px] gap-3 px-5 py-2 [contain:layout_style] ${
                                    isDuplicate ? "bg-[var(--warning-soft)]/25" : ""
                                  } ${index % 2 === 0 && !isDuplicate ? "bg-[var(--surface-base)]/35" : ""} ${
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
                                    value={
                                      Number.isFinite(voice.unitPrice)
                                        ? String(voice.unitPrice).replace(".", ",")
                                        : ""
                                    }
                                    warnings={undefined}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ))
      )}

      {hasMore && !showAll ? (
        <motion.button
          id={loadMoreAnchorId}
          className="w-full rounded-[16px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-muted)]/30 py-3 text-[12px] font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setShowAll(true)}
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
        >
          Mostra tutte le {sections.length} categorie ({totalVoices.toLocaleString("it-IT")} voci)
        </motion.button>
      ) : null}

      <motion.div
        className="rounded-[16px] border border-[var(--border-subtle)]/50 bg-[var(--bg-muted)]/40 px-5 py-3 text-[12px] font-medium text-[var(--text-secondary)]"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        {totalVoices.toLocaleString("it-IT")} sottovoci in {groups.length.toLocaleString("it-IT")}{" "}
        voci
      </motion.div>
    </div>
  );
});
