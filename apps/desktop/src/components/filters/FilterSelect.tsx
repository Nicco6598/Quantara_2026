import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function FilterSelect({
  label: _label,
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
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const displayValue = displayMap?.get(value) ?? value;

  return (
    <div className="relative" ref={ref}>
      <button
        className="inline-flex h-10 min-w-[160px] items-center justify-between rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3.5 text-13px font-medium text-[var(--text-primary)] outline-none transition-[border-color,background-color,box-shadow] duration-[var(--duration-fast)] hover:bg-[color-mix(in_srgb,var(--surface-base)_86%,var(--bg-muted)_14%)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="max-w-[160px] truncate">{displayValue}</span>
        <ChevronDown
          className={cn(
            "ml-1.5 size-4 shrink-0 text-[var(--text-secondary)] transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-[var(--z-dropdown-menu)] mt-1 w-max min-w-full overflow-hidden rounded-[12px] bg-[var(--surface-base)] p-1 shadow-soft ring-1 ring-[var(--border-subtle)]">
          {options.map((opt) => {
            const displayOpt = displayMap?.get(opt) ?? opt;
            const isSelected = opt === value;
            return (
              <button
                className={cn(
                  "flex w-full items-center rounded-10px px-3 py-2 text-left text-12px font-medium transition-colors",
                  isSelected
                    ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                    : "text-[var(--text-primary)] hover:bg-[var(--bg-muted)]",
                )}
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                type="button"
              >
                {displayOpt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
