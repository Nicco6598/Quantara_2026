import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, type FieldProps } from "./Field";

export type SelectOption = { value: string; label: string };

export type SelectFieldProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
} & Omit<FieldProps, "children">;

export function SelectField({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
  ...fieldProps
}: SelectFieldProps) {
  const { id: externalId, ...restFieldProps } = fieldProps;
  const fieldId = externalId ?? fieldProps.label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <Field {...(externalId ? { id: externalId } : {})} {...restFieldProps}>
      <div className="relative">
        <select
          id={fieldId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "h-10 w-full cursor-pointer appearance-none rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 pr-10 text-13px font-medium text-[var(--text-primary)] outline-none transition-[border-color,background-color,box-shadow] duration-[var(--duration-fast)] hover:bg-[color-mix(in_srgb,var(--surface-base)_86%,var(--bg-muted)_14%)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)] disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-[var(--text-secondary)]/50",
            className,
          )}
          aria-invalid={!!fieldProps.error}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
      </div>
    </Field>
  );
}
