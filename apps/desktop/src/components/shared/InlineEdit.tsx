import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEscapeStack } from "@/hooks/useEscapeStack";
import { cn } from "@/lib/utils";

type InlineEditProps = {
  value: number;
  onCommit: (value: number) => void;
  className?: string;
  min?: number;
  step?: string;
  ariaLabel?: string;
};

export function InlineEdit({
  value,
  onCommit,
  className,
  min = 0,
  step = "0.001",
  ariaLabel,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEscapeStack(
    useCallback(() => {
      if (editing) {
        setDraft(String(value));
        setEditing(false);
      }
    }, [editing, value]),
    editing,
  );

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function handleCommit() {
    const parsed = parseFloat(draft.replace(",", "."));
    if (Number.isFinite(parsed) && parsed >= min) {
      onCommit(parsed);
    }
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCommit();
    }
    if (e.key === "Tab") {
      handleCommit();
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        aria-label={ariaLabel}
        className={cn(
          "h-8 w-full min-w-0 rounded-[8px] border border-[var(--accent-primary)] bg-[var(--surface-base)] px-2 text-right text-[13px] outline-none ring-2 ring-[var(--ring-focus)]",
          className,
        )}
        min={min}
        onBlur={handleCommit}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        step={step}
        type="number"
        value={draft}
      />
    );
  }

  return (
    <motion.button
      className={cn(
        "h-8 w-full min-w-0 rounded-[8px] border border-transparent px-2 text-right text-[13px] transition-colors hover:border-[var(--border-subtle)] hover:bg-[var(--surface-base)]",
        className,
      )}
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {value.toLocaleString("it-IT", {
        maximumFractionDigits: 3,
        minimumFractionDigits: 0,
      })}
    </motion.button>
  );
}
