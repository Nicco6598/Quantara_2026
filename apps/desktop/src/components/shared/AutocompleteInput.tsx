import { motion } from "framer-motion";
import { Search, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type AutocompleteOption = {
  label: string;
  value: string;
  keywords?: string;
  metadata?: string;
};

type AutocompleteInputProps = {
  options: AutocompleteOption[];
  onSelect: (option: AutocompleteOption) => void;
  placeholder?: string;
  maxResults?: number;
};

export function AutocompleteInput({
  options,
  onSelect,
  placeholder = "Cerca per codice o descrizione...",
  maxResults = 12,
}: AutocompleteInputProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as AutocompleteOption[];
    return options
      .filter(
        (opt) =>
          opt.value.toLowerCase().includes(q) ||
          opt.label.toLowerCase().includes(q) ||
          opt.keywords?.toLowerCase().includes(q),
      )
      .slice(0, maxResults);
  }, [options, query, maxResults]);

  useEffect(() => {
    setActiveIndex(0);
  }, []);

  function handleSelect(option: AutocompleteOption) {
    onSelect(option);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (isOpen && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter" && activeIndex >= 0 && activeIndex < filtered.length) {
        e.preventDefault();
        const option = filtered[activeIndex];
        if (option) handleSelect(option);
        return;
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }
    }
    // Enter without dropdown: match exact code
    if (!isOpen && e.key === "Enter" && query.trim()) {
      const match = options.find((o) => o.value.toLowerCase() === query.trim().toLowerCase());
      if (match) {
        e.preventDefault();
        handleSelect(match);
      }
    }
  }

  const showDropdown = isOpen && filtered.length > 0;

  return (
    <div className="relative">
      <div className="relative flex h-10 items-center rounded-full border border-[var(--border-subtle)]/60 bg-[var(--bg-muted)]/65">
        <Search className="ml-3 size-4 shrink-0 text-[var(--text-secondary)]" />
        <input
          ref={inputRef}
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-label={placeholder}
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-[13px] outline-none"
          onBlur={() => setTimeout(() => setIsOpen(false), 180)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          value={query}
        />
        {query && (
          <button
            className="mr-2 flex size-7 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            type="button"
          >
            <XCircle className="size-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <motion.div
          ref={listRef}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[320px] overflow-hidden rounded-[18px] bg-[var(--surface-base)] p-1.5 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.15)] ring-1 ring-[var(--border-subtle)]"
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          role="listbox"
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          {filtered.map((option, index) => (
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-[13px] transition-colors",
                index === activeIndex ? "bg-[var(--bg-muted)]" : "hover:bg-[var(--bg-muted)]",
              )}
              key={option.value}
              onClick={() => handleSelect(option)}
              onMouseEnter={() => setActiveIndex(index)}
              role="option"
              type="button"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-[var(--text-primary)]">
                  {option.label}
                </span>
                {option.metadata && (
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--text-secondary)]">
                    {option.metadata}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-[12px] font-mono font-semibold text-[var(--accent-primary)]">
                {option.value}
              </span>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
