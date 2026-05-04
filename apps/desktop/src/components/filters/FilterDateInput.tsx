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

  function handleClick() {
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
      className="flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--bg-muted)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)]"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <Calendar className="size-3.5 shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
      <input
        ref={inputRef}
        className="date-input-native w-[110px] cursor-pointer bg-transparent text-[12px] text-[var(--text-primary)] outline-none"
        onChange={(e) => onChange(e.target.value)}
        type="date"
        value={value}
      />
    </label>
  );
}
