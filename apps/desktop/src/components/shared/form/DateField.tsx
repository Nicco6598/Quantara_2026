import { cn } from "@/lib/utils";
import { DatePicker } from "./DatePicker";
import { Field, type FieldProps } from "./Field";

export type DateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
} & Omit<FieldProps, "children">;

export function DateField({ value, onChange, disabled, className, ...fieldProps }: DateFieldProps) {
  const { id: externalId, ...restFieldProps } = fieldProps;
  const fieldId = externalId ?? fieldProps.label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <Field {...(externalId ? { id: externalId } : {})} {...restFieldProps}>
      <DatePicker
        {...(fieldProps.label ? { ariaLabel: fieldProps.label } : {})}
        {...(disabled !== undefined ? { disabled } : {})}
        {...(fieldId ? { id: fieldId } : {})}
        className={cn(
          "h-10 rounded-[12px] px-4",
          fieldProps.error && "border-[var(--danger-base)]",
          className,
        )}
        onChange={onChange}
        value={value}
      />
    </Field>
  );
}
