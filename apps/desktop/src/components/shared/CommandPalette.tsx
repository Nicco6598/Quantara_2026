import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Box,
  Building2,
  FileUp,
  FolderKanban,
  LayoutDashboard,
  Moon,
  Package,
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
import {
  listDesktopContracts,
  listDesktopMaterials,
  listDesktopTariffBooks,
} from "@/lib/desktopData";

type PaletteCommand = {
  group: string;
  icon: LucideIcon;
  id: string;
  keywords: string;
  label: string;
  run: () => void;
};

type DataResult = {
  id: string;
  group: string;
  label: string;
  description: string;
  icon: LucideIcon;
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
  const [dataResults, setDataResults] = useState<DataResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | undefined>(undefined);
  const queryRef = useRef(query);
  queryRef.current = query;
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

  const filteredCommands = useMemo(
    () =>
      normalizedQuery
        ? commands.filter((command) =>
            `${command.label} ${command.group} ${command.keywords}`
              .toLowerCase()
              .includes(normalizedQuery),
          )
        : commands,
    [commands, normalizedQuery],
  );

  const filteredData = useMemo(
    () =>
      normalizedQuery.length >= 2
        ? dataResults.filter((item) =>
            `${item.label} ${item.description} ${item.group}`
              .toLowerCase()
              .includes(normalizedQuery),
          )
        : dataResults,
    [dataResults, normalizedQuery],
  );

  const allResults = useMemo(() => {
    if (!normalizedQuery) return commands;
    return [
      ...filteredCommands.map((c) => ({ ...c, type: "command" as const })),
      ...filteredData.map((d) => ({ ...d, type: "data" as const })),
    ];
  }, [filteredCommands, filteredData, normalizedQuery, commands]);

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setSelectedIndex(0);
    setDataResults([]);
    setIsSearching(false);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const q = query.trim();
    if (q.length < 2) {
      setDataResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const firedQuery = q;

    debounceRef.current = window.setTimeout(async () => {
      try {
        const [contractsRes, materialsRes, tariffBooksRes] = await Promise.all([
          listDesktopContracts([]),
          listDesktopMaterials([]),
          listDesktopTariffBooks([]),
        ]);

        const currentQuery = queryRef.current.trim().toLowerCase();
        if (currentQuery !== firedQuery.toLowerCase()) return;

        const ql = firedQuery.toLowerCase();
        const items: DataResult[] = [];

        for (const c of contractsRes.data) {
          if (
            c.title.toLowerCase().includes(ql) ||
            c.applicationContractCode?.toLowerCase().includes(ql)
          ) {
            items.push({
              id: `contract-${c.id}`,
              group: "Progetti",
              label: c.title,
              description: c.applicationContractCode || "",
              icon: Building2,
              run: () => {
                onRouteChange("projects");
                onClose();
              },
            });
          }
        }

        for (const m of materialsRes.data) {
          if (
            m.code.toLowerCase().includes(ql) ||
            m.description.toLowerCase().includes(ql) ||
            m.category.toLowerCase().includes(ql)
          ) {
            items.push({
              id: `material-${m.id}`,
              group: "Materiali",
              label: m.code,
              description: m.description,
              icon: Package,
              run: () => {
                onRouteChange("materials");
                onClose();
              },
            });
          }
        }

        for (const t of tariffBooksRes.data) {
          if (t.name.toLowerCase().includes(ql) || t.sourceName?.toLowerCase().includes(ql)) {
            items.push({
              id: `tariff-${t.id}`,
              group: "Tariffari",
              label: t.name,
              description: t.sourceName || String(t.year || ""),
              icon: BookOpen,
              run: () => {
                onRouteChange("tariffs");
                onClose();
              },
            });
          }
        }

        const currentQuery2 = queryRef.current.trim().toLowerCase();
        if (currentQuery2 !== firedQuery.toLowerCase()) return;

        setDataResults(items);
        setIsSearching(false);
      } catch {
        const currentQuery2 = queryRef.current.trim().toLowerCase();
        if (currentQuery2 !== firedQuery.toLowerCase()) return;
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, onRouteChange, onClose]);

  if (!isOpen) {
    return null;
  }

  const safeIndex = Math.min(selectedIndex, Math.max(0, allResults.length - 1));
  const selectedResult = allResults[safeIndex];
  const popoverWidth = anchorRect?.width ?? 220;
  const resultsWidth = Math.min(480, window.innerWidth - 24);
  const popoverLeft = anchorRect?.left ?? Math.max(16, window.innerWidth - popoverWidth - 24);
  const resultsLeft = Math.max(
    12,
    Math.min(popoverLeft + popoverWidth - resultsWidth, window.innerWidth - resultsWidth - 12),
  );
  const popoverTop = anchorRect ? anchorRect.top : 72;
  const resultsTop = anchorRect ? anchorRect.height + 6 : 46;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((index) => Math.min(index + 1, allResults.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter" && selectedResult) {
      event.preventDefault();
      selectedResult.run();
      onClose();
    }
  };

  function renderItems() {
    type UniformItem = ({ type: "command" } & PaletteCommand) | ({ type: "data" } & DataResult);

    const items: UniformItem[] = normalizedQuery
      ? (allResults as UniformItem[])
      : commands.map((c) => ({ ...c, type: "command" as const }));

    const groups = new Map<string, UniformItem[]>();
    for (const item of items) {
      const g = groups.get(item.group) ?? [];
      g.push(item);
      groups.set(item.group, g);
    }

    let globalIndex = 0;
    const elements: React.ReactElement[] = [];

    for (const [groupName, groupItems] of groups) {
      elements.push(
        <div
          key={`header-${groupName}`}
          className="px-3 pb-1 pt-2 text-9px font-700 uppercase tracking-0_14em text-secondary"
        >
          {groupName}
        </div>,
      );

      for (const item of groupItems) {
        const currentIndex = globalIndex++;
        const Icon = item.icon;
        const desc = item.type === "data" ? item.description : item.group;

        elements.push(
          <button
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left",
              currentIndex === safeIndex
                ? "bg-primary/10 text-foreground"
                : "text-secondary hover:bg-muted",
            )}
            key={item.id}
            onClick={() => {
              (item as UniformItem).run();
              onClose();
            }}
            onMouseEnter={() => setSelectedIndex(currentIndex)}
            type="button"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-14px bg-muted text-primary">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">{item.label}</span>
              <span className="block text-xs text-secondary">{desc}</span>
            </span>
          </button>,
        );
      }
    }

    return elements;
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] pointer-events-none" ref={paletteRef}>
      <section
        aria-label="Command palette"
        className="pointer-events-auto"
        onKeyDown={handleKeyDown}
      >
        <div
          className="flex h-10 items-center gap-2 rounded-18px border border-primary bg-card pl-10 pr-2 text-sm text-foreground shadow-panel ring-2 ring-ring"
          style={{
            left: popoverLeft,
            top: popoverTop,
            width: popoverWidth,
            position: "absolute",
          }}
        >
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
          <kbd className="rounded-10px border border-subtle bg-muted px-2 py-1 text-xs font-semibold text-secondary">
            Esc
          </kbd>
        </div>

        <div
          className="fixed max-h-[420px] overflow-y-auto rounded-18px border border-subtle bg-card p-2 shadow-panel"
          style={{ left: resultsLeft, top: popoverTop + resultsTop, width: resultsWidth }}
        >
          {isSearching ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-secondary">
              <span className="size-3 animate-spin rounded-full border-2 border-primary border-r-transparent" />
              Ricerca in corso...
            </div>
          ) : allResults.length > 0 ? (
            renderItems()
          ) : normalizedQuery ? (
            <div className="px-4 py-8 text-center text-sm text-secondary">
              Nessun risultato trovato.
            </div>
          ) : (
            renderItems()
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
