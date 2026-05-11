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
    <label
      className={cn(
        "flex items-center gap-1.5 rounded-full bg-[var(--bg-muted)] px-3 py-1.5 text-12px font-medium text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]",
        className,
      )}
    >
      <Search className="size-3.5 shrink-0" />
      <input
        className="w-full min-w-[100px] bg-transparent text-12px text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Cerca..."}
        type="text"
        value={value}
      />
    </label>
  );
}
