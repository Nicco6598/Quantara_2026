export function generateSalTitle(title: string, currentCount: number): string {
  const trimmed = title.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  return `SAL ${currentCount + 1}`;
}
