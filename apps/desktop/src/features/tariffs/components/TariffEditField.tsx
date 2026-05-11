export function TariffEditField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block text-11px font-bold uppercase tracking-caption text-[var(--text-secondary)]">
      {label}
      <input
        className="mt-1 h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3 text-13px font-medium normal-case tracking-normal text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}
