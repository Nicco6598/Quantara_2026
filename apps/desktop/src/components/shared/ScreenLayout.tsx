import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type GradientPreset =
  | "accent"
  | "accent-success"
  | "info"
  | "info-success"
  | "success"
  | "success-info";

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
        "relative w-full max-w-full overflow-x-hidden px-4 pb-10 pt-4 md:px-6",
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
