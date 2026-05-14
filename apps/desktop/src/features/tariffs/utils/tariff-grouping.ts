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

function extractVoceFromCode(officialCode: string): string {
  const parts = officialCode.split(".");
  if (parts.length >= 4) return parts[3] ?? "";
  if (parts.length >= 3) return parts[2] ?? "";
  return "";
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

export function groupEditableTariffVoices(voices: DesktopTariffVoice[]): VoiceGroup[] {
  const groups = new Map<string, VoiceGroup>();

  for (const [index, voice] of voices.entries()) {
    const groupCode = getGroupCode(voice);
    const codeVoce = extractVoceFromCode(voice.officialCode);
    const voce = codeVoce || voice.voce || "";
    const group = groups.get(groupCode) ?? {
      children: [],
      code: groupCode,
      description: inferGroupDescription(voice),
      voce,
      voceDesc: voice.voceDesc ?? "",
      categoria: voice.officialCode.split(".")[1] ?? "",
      gruppo: voice.officialCode.split(".")[2] ?? "",
      gruppoDesc: voice.gruppoDesc ?? "",
    };
    group.children.push({ index, voice });
    groups.set(groupCode, group);
  }

  return [...groups.values()];
}
