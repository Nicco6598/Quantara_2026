import type { DesktopTariffVoice } from "@/lib/desktopData";

type TariffGroup<T> = {
  children: T[];
  code: string;
  description: string;
};

type SubVoiceRow = {
  index: number;
  voice: DesktopTariffVoice;
};

export type VoiceGroup = {
  children: SubVoiceRow[];
  code: string;
  description: string;
  voce: string;
  voceDesc: string;
  categoria: string;
  gruppo: string;
  gruppoDesc: string;
};

function getGroupCode(voice: DesktopTariffVoice): string {
  const codeParts = voice.officialCode.split(".");
  return codeParts.length >= 4 ? codeParts.slice(0, 4).join(".") : voice.officialCode || "Altro";
}

function inferGroupDescription(voice: DesktopTariffVoice): string {
  if (voice.category.includes("VOCE")) {
    const voceIndex = voice.category.indexOf("VOCE");
    return voice.category.slice(voceIndex);
  }
  if (voice.category === "armament") {
    return "Armamento ferroviario";
  }
  if (voice.category === "electrical") {
    return "Impianti elettrici";
  }
  if (voice.category === "safety-os") {
    return "Oneri sicurezza";
  }
  return "Opere civili";
}

export function groupTariffVoices(voices: DesktopTariffVoice[]): TariffGroup<DesktopTariffVoice>[] {
  const groups = new Map<string, TariffGroup<DesktopTariffVoice>>();

  for (const voice of voices) {
    const groupCode = getGroupCode(voice);
    const group = groups.get(groupCode) ?? {
      children: [],
      code: groupCode,
      description: inferGroupDescription(voice),
    };
    group.children.push(voice);
    groups.set(groupCode, group);
  }

  return [...groups.values()];
}

export function groupEditableTariffVoices(voices: readonly DesktopTariffVoice[]): VoiceGroup[] {
  const groups = new Map<string, VoiceGroup>();

  for (let index = 0; index < voices.length; index++) {
    const voice = voices[index];
    if (!voice) continue;

    const officialCode = voice.officialCode;
    const parts = officialCode.split(".");
    const groupCode = parts.length >= 4 ? parts.slice(0, 4).join(".") : officialCode || "Altro";
    const voce =
      (parts.length >= 4 ? parts[3] : parts.length >= 3 ? parts[2] : "") || voice.voce || "";

    let group = groups.get(groupCode);
    if (!group) {
      group = {
        children: [],
        code: groupCode,
        description: inferGroupDescription(voice),
        voce,
        voceDesc: voice.voceDesc ?? "",
        categoria: parts[1] ?? "",
        gruppo: parts[2] ?? "",
        gruppoDesc: voice.gruppoDesc ?? "",
      };
      groups.set(groupCode, group);
    }
    group.children.push({ index, voice });
  }

  return [...groups.values()];
}

const DEFAULT_GROUP_SLICE = 8_000;

function yieldGroupingFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** Time-sliced grouping so large tariff imports stay responsive during prewarm. */
export async function groupEditableTariffVoicesAsync(
  voices: readonly DesktopTariffVoice[],
  sliceBudgetMs = 14,
  sliceSize = DEFAULT_GROUP_SLICE,
): Promise<VoiceGroup[]> {
  const groups = new Map<string, VoiceGroup>();
  let sliceStartedAt = performance.now();

  for (let index = 0; index < voices.length; index++) {
    const voice = voices[index];
    if (!voice) continue;

    const officialCode = voice.officialCode;
    const parts = officialCode.split(".");
    const groupCode = parts.length >= 4 ? parts.slice(0, 4).join(".") : officialCode || "Altro";
    const voce =
      (parts.length >= 4 ? parts[3] : parts.length >= 3 ? parts[2] : "") || voice.voce || "";

    let group = groups.get(groupCode);
    if (!group) {
      group = {
        children: [],
        code: groupCode,
        description: inferGroupDescription(voice),
        voce,
        voceDesc: voice.voceDesc ?? "",
        categoria: parts[1] ?? "",
        gruppo: parts[2] ?? "",
        gruppoDesc: voice.gruppoDesc ?? "",
      };
      groups.set(groupCode, group);
    }
    group.children.push({ index, voice });

    if (
      index > 0 &&
      index % sliceSize === 0 &&
      performance.now() - sliceStartedAt >= sliceBudgetMs
    ) {
      await yieldGroupingFrame();
      sliceStartedAt = performance.now();
    }
  }

  return [...groups.values()];
}
