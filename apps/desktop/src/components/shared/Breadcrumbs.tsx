import { CaretRight, DotsThree } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useNavigate } from "@/hooks/useNavigate";
import { type QuantaraRoute, useAppStore } from "@/store/app-store";

type NavEntry = {
  route: QuantaraRoute;
  context?: string;
};

const ROUTE_LABELS: Record<QuantaraRoute, string> = {
  accounting: "Contabilità",
  dashboard: "Panoramica",
  materials: "Materiali",
  "project-detail": "Dettaglio",
  projects: "Progetti",
  "sal-create": "Nuova SAL",
  settings: "Impostazioni",
  tariffs: "Tariffario",
  team: "Team",
};

const MAX_VISIBLE = 3;

type BreadcrumbEntry = {
  route: QuantaraRoute;
  label: string;
  isLast: boolean;
  index: number;
};

export function Breadcrumbs() {
  const { routeHistory, routeHistoryIndex } = useAppStore(
    useShallow((state) => ({
      routeHistory: state.routeHistory as NavEntry[],
      routeHistoryIndex: state.routeHistoryIndex,
    })),
  );
  const navigate = useNavigate();

  type DisplayCrumbs = {
    items: BreadcrumbEntry[];
    showOverflow: boolean;
  };

  const displayCrumbs: DisplayCrumbs = useMemo(() => {
    const all = routeHistory
      .slice(0, routeHistoryIndex + 1)
      .map((entry: NavEntry, index: number, arr: NavEntry[]) => ({
        route: entry.route,
        label: entry.context || ROUTE_LABELS[entry.route] || entry.route,
        isLast: index === arr.length - 1,
        index,
      }));

    if (all.length <= MAX_VISIBLE) {
      return { items: all, showOverflow: false };
    }

    return {
      items: [all[0], ...all.slice(-(MAX_VISIBLE - 1))].filter((x): x is BreadcrumbEntry => !!x),
      showOverflow: true,
    };
  }, [routeHistory, routeHistoryIndex]);

  if (displayCrumbs.items.length <= 1) return null;

  return (
    <nav aria-label="Navigazione" className="flex min-w-0 items-center gap-1">
      {displayCrumbs.items.map((crumb: BreadcrumbEntry) => (
        <div className="flex min-w-0 items-center gap-1" key={`${crumb.route}-${crumb.index}`}>
          {crumb.index > 0 && (
            <CaretRight
              className="shrink-0 text-[var(--text-secondary)]"
              size={10}
              weight="regular"
            />
          )}
          {crumb.isLast ? (
            <span className="truncate text-[11px] font-semibold text-[var(--text-primary)]">
              {crumb.label}
            </span>
          ) : (
            <motion.button
              className="shrink-0 truncate text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-primary)]"
              onClick={() => navigate(crumb.route)}
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
            >
              {crumb.label}
            </motion.button>
          )}
          {displayCrumbs.showOverflow && crumb === displayCrumbs.items[0] && (
            <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[var(--text-secondary)]">
              <CaretRight
                className="shrink-0 text-[var(--text-secondary)]"
                size={10}
                weight="regular"
              />
              <DotsThree size={14} weight="bold" />
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
