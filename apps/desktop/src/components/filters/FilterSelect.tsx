import { ChevronDown } from "lucide-react";

export function FilterSelect({
  label,
  value,
  options,
  onChange,
  displayMap,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  displayMap?: Map<string, string>;
}) {
  return (
    <label className="flex items-center gap-1.5 rounded-full bg-[var(--bg-muted)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
      <span className="whitespace-nowrap">{label}:</span>
      <select
        className="max-w-[160px] bg-transparent text-[12px] font-semibold text-[var(--text-primary)] outline-none"
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {displayMap?.get(opt) ?? opt}
          </option>
        ))}
      </select>
      <ChevronDown className="size-3 shrink-0 opacity-60" />
    </label>
  );
}
