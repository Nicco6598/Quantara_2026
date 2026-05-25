import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilterSearch({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn("relative block min-w-[220px]", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
      <input
        className="h-10 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-base)] pl-10 pr-3 text-13px font-medium text-[var(--text-primary)] outline-none transition-[border-color,background-color,box-shadow] duration-[var(--duration-fast)] placeholder:text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--surface-base)_86%,var(--bg-muted)_14%)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Cerca..."}
        type="text"
        value={value}
      />
    </label>
  );
}
