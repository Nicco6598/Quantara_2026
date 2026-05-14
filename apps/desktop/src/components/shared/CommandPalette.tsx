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
import { useEffect, useMemo, useReducer, useRef } from "react";
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

type PaletteState = {
  query: string;
  selectedIndex: number;
  dataResults: DataResult[];
  isSearching: boolean;
};

type PaletteAction =
  | { type: "RESET" }
  | { type: "SET_QUERY"; query: string }
  | { type: "SET_SELECTED_INDEX"; index: number }
  | { type: "SET_DATA_RESULTS"; results: DataResult[] }
  | { type: "SET_SEARCHING"; searching: boolean };

function paletteReducer(state: PaletteState, action: PaletteAction): PaletteState {
  switch (action.type) {
    case "RESET":
      return { query: "", selectedIndex: 0, dataResults: [], isSearching: false };
    case "SET_QUERY":
      return { ...state, query: action.query };
    case "SET_SELECTED_INDEX":
      return { ...state, selectedIndex: action.index };
    case "SET_DATA_RESULTS":
      return { ...state, dataResults: action.results };
    case "SET_SEARCHING":
      return { ...state, isSearching: action.searching };
    default:
      return state;
  }
}

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

type UniformItem = ({ type: "command" } & PaletteCommand) | ({ type: "data" } & DataResult);

function PaletteInput({
  popoverLeft,
  popoverTop,
  popoverWidth,
  query,
  onQueryChange,
  inputRef,
}: {
  popoverLeft: number;
  popoverTop: number;
  popoverWidth: number;
  query: string;
  onQueryChange: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
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
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <kbd className="rounded-10px border border-subtle bg-muted px-2 py-1 text-xs font-semibold text-secondary">
        Esc
      </kbd>
    </div>
  );
}

function PaletteResultsRow({
  item,
  isSelected,
  onSelect,
  onMouseEnter,
}: {
  item: UniformItem;
  isSelected: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
}) {
  const Icon = item.icon;
  const desc = item.type === "data" ? item.description : item.group;
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left",
        isSelected ? "bg-primary/10 text-foreground" : "text-secondary hover:bg-muted",
      )}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      type="button"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-14px bg-muted text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{item.label}</span>
        <span className="block text-xs text-secondary">{desc}</span>
      </span>
    </button>
  );
}

function PaletteResults({
  items,
  safeIndex,
  onSelectItem,
  onHoverItem,
}: {
  items: UniformItem[];
  safeIndex: number;
  onSelectItem: (item: UniformItem) => void;
  onHoverItem: (index: number) => void;
}) {
  const groups = useMemo(() => {
    const g = new Map<string, UniformItem[]>();
    for (const item of items) {
      const list = g.get(item.group) ?? [];
      list.push(item);
      g.set(item.group, list);
    }
    return g;
  }, [items]);

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
      elements.push(
        <PaletteResultsRow
          isSelected={currentIndex === safeIndex}
          item={item}
          key={item.id}
          onMouseEnter={() => onHoverItem(currentIndex)}
          onSelect={() => onSelectItem(item)}
        />,
      );
    }
  }

  return <>{elements}</>;
}

