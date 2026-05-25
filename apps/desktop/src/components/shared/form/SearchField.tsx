import { Search, X } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onClear?: () => void;
};

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ value, onChange, placeholder, disabled, className, onClear }, ref) => {
    function handleClear() {
      onChange("");
      onClear?.();
    }

    return (
      <div className={cn("relative", className)}>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Cerca..."}
          disabled={disabled}
          className={cn(
            "h-10 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-base)] pl-10 pr-10 text-13px font-medium text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 outline-none transition-[border-color,background-color,box-shadow] duration-[var(--duration-fast)] hover:bg-[color-mix(in_srgb,var(--surface-base)_86%,var(--bg-muted)_14%)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)] disabled:cursor-not-allowed disabled:opacity-50",
          )}
          aria-label={placeholder ?? "Search"}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]"
            aria-label="Cancella ricerca"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    );
  },
);

SearchField.displayName = "SearchField";
