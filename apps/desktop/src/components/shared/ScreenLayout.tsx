import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type GradientPreset =
  | "accent"
  | "accent-success"
  | "info"
  | "info-success"
  | "success"
  | "success-info"
  | "projects"
  | "settings"
  | "dashboard-hero"
  | "dashboard-priority"
  | "dashboard-milestones"
  | "update-modal";

const gradientMap: Record<GradientPreset, string> = {
  accent:
    "radial-gradient(circle_at_14%_10%,color-mix(in srgb,var(--info-base)_13%,transparent),transparent_34%),radial-gradient(circle_at_90%_18%,color-mix(in srgb,var(--accent-primary)_15%,transparent),transparent_32%)",
  "accent-success":
    "radial-gradient(circle_at_15%_10%,color-mix(in srgb,var(--accent-primary)_13%,transparent),transparent_34%),radial-gradient(circle_at_88%_18%,color-mix(in srgb,var(--success-base)_12%,transparent),transparent_32%)",
  info: "radial-gradient(circle_at_14%_10%,color-mix(in srgb,var(--info-base)_13%,transparent),transparent_34%),radial-gradient(circle_at_90%_18%,color-mix(in srgb,var(--accent-primary)_15%,transparent),transparent_32%)",
  "info-success":
    "radial-gradient(circle_at_14%_10%,color-mix(in srgb,var(--success-base)_13%,transparent),transparent_34%),radial-gradient(circle_at_90%_18%,color-mix(in srgb,var(--info-base)_15%,transparent),transparent_32%)",
  success:
    "radial-gradient(circle_at_14%_10%,color-mix(in srgb,var(--success-base)_13%,transparent),transparent_34%),radial-gradient(circle_at_90%_18%,color-mix(in srgb,var(--info-base)_15%,transparent),transparent_32%)",
  "success-info":
    "radial-gradient(circle_at_16%_8%,color-mix(in srgb,var(--accent-primary)_16%,transparent),transparent_34%),radial-gradient(circle_at_88%_18%,color-mix(in srgb,var(--info-base)_14%,transparent),transparent_32%)",
  projects:
    "radial-gradient(circle_at_top_left,color-mix(in srgb,var(--accent-primary)_7%,transparent),transparent_36%),radial-gradient(circle_at_top_right,color-mix(in srgb,var(--accent-secondary)_6%,transparent),transparent_28%),linear-gradient(180deg,color-mix(in srgb,var(--surface-base)_93%,var(--bg-muted)_7%),var(--surface-base))",
  settings:
    "radial-gradient(circle_at_top_left,color-mix(in srgb,var(--info-base)_12%,transparent),transparent_34%),radial-gradient(circle_at_top_right,color-mix(in srgb,var(--success-base)_10%,transparent),transparent_26%),linear-gradient(180deg,color-mix(in srgb,var(--surface-base)_96%,var(--bg-muted)_4%),var(--surface-base))",
  "dashboard-hero":
    "radial-gradient(circle_at_86%_8%,color-mix(in srgb,var(--accent-primary)_8%,transparent),transparent_32%),radial-gradient(circle_at_8%_100%,color-mix(in srgb,var(--info-base)_8%,transparent),transparent_36%),linear-gradient(135deg,color-mix(in srgb,var(--surface-base)_95%,var(--bg-muted)_5%),color-mix(in srgb,var(--surface-base)_87%,var(--bg-muted)_13%))",
  "dashboard-priority":
    "radial-gradient(circle_at_12%_0%,color-mix(in srgb,var(--accent-primary)_7%,transparent),transparent_34%),linear-gradient(90deg,color-mix(in srgb,var(--accent-primary)_4%,var(--surface-base)),color-mix(in srgb,var(--surface-base)_95%,var(--warning-soft)_5%))",
  "dashboard-milestones":
    "radial-gradient(circle_at_0%_50%,color-mix(in srgb,var(--info-base)_12%,transparent),transparent_28%),color-mix(in srgb,var(--surface-base)_92%,var(--info-soft)_8%)",
  "update-modal":
    "radial-gradient(circle_at_12%_0%,color-mix(in srgb,var(--info-soft)_70%,transparent),transparent_34%),linear-gradient(180deg,var(--surface-base),color-mix(in srgb,var(--surface-base)_94%,var(--bg-muted)_6%))",
};

type ScreenLayoutProps = {
  children: ReactNode;
  className?: string;
  gradient?: GradientPreset;
  gradientHeight?: number;
};

export const ScreenLayout = forwardRef<HTMLElement, ScreenLayoutProps>(function ScreenLayout(
  { children, className, gradient = "info", gradientHeight = 420 },
  ref,
) {
  return (
    <main
      ref={ref}
      className={cn(
        "relative w-full max-w-full overflow-x-hidden bg-[var(--surface-base)] px-4 pb-10 pt-4 md:px-6",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10"
        style={{
          background: gradientMap[gradient],
          height: gradientHeight,
        }}
      />
      {children}
    </main>
  );
});
