/** Consente digitazione con virgola/punto (es. "18," o "26.150.000,00"). */

export function sanitizeDecimalInput(raw: string, maxDecimals = 2): string {
  const normalized = raw.replace(/[^0-9,.-]/g, "");
  if (!normalized) return "";

  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  const sepIndex = Math.max(lastComma, lastDot);

  if (sepIndex < 0) {
    return normalized.replace(/[.,]/g, "");
  }

  const intPart = normalized.slice(0, sepIndex).replace(/[.,]/g, "");
  const decPart = normalized
    .slice(sepIndex + 1)
    .replace(/[.,]/g, "")
    .slice(0, maxDecimals);
  const sep = normalized[sepIndex];
  const hasTrailingSep = sepIndex === normalized.length - 1;

  if (!intPart && !decPart && hasTrailingSep) return "";
  if (!decPart && hasTrailingSep) return `${intPart}${sep}`;
  return decPart ? `${intPart}${sep}${decPart}` : intPart;
}

export function sanitizeMoneyInput(raw: string): string {
  const normalized = raw.replace(/\s+/g, "").replace(/[٫،]/g, ",").replace(/[．]/g, ".");
  return sanitizeDecimalInput(normalized.replace(/[^\d.,]/g, ""), 2);
}

export function parseLocalizedDecimal(value: string): number {
  const sanitized = sanitizeDecimalInput(value);
  if (!sanitized) return Number.NaN;

  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");
  const sepIndex = Math.max(lastComma, lastDot);

  if (sepIndex < 0) {
    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  const intPart = sanitized.slice(0, sepIndex).replace(/[.,]/g, "") || "0";
  const decPart = sanitized
    .slice(sepIndex + 1)
    .replace(/[.,]/g, "")
    .slice(0, 2);
  const normalized = decPart ? `${intPart}.${decPart}` : intPart;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function parseLocalizedMoney(value: string): number {
  return parseLocalizedDecimal(value);
}
