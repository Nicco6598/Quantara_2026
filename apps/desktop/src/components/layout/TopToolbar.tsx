import { CalendarDays, Download, Filter, Moon, Plus, Sun } from "lucide-react";
import { Button } from "@/components/shared/Button";
import type { ThemeMode } from "@/store/app-store";

type TopToolbarProps = {
  onToggleTheme: () => void;
  themeMode: ThemeMode;
};

export function TopToolbar({ onToggleTheme, themeMode }: TopToolbarProps) {
  const ThemeIcon = themeMode === "light" ? Moon : Sun;

  return (
    <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-subtle bg-topbar px-6 backdrop-blur">
      <div>
        <p className="text-sm font-medium text-secondary">Buongiorno, Marco</p>
        <h1 className="text-2xl font-semibold text-foreground">Panoramica generale del progetto</h1>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline">
          <CalendarDays data-icon="inline-start" />
          01 Mag 2024 - 31 Mag 2024
        </Button>
        <Button variant="outline">
          <Filter data-icon="inline-start" />
          Filtri
        </Button>
        <Button aria-label="Esporta" size="icon" variant="outline">
          <Download />
        </Button>
        <Button aria-label="Tema" onClick={onToggleTheme} size="icon" variant="outline">
          <ThemeIcon />
        </Button>
        <Button>
          <Plus data-icon="inline-start" />
          Nuova SAL
        </Button>
      </div>
    </header>
  );
}
