import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Field, type FieldProps } from "./Field";

export type TextFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  type?: "text" | "email" | "tel" | "url" | "password";
} & Omit<FieldProps, "children">;

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    { value, onChange, placeholder, disabled, className, id, type = "text", ...fieldProps },
    ref,
  ) => {
    const fieldId = id ?? fieldProps.label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <Field {...(fieldId ? { id: fieldId } : {})} {...fieldProps}>
        <input
          ref={ref}
          id={fieldId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "h-10 rounded-22px border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 text-13px font-medium text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 outline-none transition focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)] disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          aria-invalid={!!fieldProps.error}
          aria-describedby={
            fieldProps.error ? `${fieldId}-error` : fieldProps.hint ? `${fieldId}-hint` : undefined
          }
        />
      </Field>
    );
  },
);

TextField.displayName = "TextField";
