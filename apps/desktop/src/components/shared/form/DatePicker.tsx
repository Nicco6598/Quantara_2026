import { AnimatePresence, m } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { motionVariants } from "@/motion";

const CALENDAR_WIDTH = 316;
const CALENDAR_HEIGHT = 376;
const DAY_COUNT = 42;
const WEEK_DAYS = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"] as const;

const dayFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("it-IT", {
  month: "long",
  year: "numeric",
});

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  label?: string;
  ariaLabel?: string;
  disabled?: boolean;
  placeholder?: string;
  clearable?: boolean;
  align?: "start" | "end";
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
};

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function getCalendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = addDays(firstDay, -mondayOffset);
  return Array.from({ length: DAY_COUNT }, (_, index) => addDays(start, index));
}

function getDisplayValue(value: string, placeholder: string) {
  const date = parseIsoDate(value);
  return date ? dayFormatter.format(date).replace(".", "") : placeholder;
}

export function DatePicker({
  value,
  onChange,
  id,
  label,
  ariaLabel,
  disabled,
  placeholder = "Seleziona data",
  clearable = true,
  align = "start",
  className,
  iconClassName,
  labelClassName,
  valueClassName,
}: DatePickerProps) {
  const generatedId = useId();
  const buttonId = id ?? generatedId;
  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const today = useMemo(() => new Date(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [activeDate, setActiveDate] = useState<Date>(selectedDate ?? today);
  const [cursorMonth, setCursorMonth] = useState<Date>(startOfMonth(selectedDate ?? today));
  const [position, setPosition] = useState({ left: 16, top: 16 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement | null>());

  const days = useMemo(() => getCalendarDays(cursorMonth), [cursorMonth]);
  const displayValue = getDisplayValue(value, placeholder);

  useEffect(() => {
    if (!isOpen) return;
    const base = selectedDate ?? today;
    setActiveDate(base);
    setCursorMonth(startOfMonth(base));
  }, [isOpen, selectedDate, today]);

  useEffect(() => {
    if (!isOpen) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const preferredLeft = align === "end" ? rect.right - CALENDAR_WIDTH : rect.left;
      const maxLeft = Math.max(8, window.innerWidth - CALENDAR_WIDTH - 8);
      const belowTop = rect.bottom + 8;
      const aboveTop = rect.top - CALENDAR_HEIGHT - 8;
      const fitsBelow = belowTop + CALENDAR_HEIGHT <= window.innerHeight - 8;

      setPosition({
        left: Math.min(Math.max(8, preferredLeft), maxLeft),
        top: Math.max(8, fitsBelow ? belowTop : aboveTop),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, isOpen]);

  function focusDate(nextDate: Date) {
    const nextIso = toIsoDate(nextDate);
    setActiveDate(nextDate);
    setCursorMonth(startOfMonth(nextDate));
    requestAnimationFrame(() => dayRefs.current.get(nextIso)?.focus());
  }

  function selectDate(date: Date) {
    onChange(toIsoDate(date));
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function handleCalendarKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
      return;
    }

    const directionByKey: Record<string, number> = {
      ArrowDown: 7,
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      PageDown: 30,
      PageUp: -30,
    };
    const direction = directionByKey[event.key];
    if (!direction) return;
    event.preventDefault();
    focusDate(addDays(activeDate, direction));
  }

  function handleClear() {
    onChange("");
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  const popover =
    typeof document === "undefined"
      ? null
      : createPortal(
          <AnimatePresence>
            {isOpen ? (
              <>
                <button
                  aria-label="Chiudi calendario"
                  className="fixed inset-0 z-[var(--z-dropdown-portal)] cursor-default"
                  onClick={() => setIsOpen(false)}
                  type="button"
                />
                <m.div
                  animate={motionVariants.popover.animate}
                  aria-label="Calendario"
                  className="fixed z-[var(--z-dropdown-portal)] w-[316px] overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-3 shadow-soft ring-1 ring-[color-mix(in_srgb,var(--surface-elevated)_66%,transparent)]"
                  exit={motionVariants.popover.exit}
                  initial={motionVariants.popover.initial}
                  onKeyDown={handleCalendarKeyDown}
                  role="dialog"
                  style={{ left: position.left, top: position.top }}
                  transition={motionVariants.popover.transition}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      aria-label="Mese precedente"
                      className="flex size-9 items-center justify-center rounded-[12px] text-[var(--text-secondary)] transition-[background-color,color,transform] duration-[var(--duration-fast)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] active:scale-[0.97]"
                      onClick={() => setCursorMonth((current) => addMonths(current, -1))}
                      type="button"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <div className="min-w-0 text-center">
                      <div className="text-13px font-semibold capitalize text-[var(--text-primary)]">
                        {monthFormatter.format(cursorMonth)}
                      </div>
                      <div className="mt-0.5 text-11px font-medium text-[var(--text-tertiary)]">
                        Scegli una data
                      </div>
                    </div>
                    <button
                      aria-label="Mese successivo"
                      className="flex size-9 items-center justify-center rounded-[12px] text-[var(--text-secondary)] transition-[background-color,color,transform] duration-[var(--duration-fast)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] active:scale-[0.97]"
                      onClick={() => setCursorMonth((current) => addMonths(current, 1))}
                      type="button"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-7 gap-1 text-center text-10px font-bold uppercase text-[var(--text-tertiary)]">
                    {WEEK_DAYS.map((day) => (
                      <div className="py-1" key={day}>
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="mt-1 grid grid-cols-7 gap-1">
                    {days.map((day) => {
                      const iso = toIsoDate(day);
                      const selected = selectedDate ? isSameDay(day, selectedDate) : false;
                      const current = isSameDay(day, today);
                      const inMonth = isSameMonth(day, cursorMonth);
                      const active = isSameDay(day, activeDate);

                      return (
                        <button
                          aria-current={current ? "date" : undefined}
                          aria-label={dayFormatter.format(day)}
                          aria-pressed={selected}
                          className={cn(
                            "flex h-9 items-center justify-center rounded-[12px] text-12px font-semibold tabular-nums outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-fast)] active:scale-[0.96]",
                            selected
                              ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-[0_8px_20px_color-mix(in_srgb,var(--accent-primary)_24%,transparent)]"
                              : "text-[var(--text-primary)] hover:bg-[var(--bg-muted)]",
                            !selected && !inMonth && "text-[var(--text-tertiary)]",
                            !selected &&
                              current &&
                              "border border-[var(--accent-primary)] text-[var(--accent-primary)]",
                            active && "ring-2 ring-[var(--ring-focus)]",
                          )}
                          key={iso}
                          onClick={() => selectDate(day)}
                          ref={(node) => {
                            dayRefs.current.set(iso, node);
                          }}
                          tabIndex={active ? 0 : -1}
                          type="button"
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center gap-2 border-t border-[var(--border-subtle)]/65 pt-3">
                    <button
                      className="h-9 flex-1 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-12px font-semibold text-[var(--text-primary)] transition-[background-color,border-color,transform] duration-[var(--duration-fast)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-muted)] active:scale-[0.98]"
                      onClick={() => selectDate(today)}
                      type="button"
                    >
                      Oggi
                    </button>
                    {clearable ? (
                      <button
                        className="flex h-9 items-center justify-center gap-1.5 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-12px font-semibold text-[var(--text-secondary)] transition-[background-color,border-color,color,transform] duration-[var(--duration-fast)] hover:border-[var(--danger-base)] hover:bg-[var(--danger-soft)]/55 hover:text-[var(--danger-base)] active:scale-[0.98]"
                        onClick={handleClear}
                        type="button"
                      >
                        <X className="size-3.5" />
                        Cancella
                      </button>
                    ) : null}
                  </div>
                </m.div>
              </>
            ) : null}
          </AnimatePresence>,
          document.body,
        );

  return (
    <>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={ariaLabel ?? label ?? "Scegli data"}
        className={cn(
          "flex h-10 w-full cursor-pointer items-center gap-2 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3.5 text-13px font-medium text-[var(--text-primary)] outline-none transition-[border-color,background-color,box-shadow,transform] duration-[var(--duration-fast)] focus-visible:border-[var(--accent-primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] hover:bg-[color-mix(in_srgb,var(--surface-base)_86%,var(--bg-muted)_14%)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        disabled={disabled}
        id={buttonId}
        onClick={() => setIsOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <Calendar className={cn("size-4 shrink-0 text-[var(--text-secondary)]", iconClassName)} />
        {label ? (
          <span className={cn("whitespace-nowrap text-[var(--text-secondary)]", labelClassName)}>
            {label}
          </span>
        ) : null}
        <span className={cn("min-w-0 flex-1 truncate text-left", valueClassName)}>
          {displayValue}
        </span>
      </button>
      {popover}
    </>
  );
}
