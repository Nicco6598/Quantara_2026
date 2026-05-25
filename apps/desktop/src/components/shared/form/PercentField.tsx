import { forwardRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Field, type FieldProps } from "./Field";

export type PercentFieldProps = {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  min?: number;
  max?: number;
} & Omit<FieldProps, "children">;

export const PercentField = forwardRef<HTMLInputElement, PercentFieldProps>(
  ({ value, onChange, placeholder, disabled, className, min, max, ...fieldProps }, ref) => {
    const { id: externalId, ...restFieldProps } = fieldProps;
    const fieldId = externalId ?? fieldProps.label?.toLowerCase().replace(/\s+/g, "-");

    const displayValue = value === 0 && !placeholder ? "" : String(value);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/[^0-9,.-]/g, "");
        const normalized = raw.replace(",", ".");
        const parsed = parseFloat(normalized);
        if (!Number.isFinite(parsed)) return;
        if (min !== undefined && parsed < min) return;
        if (max !== undefined && parsed > max) return;
        onChange(parsed);
      },
      [onChange, min, max],
    );

    return (
      <Field {...(externalId ? { id: externalId } : {})} {...restFieldProps}>
        <div
          className={cn(
            "flex h-10 items-center rounded-22px border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 transition focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--ring-focus)]",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <input
            ref={ref}
            id={fieldId}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "min-w-0 flex-1 bg-transparent text-right text-13px font-medium text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 outline-none disabled:cursor-not-allowed",
              className,
            )}
            aria-invalid={!!fieldProps.error}
          />
          <span className="ml-1 text-13px font-medium text-[var(--text-secondary)]">%</span>
        </div>
      </Field>
    );
  },
);

PercentField.displayName = "PercentField";
