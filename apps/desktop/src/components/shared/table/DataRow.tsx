import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DataRowProps = {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  highlighted?: boolean;
  actions?: ReactNode;
};

export function DataRow({
  children,
  selected,
  onClick,
  className,
  highlighted,
  actions,
}: DataRowProps) {
  return (
    <tr
      className={cn(
        "group border-b border-[var(--border-subtle)] transition-colors duration-[var(--duration-fast)]",
        onClick && "cursor-pointer",
        selected && "bg-[var(--info-soft)]/10",
        !selected && !highlighted && "hover:bg-[var(--bg-muted)]",
        highlighted && "bg-[var(--info-soft)]/5",
        className,
      )}
      onClick={onClick}
    >
      {children}
      {actions ? (
        <td className="sticky right-0 w-0 p-0">
          <div className="invisible flex items-center pr-2 group-hover:visible">{actions}</div>
        </td>
      ) : null}
    </tr>
  );
}
