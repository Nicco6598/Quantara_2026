import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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
        className="flex items-center gap-1.5 rounded-full bg-[var(--bg-muted)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)]"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="whitespace-nowrap">{label}:</span>
        <span className="max-w-[140px] truncate text-[12px] font-semibold text-[var(--text-primary)]">
          {displayValue}
        </span>
        <ChevronDown
          className={cn("size-3 shrink-0 opacity-60 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-max min-w-full overflow-hidden rounded-[14px] bg-[var(--surface-base)] p-1 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.15)] ring-1 ring-[var(--border-subtle)]">
          {options.map((opt) => {
            const displayOpt = displayMap?.get(opt) ?? opt;
            const isSelected = opt === value;
            return (
              <button
                className={cn(
                  "flex w-full items-center rounded-[10px] px-3 py-2 text-left text-[12px] font-medium transition-colors",
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
