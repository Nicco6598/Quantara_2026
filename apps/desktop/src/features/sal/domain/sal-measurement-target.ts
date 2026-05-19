export const MEASUREMENT_TARGET_SEPARATOR = "::row-index::";

export function buildMeasurementTarget(id: string, index: number): string {
  return `${id}${MEASUREMENT_TARGET_SEPARATOR}${index}`;
}

export function parseMeasurementTarget(target: string): { id: string; index: number | null } {
  const [id, indexRaw] = target.split(MEASUREMENT_TARGET_SEPARATOR);
  const index = indexRaw === undefined ? Number.NaN : Number.parseInt(indexRaw, 10);
  return {
    id: id ?? target,
    index: Number.isInteger(index) && index >= 0 ? index : null,
  };
}
