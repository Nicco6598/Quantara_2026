export function FilterDateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 rounded-full bg-[var(--bg-muted-strong)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
      <span className="whitespace-nowrap">{label}</span>
      <input
        className="w-28 bg-transparent text-[12px] text-[var(--text-primary)] outline-none"
        onChange={(e) => onChange(e.target.value)}
        type="date"
        value={value}
      />
    </label>
  );
}
