import type { DesktopTariffVoice } from "@/lib/desktopData";

/** True MG voices are percentage-based surcharges (night/holiday/interruption),
 *  not regular items with .MG. in the code and a fixed euro amount.
 *  Uses category suffix (| PERCENTUALE / | EURO) from the parser, falling back
 *  to laborPercentage > 0.  Ignores the DB-level isMaggiorazione flag which is
 *  stale for ~100+ records and causes economic MG voices to appear in the MG panel. */
export function isMaggiorazioneVoice(voice: DesktopTariffVoice): boolean {
  if (!voice.officialCode?.includes(".MG.")) return false;
  return getMaggiorazioneTipoValore(voice) === "percentual";
}

/** User-added row during import preview (not from PDF parser). */
export function isImportCustomVoice(voice: DesktopTariffVoice): boolean {
  return voice.id.startsWith("voice_custom_") || voice.officialCode.trim().startsWith("CUSTOM-");
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

export type ImportVoiceBreakdown = {
  maggiorazioni: DesktopTariffVoice[];
  maggiorazioneCount: number;
  regular: DesktopTariffVoice[];
  regularCount: number;
  totalCount: number;
};

/** Single breakdown used across import preview (rail, header, MG panel, validation). */
export function getImportVoiceBreakdown(
  voices: readonly DesktopTariffVoice[] | undefined,
): ImportVoiceBreakdown {
  const { regular, maggiorazioni } = splitRegularAndMaggiorazioni(voices ?? []);
  return {
    maggiorazioni,
    maggiorazioneCount: maggiorazioni.length,
    regular,
    regularCount: regular.length,
    totalCount: regular.length + maggiorazioni.length,
  };
}

const TIPO_VALORE_RE = /\|\s*(PERCENTUALE|EURO)\b/i;

/** Parser stores `tipo_valore` in `category` (e.g. "... | PERCENTUALE"). */
export function getMaggiorazioneTipoValore(voice: DesktopTariffVoice): "percentual" | "economic" {
  const match = voice.category.match(TIPO_VALORE_RE);
  const tipo = match?.[1]?.toUpperCase();
  if (tipo === "PERCENTUALE") return "percentual";
  if (tipo === "EURO") return "economic";
  if (voice.isMaggiorazione === true || voice.officialCode?.includes(".MG.")) {
    if ((voice.laborPercentage ?? 0) > 0) return "percentual";
  }
  return "economic";
}

export type MaggiorazioneDisplayCells = {
  maggiorazionePercent: string | null;
  laborPercent: string | null;
  economicValue: string | null;
};

export function formatMaggiorazioneDisplayCells(
  voice: DesktopTariffVoice,
): MaggiorazioneDisplayCells {
  const emDash = "\u2014";
  const kind = getMaggiorazioneTipoValore(voice);
  const formatPct = (value: number) =>
    `${value.toLocaleString("it-IT", { maximumFractionDigits: 2 })}%`;

  if (kind === "percentual") {
    const maggiorazionePercent =
      Number.isFinite(voice.unitPrice) && voice.unitPrice !== 0 ? formatPct(voice.unitPrice) : null;
    const laborPercent =
      voice.laborPercentage != null && Number.isFinite(voice.laborPercentage)
        ? formatPct(voice.laborPercentage)
        : null;
    return {
      maggiorazionePercent: maggiorazionePercent ?? emDash,
      laborPercent: laborPercent ?? emDash,
      economicValue: emDash,
    };
  }

  const laborPercent =
    voice.laborPercentage != null && Number.isFinite(voice.laborPercentage)
      ? formatPct(voice.laborPercentage)
      : null;
  const economicValue = Number.isFinite(voice.unitPrice)
    ? `${voice.unitPrice.toLocaleString("it-IT", { minimumFractionDigits: 2 })} \u20AC`
    : null;

  return {
    maggiorazionePercent: emDash,
    laborPercent: laborPercent ?? emDash,
    economicValue: economicValue ?? emDash,
  };
}
