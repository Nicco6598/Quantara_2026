export const SAL_STATUS_LABELS: Record<string, string> = {
  approved: "Approvata",
  closed: "Approvata",
  draft: "Bozza",
  "in-review": "Revisione",
};

export const SAL_STATUS_TONE_KEYS: Record<
  string,
  "success" | "info" | "warning" | "neutral" | "danger"
> = {
  approved: "success",
  closed: "success",
  draft: "warning",
  "in-review": "info",
};
