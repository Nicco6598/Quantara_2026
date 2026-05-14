import { m } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useMemo } from "react";
import { SPRING_EASE } from "@/components/shared/easings";
import type { PortfolioProject } from "@/features/projects/types";

import { Currency } from "@/components/shared/Currency";

import type { SalDocument } from "@/features/sal/domain/sal-workflow";

import { cn } from "@/lib/utils";

import { buildProjectTimeline, type TimelineEvent } from "../domain/project-timeline";

const STAGGER = 0.04;

type ProjectTimelineProps = {
  project: PortfolioProject;
  salDocuments: SalDocument[];
};

export function ProjectTimeline({ project, salDocuments }: ProjectTimelineProps) {
  const events = useMemo(
    () => buildProjectTimeline(project, salDocuments),
    [project, salDocuments],
  );

  if (events.length === 0) {
    return (
      <div className="rounded-lg bg-[var(--surface-base)] p-5 text-center text-13px text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]/60">
        Nessun evento disponibile per questo progetto.
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
      <div className="text-11px font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
        Timeline progetto
      </div>
      <div className="relative mt-4 ml-2">
        {/* Vertical line */}
        <div className="absolute bottom-0 left-[11px] top-0 w-0.5 bg-[var(--border-subtle)]/50" />

        <div className="relative space-y-4">
          {events.map((event, index) => (
            <TimelineDot event={event} index={index} key={event.id} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineDot({ event, index }: { event: TimelineEvent; index: number }) {
  const dotColor =
    event.status === "completed"
      ? "bg-[var(--success-base)] border-[var(--success-base)]"
      : event.status === "current"
        ? "bg-[var(--info-base)] border-[var(--info-base)]"
        : event.status === "overdue"
          ? "bg-[var(--danger-base)] border-[var(--danger-base)]"
          : "bg-[var(--bg-muted)] border-[var(--border-subtle)]";

  const Icon =
    event.status === "completed"
      ? CheckCircle2
      : event.status === "overdue"
        ? AlertTriangle
        : Clock;

  return (
    <m.div
      animate={{ opacity: 1, x: 0 }}
      className="relative flex items-start gap-3"
      initial={{ opacity: 0, x: -12 }}
      transition={{ delay: index * STAGGER, duration: 0.3, ease: SPRING_EASE }}
    >
      {/* Dot */}
      <div
        className={cn(
          "relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
          dotColor,
        )}
      >
        {event.status === "completed" ? (
          <CheckCircle2 className="size-3 text-white" />
        ) : (
          <Icon
            className={cn(
              "size-3",
              event.status === "overdue" ? "text-white" : "text-[var(--text-secondary)]",
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-13px font-semibold text-[var(--text-primary)]">
            {event.title}
          </span>
          {event.type === "sal" && event.value != null && (
            <span className="shrink-0 text-12px font-semibold text-[var(--accent-primary)]">
              <Currency value={event.value} />
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-12px text-[var(--text-secondary)]">{event.description}</span>
          {event.status === "overdue" && (
            <span className="rounded-full bg-[var(--danger-soft)] px-2 py-0.5 text-10px font-semibold text-[var(--danger-base)]">
              In ritardo
            </span>
          )}
        </div>
        <div className="mt-0.5 text-11px font-medium text-[var(--text-secondary)]">
          {event.date}
        </div>
      </div>
    </m.div>
  );
}
