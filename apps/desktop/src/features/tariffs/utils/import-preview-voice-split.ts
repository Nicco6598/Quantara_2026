import type { DesktopTariffVoice } from "@/lib/desktopData";

export function isMaggiorazioneVoice(voice: DesktopTariffVoice): boolean {
  return voice.isMaggiorazione === true || voice.officialCode?.includes(".MG.");
}

export function splitRegularAndMaggiorazioni(voices: readonly DesktopTariffVoice[]) {
  const regular: DesktopTariffVoice[] = [];
  const maggiorazioni: DesktopTariffVoice[] = [];
  for (const voice of voices) {
    if (isMaggiorazioneVoice(voice)) maggiorazioni.push(voice);
    else regular.push(voice);
  }
  return { regular, maggiorazioni };
}
