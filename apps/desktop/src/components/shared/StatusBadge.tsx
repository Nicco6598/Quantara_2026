export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export const statusToneStyles: Record<StatusTone, string> = {
  danger: "bg-[var(--danger-soft)] text-[var(--danger-base)]",
  info: "bg-[var(--info-soft)] text-[var(--info-base)]",
  neutral: "bg-[var(--neutral-soft)] text-[var(--neutral-base)]",
  success: "bg-[var(--success-soft)] text-[var(--success-base)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
};
