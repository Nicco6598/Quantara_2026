import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, XCircle } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";

type AutocompleteOption = {
  id?: string;
  label: string;
  value: string;
  keywords?: string;
  metadata?: string;
};

type AutocompleteInputProps = {
  options: AutocompleteOption[];
  onSelect: (option: AutocompleteOption) => void;
  onOptionContextMenu?: (option: AutocompleteOption, event: React.MouseEvent) => void;
  placeholder?: string;
  filterOptions?: (options: AutocompleteOption[], query: string) => AutocompleteOption[];
  onQueryChange?: (query: string) => void;
};

const RESULTS_MAX_HEIGHT = 520;
const ITEM_HEIGHT = 96;

type DropdownPos = { left: number; top: number; width: number };

export function AutocompleteInput({
  filterOptions,
  onOptionContextMenu,
  options,
  onSelect,
  onQueryChange,
  placeholder = "Cerca per codice o descrizione...",
}: AutocompleteInputProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 200);
  const deferredQuery = useDeferredValue(debouncedQuery);
  const [isFiltering, startFilterTransition] = useTransition();
  const [filtered, setFiltered] = useState<AutocompleteOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [floating, setFloating] = useState<DropdownPos | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const measureRef = useRef<() => void>(() => {});

  const filterOptionsRef = useRef(filterOptions);
  filterOptionsRef.current = filterOptions;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const trimmed = deferredQuery.trim();
    if (trimmed.length < 2) {
      setFiltered([]);
      return;
    }

    startFilterTransition(() => {
      const runFilter = filterOptionsRef.current;
      const source = optionsRef.current;
      const q = trimmed.toLowerCase();
      const next = runFilter
        ? runFilter(source, deferredQuery)
        : source.filter(
            (opt) =>
              opt.value.toLowerCase().includes(q) ||
              opt.label.toLowerCase().includes(q) ||
              opt.keywords?.toLowerCase().includes(q),
          );
      setFiltered(next);
    });
  }, [deferredQuery]);

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 8,
  });
  const rowVirtualizerRef = useRef(rowVirtualizer);
  rowVirtualizerRef.current = rowVirtualizer;

  useEffect(() => {
    setActiveIndex(0);
  }, []);

  function handleSelect(option: AutocompleteOption) {
    onSelect(option);
    setQuery("");
    onQueryChange?.("");
    setIsOpen(false);
    setFloating(null);
    inputRef.current?.focus();
  }

  const measure = useCallback(() => {
    if (!containerRef.current) return;
    const inputField = containerRef.current.querySelector<HTMLElement>(".autocomplete-input-field");
    const el = inputField ?? containerRef.current;
    const rect = el.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const w = Math.min(Math.max(rect.width, 680), viewportW - 24);
    const l = Math.min(Math.max(rect.left, 12), viewportW - w - 12);
    setFloating({ left: l, top: rect.bottom + 8, width: w });
  }, []);
  measureRef.current = measure;

  const showResults = isOpen && filtered.length > 0;

  useEffect(() => {
    if (!showResults) {
      setFloating(null);
      return;
    }
    measureRef.current();
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          measureRef.current();
          rafId = null;
        });
      }
    };
    const onResize = onScroll;
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [showResults]);

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
    if (!isOpen && e.key === "Enter" && query.trim()) {
      const match = options.find((o) => o.value.toLowerCase() === query.trim().toLowerCase());
      if (match) {
        e.preventDefault();
        handleSelect(match);
      }
    }
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (filtered.length === 0) return;
    rowVirtualizerRef.current.scrollToIndex(activeIndex, { align: "auto" });
  }, [activeIndex, filtered.length]);

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div ref={containerRef} className="w-full">
      <div className="autocomplete-input-field relative flex h-11 w-full items-center rounded-xl border border-[var(--border-subtle)]/60 bg-[var(--bg-muted)]/65 shadow-sm">
        <Search className="ml-3.5 size-[18px] shrink-0 text-[var(--text-secondary)]" />
        <input
          ref={inputRef}
          aria-autocomplete="list"
          aria-label={placeholder}
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-14px font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
          onBlur={() => setTimeout(() => setIsOpen(false), 180)}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onQueryChange?.(next);
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          value={query}
        />
        {(isFiltering || query !== debouncedQuery) && query.trim().length >= 2 ? (
          <span
            className="mr-1 size-4 shrink-0 animate-spin rounded-full border-2 border-[var(--text-tertiary)] border-t-transparent"
            aria-hidden
          />
        ) : null}
        {query && (
          <button
            aria-label="Cancella ricerca"
            className="mr-2 flex size-7 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]"
            onClick={() => {
              setQuery("");
              onQueryChange?.("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            type="button"
          >
            <XCircle className="size-4" />
          </button>
        )}
      </div>

      {floating &&
        showResults &&
        createPortal(
          <div
            className="overflow-hidden rounded-18px bg-[var(--surface-base)] shadow-soft ring-1 ring-[var(--border-subtle)]"
            style={{
              position: "fixed",
              left: floating.left,
              top: floating.top,
              width: floating.width,
              maxHeight: RESULTS_MAX_HEIGHT,
              zIndex: "var(--z-dropdown-menu)",
            }}
          >
            <div
              ref={scrollRef}
              className="overflow-y-auto"
              style={{ maxHeight: RESULTS_MAX_HEIGHT }}
            >
              <div
                role="listbox"
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  position: "relative",
                }}
              >
                {virtualItems.map((virtualRow) => {
                  const option = filtered[virtualRow.index];
                  if (!option) return null;
                  return (
                    <button
                      className={cn(
                        "flex min-h-[92px] w-full items-start gap-3 border-b border-[var(--border-subtle)]/55 px-4 py-3 text-left text-13px transition-colors duration-[var(--duration-fast)] first:rounded-t-18px last:rounded-b-18px last:border-b-0",
                        virtualRow.index === activeIndex
                          ? "bg-[var(--accent-primary)]/[0.06]"
                          : "hover:bg-[var(--bg-muted)]",
                      )}
                      aria-selected={virtualRow.index === activeIndex}
                      data-index={virtualRow.index}
                      key={virtualRow.key}
                      onClick={() => handleSelect(option)}
                      onContextMenu={
                        onOptionContextMenu
                          ? (event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              onOptionContextMenu(option, event);
                            }
                          : undefined
                      }
                      onMouseEnter={() => setActiveIndex(virtualRow.index)}
                      role="option"
                      title={`${option.value} — ${option.label}${option.metadata ? `\n${option.metadata}` : ""}`}
                      type="button"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <span className="flex w-[72px] self-stretch shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10 px-2 text-center font-mono text-11px font-bold leading-tight text-[var(--accent-primary)]">
                        <span className="line-clamp-2 break-all">{option.value}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="grid min-w-0 gap-0.5">
                          <span className="font-mono text-12px font-bold text-[var(--accent-primary)]">
                            {option.value}
                          </span>
                          <span className="line-clamp-2 break-words text-14px font-semibold leading-snug text-[var(--text-primary)]">
                            {option.label}
                          </span>
                        </span>
                        {option.metadata && (
                          <span className="mt-1 line-clamp-2 break-words text-12px leading-snug text-[var(--text-secondary)]">
                            {option.metadata}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
