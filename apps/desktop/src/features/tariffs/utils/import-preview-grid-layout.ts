import type { DesktopTariffVoice } from "@/lib/desktopData";
import type { VoiceGroup } from "./tariff-grouping";
import { isImportCustomVoice } from "./import-preview-voice-split";

export type TariffGridSection = {
  categoria: string;
  groups: Array<{
    gruppo: string;
    gruppoDesc: string;
    voci: VoiceGroup[];
  }>;
  id: string;
};

export type FlatGridItem =
  | { key: string; type: "add" }
  | { categoria: string; id: string; key: string; rowsCount: number; type: "category" }
  | {
      gruppo: string;
      gruppoDesc: string;
      key: string;
      rowsCount: number;
      type: "group";
      voiceGroupCount: number;
      warningCount: number;
    }
  | { key: string; type: "columns" }
  | {
      code: string;
      key: string;
      rowsCount: number;
      type: "voice";
      voce: string;
      voceDesc: string;
    }
  | { index: number; key: string; type: "row"; voice: DesktopTariffVoice }
  | { groupCount: number; key: string; totalVoices: number; type: "footer" };

export type ImportPreviewGridLayout = {
  flatItems: FlatGridItem[];
  sections: TariffGridSection[];
  totalVoices: number;
};

const LARGE_GRID_THRESHOLD = 2_500;

function createCategoryId(categoria: string): string {
  return `category-${categoria.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase() || "altre"}`;
}

export function buildGridSections(groups: readonly VoiceGroup[]): TariffGridSection[] {
  const catMap = new Map<string, Map<string, VoiceGroup[]>>();
  for (const group of groups) {
    const cat = group.categoria || "Altre";
    const grp = group.gruppo || "Altro";
    let grpMap = catMap.get(cat);
    if (!grpMap) {
      grpMap = new Map();
      catMap.set(cat, grpMap);
    }
    let list = grpMap.get(grp);
    if (!list) {
      list = [];
      grpMap.set(grp, list);
    }
    list.push(group);
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
          voci: [...voci].sort((a, b) => Number(a.voce || "0") - Number(b.voce || "0")),
        })),
    }));
}

export function buildFlatGridItems(input: {
  groups: readonly VoiceGroup[];
  includeAddRow: boolean;
  sections: readonly TariffGridSection[];
  totalVoices: number;
}): FlatGridItem[] {
  const skipHeavyMeta = input.totalVoices > LARGE_GRID_THRESHOLD;
  const items: FlatGridItem[] = [];

  if (input.includeAddRow) {
    items.push({ key: "add-row-top", type: "add" });
  }

  const pinnedCustom: Array<{ index: number; voice: DesktopTariffVoice }> = [];
  for (const group of input.groups) {
    for (const child of group.children) {
      if (isImportCustomVoice(child.voice)) {
        pinnedCustom.push(child);
      }
    }
  }
  pinnedCustom.sort((left, right) => left.index - right.index);

  if (pinnedCustom.length > 0) {
    items.push({ key: "columns-custom", type: "columns" });
    for (const { index, voice } of pinnedCustom) {
      items.push({ index, key: `row-${voice.id}`, type: "row", voice });
    }
  }

  for (const section of input.sections) {
    let sectionRowsCount = 0;
    for (const group of section.groups) {
      for (const voiceGroup of group.voci) {
        sectionRowsCount += voiceGroup.children.length;
      }
    }

    items.push({
      categoria: section.categoria,
      id: section.id,
      key: `category-${section.categoria}`,
      rowsCount: sectionRowsCount,
      type: "category",
    });

    for (const group of section.groups) {
      let groupRowsCount = 0;
      let warningCount = 0;
      for (const voiceGroup of group.voci) {
        groupRowsCount += voiceGroup.children.length;
        if (!skipHeavyMeta) {
          for (const child of voiceGroup.children) {
            warningCount += child.voice.warnings?.length ?? 0;
          }
        }
      }

      items.push({
        gruppo: group.gruppo,
        gruppoDesc: group.gruppoDesc,
        key: `group-${section.categoria}-${group.gruppo}`,
        rowsCount: groupRowsCount,
        type: "group",
        voiceGroupCount: group.voci.length,
        warningCount,
      });

      for (const voiceGroup of group.voci) {
        if (voiceGroup.voce || voiceGroup.voceDesc) {
          items.push({
            code: voiceGroup.code,
            key: `voice-${voiceGroup.code}`,
            rowsCount: voiceGroup.children.length,
            type: "voice",
            voce: voiceGroup.voce,
            voceDesc: voiceGroup.voceDesc,
          });
        }

        items.push({ key: `columns-${voiceGroup.code}`, type: "columns" });

        for (const { index, voice } of voiceGroup.children) {
          if (isImportCustomVoice(voice)) continue;
          items.push({ index, key: `row-${voice.id}`, type: "row", voice });
        }
      }
    }
  }

  items.push({
    groupCount: input.groups.length,
    key: "footer",
    totalVoices: input.totalVoices,
    type: "footer",
  });

  return items;
}

export function buildImportPreviewGridLayout(
  groups: readonly VoiceGroup[],
  options?: { includeAddRow?: boolean },
): ImportPreviewGridLayout {
  const totalVoices = groups.reduce((sum, group) => sum + group.children.length, 0);
  const sections = buildGridSections(groups);
  const flatItems = buildFlatGridItems({
    groups,
    includeAddRow: options?.includeAddRow ?? true,
    sections,
    totalVoices,
  });
  return { flatItems, sections, totalVoices };
}

export function patchGridLayoutVoice(
  layout: ImportPreviewGridLayout | null | undefined,
  regularIndex: number,
  field: keyof DesktopTariffVoice,
  value: string | number | null,
): void {
  if (!layout) return;
  for (const item of layout.flatItems) {
    if (item.type !== "row" || item.index !== regularIndex) continue;
    item.voice = { ...item.voice, [field]: value };
    return;
  }
}
