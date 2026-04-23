import {
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  Download,
  Home,
  List,
  Map as MapIcon,
  MoreVertical,
  Plus,
  Search,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";
import { eur } from "@quantara/domain-utils";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { StatusBadge, type StatusTone } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/formatters";

const attentionCards = [
  {
    detail: "+ € 2.890.300 (+12,4%)",
    icon: AlertTriangle,
    title: "Linea AV Napoli-Bari",
    trace: "Sforamento budget previsto",
  },
  {
    detail: "+ 18 giorni",
    icon: BriefcaseBusiness,
    title: "Nodo di Firenze AV",
    trace: "Ritardo fine prevista",
  },
  {
    detail: "Prevista emissione tra 7 giorni",
    icon: ShoppingCart,
    title: "Linea AV Genova-Ventimiglia",
    trace: "SAL in ritardo",
  },
] as const;

const projectControlRows = [
  {
    budget: eur(26150000),
    delta: "+5,3%",
    end: "12 Set 2025",
    health: "BUONO",
    progress: 43,
    sal: "8 / 12",
    salAmount: eur(2156800),
    status: "In linea",
    tone: "success",
    title: "Linea AV/AC Milano-Verona",
    trace: "Lotto 3A - Tratta Verona Est",
  },
  {
    budget: eur(18420000),
    delta: "+8,7%",
    end: "18 Nov 2025",
    health: "ATTENZIONE",
    progress: 68,
    sal: "6 / 10",
    salAmount: eur(1985600),
    status: "Attenzione",
    tone: "warning",
    title: "Nodo di Firenze AV",
    trace: "Lotto 2B - Galleria Belvedere",
  },
  {
    budget: eur(32780000),
    delta: "+12,4%",
    end: "07 Ott 2025",
    health: "CRITICO",
    progress: 72,
    sal: "7 / 11",
    salAmount: eur(2890300),
    status: "Fuori controllo",
    tone: "danger",
    title: "Linea AV Napoli-Bari",
    trace: "Lotto 1C - Tratta Orsara",
  },
  {
    budget: eur(9850000),
    delta: "-2,1%",
    end: "14 Gen 2026",
    health: "BUONO",
    progress: 25,
    sal: "3 / 8",
    salAmount: eur(842200),
    status: "In linea",
    tone: "success",
    title: "Linea AV Genova-Ventimiglia",
    trace: "Lotto Unico - Tratta Finale",
  },
  {
    budget: eur(4250000),
    delta: "-1,3%",
    end: "30 Giu 2025",
    health: "IN LINEA",
    progress: 15,
    sal: "2 / 6",
    salAmount: eur(210500),
    status: "Monitoraggio",
    tone: "info",
    title: "Manutenzione Rete Nord",
    trace: "Programma 2024",
  },
] as const;

const recentSalRows = [
  { amount: eur(2156800), date: "20/05/2024", label: "SAL 8 - Milano-Verona" },
  { amount: eur(1785600), date: "18/05/2024", label: "SAL 6 - Nodo di Firenze" },
  { amount: eur(842200), date: "16/05/2024", label: "SAL 3 - Genova-Ventimiglia" },
  { amount: eur(1950300), date: "15/05/2024", label: "SAL 7 - Napoli-Bari" },
] as const;

export function ProjectsScreen() {
  return (
    <main className="p-6">
      <div className="mb-5 grid grid-cols-4 overflow-hidden rounded-md bg-primary text-white shadow-soft">
        <QuickAction icon={<BriefcaseBusiness />} label="Nuova SAL" />
        <QuickAction icon={<Plus />} label="Nuovo Progetto" />
        <QuickAction icon={<Download />} label="Carica Documenti" />
        <QuickAction icon={<ShoppingCart />} label="Richiesta Materiale" />
      </div>

      <div className="grid grid-cols-[1fr_330px] gap-4">
        <div className="min-w-0">
          <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  Progetti che richiedono attenzione
                </h3>
                <Badge variant="danger">3</Badge>
              </div>
              <button className="text-sm font-semibold text-primary" type="button">
                Vedi tutti
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {attentionCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div className="rounded-md border border-subtle bg-surface p-4" key={card.title}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex size-11 items-center justify-center rounded-md bg-danger-soft text-danger">
                        <Icon className="size-5" />
                      </div>
                      <span className="text-xl text-secondary">›</span>
                    </div>
                    <div className="mt-3 text-sm font-semibold text-foreground">{card.title}</div>
                    <div className="mt-1 text-xs font-medium text-foreground">{card.trace}</div>
                    <div className="mt-3 text-xs font-semibold text-primary">{card.detail}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-4 rounded-md border border-subtle bg-card shadow-soft">
            <div className="flex items-center justify-between gap-4 border-b border-subtle p-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">Tutti i progetti</h3>
                <Badge variant="neutral">12</Badge>
              </div>
              <div className="flex items-center gap-3">
                <SegmentedControl />
                <Button size="sm" variant="outline">
                  Ordina per
                  <span className="font-semibold text-foreground">Stato</span>
                </Button>
                <div className="flex h-9 w-[210px] items-center gap-2 rounded-md border border-subtle bg-surface px-3 text-xs text-secondary">
                  <Search className="size-4" />
                  Cerca progetto...
                </div>
              </div>
            </div>
            <ProjectTable />
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <OverviewPanel />
          <RecentSalPanel />
          <ActivityPanel />
        </aside>
      </div>
    </main>
  );
}

type QuickActionProps = {
  icon: ReactNode;
  label: string;
};

function QuickAction({ icon, label }: QuickActionProps) {
  return (
    <button
      className="flex h-16 min-w-[150px] items-center gap-3 border-r border-white/20 px-4 text-left last:border-r-0 hover:bg-primary-hover"
      type="button"
    >
      <span className="flex size-9 items-center justify-center rounded-md bg-white/15 text-white">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-white">{label}</span>
        <span className="block text-xs text-white/75">Azione rapida</span>
      </span>
    </button>
  );
}

function SegmentedControl() {
  return (
    <div className="flex h-9 rounded-md border border-subtle bg-muted p-1 text-xs font-semibold">
      <button
        className="flex items-center gap-2 rounded-sm bg-surface px-3 text-foreground shadow-soft"
        type="button"
      >
        <List className="size-4" />
        Lista
      </button>
      <button className="flex items-center gap-2 rounded-sm px-3 text-secondary" type="button">
        <MapIcon className="size-4" />
        Mappa
      </button>
    </div>
  );
}

function ProjectTable() {
  return (
    <div className="overflow-hidden">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-muted text-[11px] font-semibold uppercase text-secondary">
          <tr>
            <th className="px-4 py-3">Progetto</th>
            <th className="px-4 py-3">Avanzamento</th>
            <th className="px-4 py-3">Budget (EAC)</th>
            <th className="px-4 py-3">Forecast fine</th>
            <th className="px-4 py-3">SAL corrente</th>
            <th className="px-4 py-3">Health</th>
            <th className="px-4 py-3">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {projectControlRows.map((row) => (
            <tr className="border-t border-subtle hover:bg-table-row-hover" key={row.title}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="size-16 rounded-md bg-muted" />
                  <div>
                    <div className="font-semibold text-foreground">{row.title}</div>
                    <div className="text-xs text-secondary">{row.trace}</div>
                    <StatusBadge label={row.status} tone={row.tone as StatusTone} />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <ProgressRing percent={row.progress} tone={row.tone} />
              </td>
              <td className="px-4 py-3">
                <div className="font-semibold text-foreground">{formatMoney(row.budget)}</div>
                <div
                  className={cn(
                    "mt-1 text-xs font-semibold",
                    row.delta.startsWith("+") ? "text-primary" : "text-success",
                  )}
                >
                  vs Budget {row.delta}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="font-semibold text-foreground">{row.end}</div>
                <div className="mt-1 text-xs text-primary">+12 giorni</div>
              </td>
              <td className="px-4 py-3">
                <div className="font-semibold text-foreground">{row.sal}</div>
                <div className="mt-1 text-xs text-secondary">Importo SAL</div>
                <div className="text-xs font-semibold text-foreground">
                  {formatMoney(row.salAmount)}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className={cn("font-semibold", toneClass(row.tone))}>
                  <TrendingUp className="mr-2 inline size-4" />
                  {row.health}
                </div>
                <div className="mt-1 text-xs text-secondary">Indicatori aggiornati</div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("navigate", { detail: "project-detail" }),
                      )
                    }
                  >
                    Apri progetto
                  </Button>
                  <Button aria-label="Azioni progetto" size="icon" variant="ghost">
                    <MoreVertical />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-subtle px-4 py-3 text-sm text-secondary">
        <span>Mostra 10 per pagina</span>
        <span>1-5 di 12</span>
      </div>
    </div>
  );
}

function OverviewPanel() {
  return (
    <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
      <h3 className="text-base font-semibold text-foreground">Panoramica globale</h3>
      <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
        <SideMetric label="Progetti totali" value="12" />
        <SideMetric label="Budget totale (EAC)" value="€ 91.450.000" />
        <SideMetric label="SAL totale emesse" value="€ 8.085.400" />
        <SideMetric label="Avanzamento medio" value="44,6%" variant="success" />
        <SideMetric label="Progetti in linea" value="6" variant="success" />
        <SideMetric label="Progetti a rischio" value="4" variant="warning" />
        <SideMetric label="Progetti critici" value="2" variant="danger" />
      </dl>
    </section>
  );
}

function RecentSalPanel() {
  return (
    <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Ultime SAL approvate</h3>
        <button className="text-xs font-semibold text-primary" type="button">
          Vedi tutte
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {recentSalRows.map((row) => (
          <div className="flex items-center justify-between gap-3" key={row.label}>
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-md bg-info-soft text-info">
                <Home className="size-4" />
              </span>
              <div>
                <div className="text-sm font-semibold text-foreground">{row.label}</div>
                <div className="text-xs text-secondary">Approvata da D. Verdi</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-secondary">{row.date}</div>
              <div className="text-xs font-semibold text-success">{formatMoney(row.amount)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivityPanel() {
  const rows = [
    "Nuova SAL 8 - Milano-Verona creata",
    "Materiale critico segnalato - Binari 60E1",
    "Voce di lavoro aggiornata - Scavo trincea",
  ];

  return (
    <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Attivita recenti</h3>
        <button className="text-xs font-semibold text-primary" type="button">
          Vedi tutte
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {rows.map((row) => (
          <div className="flex items-center gap-3" key={row}>
            <Bell className="size-4 text-secondary" />
            <div>
              <div className="text-sm font-semibold text-foreground">{row}</div>
              <div className="text-xs text-secondary">Marco Bianchi · 21/05/2024</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

type SideMetricProps = {
  label: string;
  value: string;
  variant?: "danger" | "success" | "warning";
};

function SideMetric({ label, value, variant }: SideMetricProps) {
  return (
    <div>
      <dt className="text-xs text-secondary">{label}</dt>
      <dd
        className={cn("mt-1 text-lg font-semibold text-foreground", variant && toneClass(variant))}
      >
        {value}
      </dd>
    </div>
  );
}

type ProgressRingProps = {
  percent: number;
  tone: string;
};

function ProgressRing({ percent, tone }: ProgressRingProps) {
  const color =
    tone === "danger"
      ? "var(--danger-base)"
      : tone === "warning"
        ? "var(--warning-base)"
        : "var(--success-base)";

  return (
    <div
      className="grid size-16 place-items-center rounded-full"
      style={{ background: `conic-gradient(${color} ${percent * 3.6}deg, var(--bg-muted) 0deg)` }}
    >
      <div className="grid size-12 place-items-center rounded-full bg-card text-center">
        <span className="text-sm font-semibold text-foreground">{percent}%</span>
        <span className="-mt-2 text-[9px] text-secondary">fisico</span>
      </div>
    </div>
  );
}

function toneClass(tone: string): string {
  if (tone === "danger") {
    return "text-danger";
  }
  if (tone === "warning") {
    return "text-warning";
  }
  if (tone === "info") {
    return "text-info";
  }
  return "text-success";
}
