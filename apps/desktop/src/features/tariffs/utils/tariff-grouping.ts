import type { DesktopTariffVoice } from "@/lib/desktopData";

type TariffGroup<T> = {
  children: T[];
  code: string;
  description: string;
};

function getGroupCode(voice: DesktopTariffVoice): string {
  const codeParts = voice.officialCode.split(".");
  return codeParts.length >= 4 ? codeParts.slice(0, 4).join(".") : voice.officialCode || "Altro";
}

function inferGroupDescription(voice: DesktopTariffVoice): string {
  if (voice.category.includes("VOCE")) {
    return voice.category;
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

export function groupEditableTariffVoices(
  voices: DesktopTariffVoice[],
): TariffGroup<{ index: number; voice: DesktopTariffVoice }>[] {
  const groups = new Map<string, TariffGroup<{ index: number; voice: DesktopTariffVoice }>>();

  for (const [index, voice] of voices.entries()) {
    const groupCode = getGroupCode(voice);
    const group = groups.get(groupCode) ?? {
      children: [],
      code: groupCode,
      description: inferGroupDescription(voice),
    };
    group.children.push({ index, voice });
    groups.set(groupCode, group);
  }

  return [...groups.values()];
}
