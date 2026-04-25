import type { LucideIcon } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "danger" | "info" | "neutral" | "success" | "warning";

export function ScreenShell({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn("space-y-6 p-6 pb-8", className)}>{children}</main>;
}

export function CommandPanel({
  children,
  className,
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "projects" | "settings";
}) {
  return (
    <section
      className={cn(
        "screen-panel relative overflow-hidden rounded-[28px] border border-subtle p-6 shadow-soft",
        variant === "projects" && "projects-command-surface",
        variant === "settings" && "settings-command-surface",
        className,
      )}
    >
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export function SectionPanel({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={cn("screen-panel rounded-[28px] border border-subtle p-5 shadow-soft", className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function SectionHeading({
  icon: Icon,
  kicker,
  title,
}: {
  icon?: LucideIcon;
  kicker?: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {Icon ? <Icon className="size-4 text-info" /> : null}
      <div>
        {kicker ? (
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
            {kicker}
          </div>
        ) : null}
        <h3 className={cn("font-semibold text-foreground", kicker ? "mt-1 text-lg" : "text-base")}>
          {title}
        </h3>
      </div>
    </div>
  );
}

export function MetricTile({
  detail,
  label,
  tone = "neutral",
  value,
}: {
  detail?: string;
  label: string;
  tone?: Tone;
  value: string;
}) {
  return (
    <div className="metric-tile rounded-[22px] border border-subtle bg-muted/35 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
        {label}
      </div>
      <div className={cn("mt-3 text-2xl font-semibold", toneClass(tone))}>{value}</div>
      {detail ? <p className="mt-2 text-xs leading-5 text-secondary">{detail}</p> : null}
    </div>
  );
}

export function SummaryLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-subtle pb-3 last:border-b-0 last:pb-0">
      <dt className="text-sm text-secondary">{label}</dt>
      <dd className="text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function toneClass(tone: Tone) {
  switch (tone) {
    case "danger":
      return "text-danger";
    case "info":
      return "text-info";
    case "success":
      return "text-success";
    case "warning":
      return "text-warning";
    default:
      return "text-foreground";
  }
}
