import {
  BarChart3,
  BookOpen,
  Box,
  ClipboardList,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import type { QuantaraRoute } from "@/store/app-store";
import { Button } from "@/components/shared/Button";
import { cn } from "@/lib/utils";

const navItems: readonly { icon: typeof LayoutDashboard; label: string; route: QuantaraRoute }[] = [
  { icon: LayoutDashboard, label: "Dashboard", route: "dashboard" },
  { icon: FolderKanban, label: "Progetti", route: "projects" },
  { icon: ClipboardList, label: "SAL", route: "sal" },
  { icon: BookOpen, label: "Tariffari", route: "tariffs" },
  { icon: Box, label: "Materiali", route: "materials" },
  { icon: BarChart3, label: "Contabilita", route: "accounting" },
];

type AppSidebarProps = {
  activeRoute: QuantaraRoute;
  onRouteChange: (route: QuantaraRoute) => void;
};

export function AppSidebar({ activeRoute, onRouteChange }: AppSidebarProps) {
  return (
    <aside className="flex h-screen w-[264px] shrink-0 flex-col border-r border-subtle bg-sidebar p-4">
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="size-8 rounded-md bg-primary" />
        <div>
          <div className="text-lg font-semibold leading-none text-foreground">Quantara</div>
          <div className="text-xs font-semibold tracking-wide text-secondary">RAIL WORKS</div>
        </div>
      </div>

      <div className="mt-6 rounded-md border border-subtle bg-surface p-3">
        <div className="h-16 rounded-md bg-muted" />
        <div className="mt-3 text-sm font-semibold text-foreground">Linea AV/AC Milano-Verona</div>
        <div className="text-xs text-secondary">Lotto 3A - Tratta Verona Est</div>
        <div className="mt-2 inline-flex rounded-sm bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
          In corso
        </div>
      </div>

      <nav className="mt-6 flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeRoute === item.route;

          return (
            <button
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-left text-sm font-semibold text-secondary transition-colors duration-fast ease-standard hover:bg-muted hover:text-foreground",
                isActive && "bg-sidebar-active text-sidebar-active-foreground",
              )}
              key={item.route}
              onClick={() => onRouteChange(item.route)}
              type="button"
            >
              <Icon data-icon="inline-start" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <div className="rounded-md border border-subtle bg-surface p-3">
          <div className="text-sm font-semibold text-foreground">Marco Bianchi</div>
          <div className="text-xs text-secondary">Project Manager</div>
        </div>
        <div className="flex gap-2">
          <Button aria-label="Documenti" size="icon" variant="secondary">
            <FileText />
          </Button>
          <Button aria-label="Impostazioni" size="icon" variant="secondary">
            <Settings />
          </Button>
        </div>
      </div>
    </aside>
  );
}
