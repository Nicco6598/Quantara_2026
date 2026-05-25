import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FieldProps = {
  children: ReactNode;
  label?: string;
  description?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  id?: string;
};

export function Field({
  children,
  label,
  description,
  error,
  hint,
  required,
  className,
  id,
}: FieldProps) {
  const fieldId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={fieldId} className="text-12px font-semibold text-[var(--text-secondary)]">
          {label}
          {required && (
            <span className="ml-0.5 text-[var(--danger-base)]" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {description && <p className="text-11px text-[var(--text-secondary)]">{description}</p>}
      {children}
      {error && (
        <p className="text-11px text-[var(--danger-base)]" role="alert">
          {error}
        </p>
      )}
      {hint && !error && <p className="text-11px text-[var(--text-secondary)]">{hint}</p>}
    </div>
  );
}
