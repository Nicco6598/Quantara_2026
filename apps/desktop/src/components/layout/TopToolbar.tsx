import {
  Bell,
  CalendarDays,
  ChevronDown,
  Download,
  Filter,
  HelpCircle,
  Moon,
  MoreVertical,
  Plus,
  Sun,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/shared/Button";
import type { QuantaraRoute, ThemeMode } from "@/store/app-store";

type TopToolbarProps = {
  activeRoute: QuantaraRoute;
  onToggleTheme: () => void;
  themeMode: ThemeMode;
};

const routeMeta: Record<QuantaraRoute, { subtitle: string; title: string }> = {
  accounting: {
    subtitle: "Ribassi, OS ed export",
    title: "Contabilita lavori",
  },
  dashboard: {
    subtitle: "Buongiorno, Marco",
    title: "Panoramica generale del progetto",
  },
  materials: {
    subtitle: "Materiali / Catalogo",
    title: "Gestione Materiali",
  },
  projects: {
    subtitle: "Buongiorno, Marco",
    title: "Centro di Controllo Progetti",
  },
  sal: {
    subtitle: "SAL",
    title: "Stati Avanzamento Lavori",
  },
  tariffs: {
    subtitle: "Tariffari / Tariffario Lombardia 2025",
    title: "Tariffario Lombardia 2025",
  },
};

export function TopToolbar({ activeRoute, onToggleTheme, themeMode }: TopToolbarProps) {
  const ThemeIcon = themeMode === "light" ? Moon : Sun;
  const meta = routeMeta[activeRoute];

  return (
    <header className="sticky top-0 z-10 flex min-h-20 items-center justify-between gap-5 border-b border-subtle bg-topbar px-6 py-3 backdrop-blur">
      <div className="min-w-0">
        <p className="text-sm font-medium text-secondary">{meta.subtitle}</p>
        <h1 className="truncate text-2xl font-semibold text-foreground">{meta.title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <RouteActions activeRoute={activeRoute} />
        <Button aria-label="Tema" onClick={onToggleTheme} size="icon" variant="outline">
          <ThemeIcon />
        </Button>
      </div>
    </header>
  );
}

type RouteActionsProps = {
  activeRoute: QuantaraRoute;
};

function RouteActions({ activeRoute }: RouteActionsProps) {
  if (activeRoute === "tariffs") {
    return (
      <>
        <Button variant="outline">
          Progetto attivo
          <ChevronDown data-icon="inline-start" />
        </Button>
        <Button variant="outline">
          <MoreVertical data-icon="inline-start" />
          Azioni
        </Button>
        <Button>
          <UploadCloud data-icon="inline-start" />
          Importa nuovo PDF
        </Button>
      </>
    );
  }

  if (activeRoute === "materials") {
    return (
      <>
        <Button variant="outline">
          Progetto attivo
          <ChevronDown data-icon="inline-start" />
        </Button>
        <Button variant="outline">
          <MoreVertical data-icon="inline-start" />
          Azioni
        </Button>
        <Button>
          <Plus data-icon="inline-start" />
          Nuovo materiale
        </Button>
        <Button aria-label="Aiuto" size="icon" variant="outline">
          <HelpCircle />
        </Button>
        <Button aria-label="Notifiche" size="icon" variant="outline">
          <Bell />
        </Button>
      </>
    );
  }

  if (activeRoute === "sal") {
    return (
      <>
        <DateRangeButton />
        <Button variant="outline">
          Azioni
          <ChevronDown data-icon="inline-start" />
        </Button>
        <Button>
          <Plus data-icon="inline-start" />
          Nuova SAL
        </Button>
      </>
    );
  }

  if (activeRoute === "accounting") {
    return (
      <>
        <DateRangeButton />
        <Button variant="outline">
          <Filter data-icon="inline-start" />
          Filtri
        </Button>
        <Button>
          <Download data-icon="inline-start" />
          Esporta
        </Button>
      </>
    );
  }

  return (
    <>
      <DateRangeButton />
      <Button variant="outline">
        <Filter data-icon="inline-start" />
        Filtri
      </Button>
      <Button aria-label="Esporta" size="icon" variant="outline">
        <Download />
      </Button>
      <Button>
        <Plus data-icon="inline-start" />
        Nuova SAL
      </Button>
    </>
  );
}

function DateRangeButton() {
  return (
    <Button variant="outline">
      <CalendarDays data-icon="inline-start" />
      01 Mag 2024 - 31 Mag 2024
    </Button>
  );
}