export function CommandPalette({
  anchorRect,
  isOpen,
  onClose,
  onPageAction,
  onRouteChange,
}: CommandPaletteProps) {
  const [state, dispatch] = useReducer(paletteReducer, {
    query: "",
    selectedIndex: 0,
    dataResults: [],
    isSearching: false,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | undefined>(undefined);
  const queryRef = useRef(state.query);
  queryRef.current = state.query;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onRouteChangeRef = useRef(onRouteChange);
  onRouteChangeRef.current = onRouteChange;
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

  const normalizedQuery = state.query.trim().toLowerCase();

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
        ? state.dataResults.filter((item) =>
            `${item.label} ${item.description} ${item.group}`
              .toLowerCase()
              .includes(normalizedQuery),
          )
        : state.dataResults,
    [state.dataResults, normalizedQuery],
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
        onCloseRef.current();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    dispatch({ type: "RESET" });
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const q = state.query.trim();
    if (q.length < 2) {
      dispatch({ type: "SET_DATA_RESULTS", results: [] });
      dispatch({ type: "SET_SEARCHING", searching: false });
      return;
    }

    dispatch({ type: "SET_SEARCHING", searching: true });

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
          const title = c.title.toLowerCase();
          const code = (c.applicationContractCode ?? "").toLowerCase();
          if (title.includes(ql) || code.includes(ql)) {
            items.push({
              id: `contract-${c.id}`,
              group: "Progetti",
              label: c.title,
              description: c.applicationContractCode || "",
              icon: Building2,
              run: () => {
                onRouteChangeRef.current("projects");
                onCloseRef.current();
              },
            });
          }
        }

        for (const m of materialsRes.data) {
          const code = m.code.toLowerCase();
          const description = m.description.toLowerCase();
          const category = m.category.toLowerCase();
          if (code.includes(ql) || description.includes(ql) || category.includes(ql)) {
            items.push({
              id: `material-${m.id}`,
              group: "Materiali",
              label: m.code,
              description: m.description,
              icon: Package,
              run: () => {
                onRouteChangeRef.current("materials");
                onCloseRef.current();
              },
            });
          }
        }

        for (const t of tariffBooksRes.data) {
          const name = t.name.toLowerCase();
          const source = (t.sourceName ?? "").toLowerCase();
          if (name.includes(ql) || source.includes(ql)) {
            items.push({
              id: `tariff-${t.id}`,
              group: "Tariffari",
              label: t.name,
              description: t.sourceName || String(t.year || ""),
              icon: BookOpen,
              run: () => {
                onRouteChangeRef.current("tariffs");
                onCloseRef.current();
              },
            });
          }
        }

        const currentQuery2 = queryRef.current.trim().toLowerCase();
        if (currentQuery2 !== firedQuery.toLowerCase()) return;

        dispatch({ type: "SET_DATA_RESULTS", results: items });
        dispatch({ type: "SET_SEARCHING", searching: false });
      } catch {
        const currentQuery2 = queryRef.current.trim().toLowerCase();
        if (currentQuery2 !== firedQuery.toLowerCase()) return;
        dispatch({ type: "SET_SEARCHING", searching: false });
      }
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [state.query]);

  if (!isOpen) {
    return null;
  }

  const safeIndex = Math.min(state.selectedIndex, Math.max(0, allResults.length - 1));
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
      dispatch({
        type: "SET_SELECTED_INDEX",
        index: Math.min(state.selectedIndex + 1, allResults.length - 1),
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      dispatch({ type: "SET_SELECTED_INDEX", index: Math.max(state.selectedIndex - 1, 0) });
      return;
    }

    if (event.key === "Enter" && selectedResult) {
      event.preventDefault();
      selectedResult.run();
      onClose();
    }
  };

  const handleQueryChange = (value: string) => {
    dispatch({ type: "SET_QUERY", query: value });
    dispatch({ type: "SET_SELECTED_INDEX", index: 0 });
  };

  const renderItems = () => {
    const items: UniformItem[] = normalizedQuery
      ? (allResults as UniformItem[])
      : commands.map((c) => ({ ...c, type: "command" as const }));

    return (
      <PaletteResults
        items={items}
        safeIndex={safeIndex}
        onSelectItem={(item) => {
          item.run();
          onClose();
        }}
        onHoverItem={(index) => dispatch({ type: "SET_SELECTED_INDEX", index })}
      />
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] pointer-events-none" ref={paletteRef}>
      <section
        aria-label="Command palette"
        className="pointer-events-auto"
        onKeyDown={handleKeyDown}
      >
        <PaletteInput
          popoverLeft={popoverLeft}
          popoverTop={popoverTop}
          popoverWidth={popoverWidth}
          query={state.query}
          onQueryChange={handleQueryChange}
          inputRef={inputRef}
        />

        <div
          className="fixed max-h-[420px] overflow-y-auto rounded-18px border border-subtle bg-card p-2 shadow-panel"
          style={{ left: resultsLeft, top: popoverTop + resultsTop, width: resultsWidth }}
        >
          {state.isSearching ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-secondary">
              <span className="size-3 animate-spin rounded-full border-2 border-primary border-r-transparent" />
              Ricerca in corso…
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
