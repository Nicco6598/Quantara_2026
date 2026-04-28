export function ImportMetric({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "neutral" | "success" | "warning";
  value: string;
}) {
  const color =
    tone === "success"
      ? "text-[var(--success-base)]"
      : tone === "warning"
        ? "text-[var(--warning-base)]"
        : "text-[var(--text-primary)]";

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div className={`mt-2 text-[22px] font-bold ${color}`}>{value}</div>
    </div>
  );
}
