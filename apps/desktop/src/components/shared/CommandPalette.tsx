import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Box,
  FileUp,
  FolderKanban,
  LayoutDashboard,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { QuantaraRoute } from "@/store/app-store";
import { useThemeState } from "@/store/app-store";

type PaletteCommand = {
  group: string;
  icon: LucideIcon;
  id: string;
  keywords: string;
  label: string;
  run: () => void;
};

type CommandPaletteProps = {
  anchorRect: DOMRect | null;
  isOpen: boolean;
  onClose: () => void;
  onPageAction: (actionId: string) => void;
  onRouteChange: (route: QuantaraRoute) => void;
};

const routeCommands: Array<{
  icon: LucideIcon;
  keywords: string;
  label: string;
  route: QuantaraRoute;
}> = [
  {
    icon: LayoutDashboard,
    keywords: "home overview kpi",
    label: "Vai a Dashboard",
    route: "dashboard",
  },
  {
    icon: FolderKanban,
    keywords: "contratti portfolio commesse",
    label: "Vai a Progetti",
    route: "projects",
  },
  { icon: BookOpen, keywords: "prezzi rfi voci", label: "Vai a Tariffari", route: "tariffs" },
  {
    icon: Box,
    keywords: "magazzino fornitori scorte",
    label: "Vai a Materiali",
    route: "materials",
  },
  {
    icon: BarChart3,
    keywords: "report economico budget",
    label: "Vai a Contabilita",
    route: "accounting",
  },
  { icon: Users, keywords: "risorse persone team", label: "Vai a Team", route: "team" },
  {
    icon: Settings,
    keywords: "preferenze sistema",
    label: "Vai a Impostazioni",
    route: "settings",
  },
];

export function CommandPalette({
  anchorRect,
  isOpen,
  onClose,
  onPageAction,
  onRouteChange,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { themeMode, toggleTheme } = useThemeState();

  const commands = useMemo<PaletteCommand[]>(
    () => [
      ...routeCommands.map((command) => ({
        ...command,
        group: "Navigazione",
        id: `route-${command.route}`,
        run: () => onRouteChange(command.route),
      })),
      {
        group: "Azioni",
        icon: Plus,
        id: "new-project",
        keywords: "crea contratto commessa",
        label: "Nuovo progetto",
        run: () => onPageAction("new-project"),
      },
      {
        group: "Azioni",
        icon: Plus,
        id: "new-sal",
        keywords: "crea stato avanzamento lavori",
        label: "Nuovo SAL",
        run: () => onPageAction("new-sal"),
      },
      {
        group: "Azioni",
        icon: FileUp,
        id: "import-tariff",
        keywords: "pdf rfi prezzi importazione",
        label: "Importa tariffario",
        run: () => onPageAction("import-tariff"),
      },
      {
        group: "Sistema",
        icon: themeMode === "light" ? Moon : Sun,
        id: "toggle-theme",
        keywords: "tema dark light chiaro scuro",
        label: themeMode === "light" ? "Attiva modo scuro" : "Attiva modo chiaro",
        run: toggleTheme,
      },
    ],
    [onPageAction, onRouteChange, themeMode, toggleTheme],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCommands = normalizedQuery
    ? commands.filter((command) =>
        `${command.label} ${command.group} ${command.keywords}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : commands;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setQuery("");
    setSelectedIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const selectedCommand = filteredCommands[selectedIndex];
  const popoverWidth = anchorRect?.width ?? 220;
  const resultsWidth = Math.min(420, window.innerWidth - 24);
  const popoverLeft = anchorRect?.left ?? Math.max(16, window.innerWidth - popoverWidth - 24);
  const resultsLeft = Math.max(
    12,
    Math.min(popoverLeft + popoverWidth - resultsWidth, window.innerWidth - resultsWidth - 12),
  );
  const popoverTop = anchorRect ? anchorRect.top : 72;
  const resultsTop = anchorRect ? anchorRect.height + 6 : 46;

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      <button
        aria-label="Chiudi command palette"
        className="absolute inset-0 cursor-default bg-transparent"
        onClick={onClose}
        type="button"
      />
      <section
        aria-label="Command palette"
        className="absolute"
        style={{
          left: popoverLeft,
          top: popoverTop,
          width: popoverWidth,
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setSelectedIndex((index) => Math.min(index + 1, filteredCommands.length - 1));
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setSelectedIndex((index) => Math.max(index - 1, 0));
          }

          if (event.key === "Enter" && selectedCommand) {
            selectedCommand.run();
            onClose();
          }
        }}
      >
        <div className="flex h-10 items-center gap-2 rounded-[18px] border border-primary bg-card pl-10 pr-2 text-sm text-foreground shadow-panel ring-2 ring-ring">
          <Search className="pointer-events-none absolute left-3 top-5 size-4 -translate-y-1/2 text-primary" />
          <input
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-secondary"
            placeholder="Cerca in Quantara..."
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIndex(0);
            }}
          />
          <kbd className="rounded-[10px] border border-subtle bg-muted px-2 py-1 text-xs font-semibold text-secondary">
            Esc
          </kbd>
        </div>
        <div
          className="fixed max-h-[420px] overflow-y-auto rounded-[18px] border border-subtle bg-card p-2 shadow-panel"
          style={{ left: resultsLeft, top: popoverTop + resultsTop, width: resultsWidth }}
        >
          {filteredCommands.length > 0 ? (
            filteredCommands.map((command, index) => {
              const Icon = command.icon;

              return (
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left",
                    index === selectedIndex
                      ? "bg-primary/10 text-foreground"
                      : "text-secondary hover:bg-muted",
                  )}
                  key={command.id}
                  onClick={() => {
                    command.run();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  type="button"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[14px] bg-muted text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">
                      {command.label}
                    </span>
                    <span className="block text-xs text-secondary">{command.group}</span>
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center text-sm text-secondary">
              Nessun comando trovato.
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
