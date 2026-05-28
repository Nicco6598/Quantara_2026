import { forwardRef } from "react";
import { sanitizeDecimalInput } from "@/lib/localized-number-input";
import { cn } from "@/lib/utils";
import { Field, type FieldProps } from "./Field";

export type LocalizedDecimalFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  suffix?: string;
  maxDecimals?: number;
} & Omit<FieldProps, "children">;

export const LocalizedDecimalField = forwardRef<HTMLInputElement, LocalizedDecimalFieldProps>(
  (
    { value, onChange, placeholder, disabled, className, suffix, maxDecimals = 2, ...fieldProps },
    ref,
  ) => {
    const { id: externalId, ...restFieldProps } = fieldProps;
    const fieldId = externalId ?? fieldProps.label?.toLowerCase().replace(/\s+/g, "-");

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
            value={value}
            onChange={(e) => onChange(sanitizeDecimalInput(e.target.value, maxDecimals))}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "min-w-0 flex-1 bg-transparent text-13px font-medium text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 outline-none disabled:cursor-not-allowed",
              className,
            )}
            aria-invalid={!!fieldProps.error}
          />
          {suffix ? (
            <span className="ml-1 shrink-0 text-13px font-medium text-[var(--text-secondary)]">
              {suffix}
            </span>
          ) : null}
        </div>
      </Field>
    );
  },
);

LocalizedDecimalField.displayName = "LocalizedDecimalField";
