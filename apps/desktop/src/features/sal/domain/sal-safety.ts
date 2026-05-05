type SafetyVoiceInput = {
  category?: string | null;
  code?: string | null;
  description?: string | null;
};

export function isSafetyVoice(voice: SafetyVoiceInput): boolean {
  const code = normalizeText(voice.code);
  const category = normalizeText(voice.category);
  const description = normalizeText(voice.description);

  if (isOsCode(code) || isOsCode(category)) {
    return true;
  }

  return (
    /\boneri\s+(?:speciali\s+)?(?:per\s+la\s+|della\s+|di\s+)?sicurezza\b/.test(description) ||
    /\bcosti\s+(?:per\s+la\s+|della\s+|di\s+)?sicurezza\b/.test(description)
  );
}

function isOsCode(value: string): boolean {
  return /\bos(?:[.\-_/\s]|\d|$)/.test(value) || value.startsWith("os");
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, " ")
    .trim();
}
