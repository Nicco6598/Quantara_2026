import { forwardRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Field, type FieldProps } from "./Field";

export type CurrencyFieldProps = {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  currency?: string;
  min?: number;
  max?: number;
} & Omit<FieldProps, "children">;

function parseLocalNumber(raw: string): number {
  const sanitized = raw.trim();
  if (!sanitized) return 0;

  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");
  const sepIndex = Math.max(lastComma, lastDot);
  if (sepIndex < 0) {
    const parsed = Number(sanitized.replace(/\D/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const fractionalPart = sanitized.slice(sepIndex + 1).replace(/\D/g, "");
  const hasDecimalPart = fractionalPart.length > 0 && fractionalPart.length <= 2;
  if (!hasDecimalPart) {
    const parsed = Number(sanitized.replace(/[.,]/g, "").replace(/\D/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const integerPart = sanitized.slice(0, sepIndex).replace(/\D/g, "") || "0";
  const normalized = `${integerPart}.${fractionalPart}`;
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const CurrencyField = forwardRef<HTMLInputElement, CurrencyFieldProps>(
  (
    { value, onChange, placeholder, disabled, className, currency = "€", min, max, ...fieldProps },
    ref,
  ) => {
    const { id: externalId, ...restFieldProps } = fieldProps;
    const fieldId = externalId ?? fieldProps.label?.toLowerCase().replace(/\s+/g, "-");

    const displayValue = value === 0 && !placeholder ? "" : value.toLocaleString("it-IT");

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const cleaned = raw.replace(/[^0-9,.]/g, "");
        const parsed = parseLocalNumber(cleaned);
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
          <span className="mr-1 text-13px font-medium text-[var(--text-secondary)]">
            {currency}
          </span>
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
              "min-w-0 flex-1 bg-transparent text-13px font-medium text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 outline-none disabled:cursor-not-allowed",
              className,
            )}
            aria-invalid={!!fieldProps.error}
          />
        </div>
      </Field>
    );
  },
);

CurrencyField.displayName = "CurrencyField";
