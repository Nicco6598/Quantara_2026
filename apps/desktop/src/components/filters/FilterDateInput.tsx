import { Calendar } from "lucide-react";
import { type KeyboardEvent, useRef } from "react";

export function FilterDateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDatePickerClick() {
    inputRef.current?.showPicker();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLLabelElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.showPicker();
    }
  }

  return (
    <label
      className="flex h-10 cursor-pointer items-center gap-2 rounded-14px border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3.5 text-13px font-medium text-[var(--text-primary)] outline-none transition focus-within:border-[var(--accent-primary)] focus-within:ring-2 focus-within:ring-[var(--ring-focus)] hover:bg-[var(--bg-muted-strong)]"
      onClick={handleDatePickerClick}
      onKeyDown={handleKeyDown}
    >
      <Calendar className="size-4 shrink-0 text-[var(--text-secondary)]" />
      <span className="whitespace-nowrap text-[var(--text-secondary)]">{label}</span>
      <input
        ref={inputRef}
        className="date-input-native w-[110px] cursor-pointer bg-transparent text-13px font-medium text-[var(--text-primary)] outline-none"
        onChange={(e) => onChange(e.target.value)}
        type="date"
        value={value}
      />
    </label>
  );
}
