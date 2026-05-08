import type { ReactNode } from "react";
import { BezelSurface } from "@/components/shared/ui-primitives";

type ScreenHeroProps = {
  badge: string;
  title: string;
  description: string;
  children?: ReactNode;
  sidePanel?: ReactNode;
};

export function ScreenHero({ badge, title, description, children, sidePanel }: ScreenHeroProps) {
  return (
    <section className="animate-entry grid gap-5 md:grid-cols-[minmax(0,1fr)_320px] md:items-end">
      <div className="min-w-0">
        <div className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--surface-base)_76%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
          {badge}
        </div>
        <h2 className="mt-5 max-w-4xl text-[38px] font-semibold leading-[0.98] text-[var(--text-primary)] md:text-[56px]">
          {title}
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-6 text-[var(--text-secondary)]">
          {description}
        </p>
        {children ? <div className="mt-7">{children}</div> : null}
      </div>

      {sidePanel ? (
        <BezelSurface className="self-start md:translate-y-2" innerClassName="p-5">
          {sidePanel}
        </BezelSurface>
      ) : null}
    </section>
  );
}
