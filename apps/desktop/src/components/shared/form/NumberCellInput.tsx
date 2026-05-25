import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type NumberCellInputProps = {
  value: number;
  onChange: (value: number) => void;
  onCommit?: () => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  placeholder?: string;
};

export function NumberCellInput({
  value,
  onChange,
  onCommit,
  min,
  max,
  step,
  className,
  placeholder,
}: NumberCellInputProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function handleCommit() {
    const raw = draft.replace(",", ".");
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed)) {
      if (min !== undefined && parsed < min) return;
      if (max !== undefined && parsed > max) return;
      onChange(parsed);
    } else {
      setDraft(String(value));
    }
    setEditing(false);
    onCommit?.();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCommit();
    }
    if (e.key === "Escape") {
      setDraft(String(value));
      setEditing(false);
    }
    if (e.key === "Tab") {
      handleCommit();
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step={step}
        min={min}
        max={max}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "h-8 w-full min-w-0 rounded-md border border-[var(--accent-primary)] bg-[var(--surface-base)] px-2 text-right text-13px font-medium text-[var(--text-primary)] outline-none ring-2 ring-[var(--ring-focus)]",
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "h-8 w-full min-w-0 cursor-pointer rounded-md border border-transparent px-2 text-right text-13px font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-subtle)] hover:bg-[var(--surface-base)]",
        className,
      )}
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
    >
      {value.toLocaleString("it-IT", {
        maximumFractionDigits: 3,
        minimumFractionDigits: 0,
      })}
    </button>
  );
}
