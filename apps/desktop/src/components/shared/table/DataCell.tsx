import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DataCellProps = {
  children: ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
  width?: string;
  nowrap?: boolean;
};

export function DataCell({ children, align = "left", className, width, nowrap }: DataCellProps) {
  return (
    <td
      className={cn(
        "px-3 py-2.5 text-13px text-[var(--text-primary)]",
        align === "center" && "text-center",
        align === "right" && "text-right",
        nowrap ? "truncate" : "break-words",
        className,
      )}
      style={width ? { width, maxWidth: width } : undefined}
    >
      {children}
    </td>
  );
}
