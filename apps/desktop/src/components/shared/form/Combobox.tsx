import { ChevronDown, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import { Field, type FieldProps } from "./Field";

export type ComboboxOption = { value: string; label: string };

export type ComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  searchPlaceholder?: string;
} & Omit<FieldProps, "children">;

export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
  searchPlaceholder,
  ...fieldProps
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 100);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) => opt.value.toLowerCase().includes(q) || opt.label.toLowerCase().includes(q),
    );
  }, [options, debouncedQuery]);

  const measureDropdown = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      top: rect.bottom + 4,
      width: rect.width,
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      measureDropdown();
      setActiveIndex(0);
    } else {
      setDropdownStyle(null);
    }
  }, [isOpen, measureDropdown]);

  useEffect(() => {
    if (!isOpen) return;
    let rafId: number | null = null;
    function handleResize() {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          measureDropdown();
          rafId = null;
        });
      }
    }
    window.addEventListener("scroll", handleResize, true);
    window.addEventListener("resize", handleResize);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleResize, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, measureDropdown]);

  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, isOpen]);

  function handleSelect(option: ComboboxOption) {
    onChange(option.value);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && filtered[activeIndex]) {
      e.preventDefault();
      handleSelect(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setQuery("");
    }
  }

  const { id: externalId, ...restFieldProps } = fieldProps;
  const fieldId = externalId ?? fieldProps.label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <Field {...(externalId ? { id: externalId } : {})} {...restFieldProps}>
      <div ref={containerRef} className={cn("relative", className)}>
        <div
          className={cn(
            "flex h-10 cursor-pointer items-center rounded-22px border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 transition focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--ring-focus)]",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {isOpen ? (
            <>
              <Search className="size-4 shrink-0 text-[var(--text-secondary)]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder ?? "Cerca..."}
                className="min-w-0 flex-1 bg-transparent px-2 text-13px font-medium text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 outline-none"
                aria-autocomplete="list"
                aria-controls={`${fieldId}-listbox`}
                aria-activedescendant={
                  filtered[activeIndex] ? `${fieldId}-option-${activeIndex}` : undefined
                }
              />
              {query && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuery("");
                    setActiveIndex(0);
                  }}
                  className="flex size-6 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-muted-strong)]"
                  aria-label="Cancella"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </>
          ) : (
            <>
              <span
                className={cn(
                  "min-w-0 flex-1 text-13px font-medium",
                  selectedOption ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]/50",
                )}
              >
                {selectedOption?.label ?? placeholder ?? "Seleziona..."}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setIsOpen(true);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                className="flex size-6 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-muted-strong)]"
                aria-label="Apri"
              >
                <ChevronDown className="size-4" />
              </button>
            </>
          )}
        </div>

        {isOpen &&
          dropdownStyle &&
          createPortal(
            <div
              role="listbox"
              id={`${fieldId}-listbox`}
              ref={listRef}
              style={dropdownStyle}
              className="max-h-60 overflow-y-auto rounded-14px bg-[var(--surface-base)] p-1 shadow-soft ring-1 ring-[var(--border-subtle)]"
              onMouseDown={(e) => e.preventDefault()}
            >
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-12px text-[var(--text-secondary)]">
                  Nessun risultato
                </div>
              ) : (
                filtered.map((opt, index) => {
                  const isSelected = opt.value === value;
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={opt.value}
                      role="option"
                      id={`${fieldId}-option-${index}`}
                      aria-selected={isSelected}
                      className={cn(
                        "flex w-full items-center rounded-10px px-3 py-2 text-left text-12px font-medium transition-colors",
                        isActive && "bg-[var(--bg-muted)]",
                        isSelected
                          ? "text-[var(--accent-primary)]"
                          : "text-[var(--text-primary)] hover:bg-[var(--bg-muted)]",
                      )}
                      onClick={() => handleSelect(opt)}
                      onMouseEnter={() => setActiveIndex(index)}
                      type="button"
                    >
                      <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                      {isSelected && (
                        <span className="ml-2 shrink-0 text-11px text-[var(--accent-primary)]">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>,
            document.body,
          )}
      </div>
    </Field>
  );
}
