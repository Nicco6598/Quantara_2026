import {
  Bell,
  Clock3,
  Download,
  Filter,
  Link2,
  MoreVertical,
  Package,
  Search,
  ShoppingCart,
  Star,
  TrendingUp,
  Truck,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

const materialRows = [
  [
    "BIN-60E1",
    "Binario tipo 60E1",
    "L=18,00 m",
    "Armamento",
    "m",
    "12.450 m",
    "8.750 m",
    "15.200 m",
    82,
    "Disponibile",
  ],
  [
    "TRV-B70",
    "Traversa in c.a. B70",
    "Tipo RS",
    "Armamento",
    "cad",
    "1.250 cad",
    "980 cad",
    "2.100 cad",
    60,
    "In esaurimento",
  ],
  [
    "CLP-FIX",
    "Sistema di fissaggio",
    "Vosloh 300-1",
    "Armamento",
    "set",
    "3.850 set",
    "2.150 set",
    "4.800 set",
    80,
    "Disponibile",
  ],
  [
    "BAL-A32",
    "Pietrisco ballast 32/50",
    "Cert. RFI",
    "Sottofondo",
    "t",
    "2.980 t",
    "2.400 t",
    "5.500 t",
    54,
    "Critico",
  ],
  [
    "CLS-R425",
    "Calcestruzzo R425",
    "C25/30 XC2",
    "Opere civili",
    "m3",
    "850 m3",
    "1.200 m3",
    "2.300 m3",
    37,
    "Critico",
  ],
  [
    "ACC-B450C",
    "Acciaio B450C",
    "Barre d=16 mm",
    "Opere civili",
    "t",
    "72,5 t",
    "45,2 t",
    "90,0 t",
    80,
    "Disponibile",
  ],
  [
    "CAV-FIBRA",
    "Cavo fibra ottica",
    "Monomodale 24F",
    "Impianti",
    "m",
    "4.200 m",
    "1.100 m",
    "3.600 m",
    116,
    "Disponibile",
  ],
  [
    "SIG-LED",
    "Segnale luminoso LED",
    "Tipo PL",
    "Impianti",
    "cad",
    "35 cad",
    "18 cad",
    "60 cad",
    58,
    "In esaurimento",
  ],
] as const;

export function MaterialsScreen() {
  return (
    <main className="p-6">
      <div className="grid grid-cols-[1fr_360px] gap-4">
        <div className="min-w-0">
          <div className="grid grid-cols-4 gap-4">
            <MetricCard
              icon={<Package />}
              label="Valore totale magazzino"
              note="+7,2% vs mese precedente"
              value="€ 18.750.000"
            />
            <MetricCard
              icon={<Bell />}
              label="Materiali critici"
              note="Richiedono attenzione"
              tone="warning"
              value="8"
            />
            <MetricCard
              icon={<Clock3 />}
              label="Materiali in esaurimento"
              note="Entro 30 giorni"
              tone="warning"
              value="12"
            />
            <MetricCard
              icon={<TrendingUp />}
              label="Livello di copertura medio"
              note="Fabbisogno nei prossimi 90gg"
              tone="success"
              value="78%"
            />
          </div>

          <section className="mt-4 rounded-md border border-subtle bg-card shadow-soft">
            <div className="flex gap-8 border-b border-subtle px-4">
              {["Tutti i materiali", "Critici", "In esaurimento", "Preferiti"].map((tab, index) => (
                <button
                  className={
                    index === 0
                      ? "border-b-2 border-primary py-4 text-sm font-semibold text-primary"
                      : "py-4 text-sm font-semibold text-secondary"
                  }
                  key={tab}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-[280px] items-center gap-2 rounded-md border border-subtle bg-surface px-3 text-sm text-secondary">
                  <Search className="size-4" />
                  Cerca materiale, codice o descrizione...
                </div>
                <Button variant="outline">Categoria: Tutte</Button>
                <Button variant="outline">Magazzino: Tutti</Button>
                <Button variant="outline">Stato: Tutti</Button>
                <Button variant="outline">
                  <Filter data-icon="inline-start" />
                  Filtri
                </Button>
              </div>
              <Button variant="outline">
                <Download data-icon="inline-start" />
                Esporta
              </Button>
            </div>
            <MaterialsTable />
          </section>
        </div>

        <MaterialInspector />
      </div>
    </main>
  );
}

type MetricCardProps = {
  icon: ReactNode;
  label: string;
  note: string;
  tone?: "success" | "warning";
  value: string;
};

function MetricCard({ icon, label, note, tone, value }: MetricCardProps) {
  return (
    <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-secondary">{label}</p>
          <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
          <p className={cn("mt-2 text-sm", tone === "warning" ? "text-primary" : "text-success")}>
            {note}
          </p>
        </div>
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-md",
            tone === "success"
              ? "bg-success-soft text-success"
              : tone === "warning"
                ? "bg-warning-soft text-warning"
                : "bg-info-soft text-info",
          )}
        >
          {icon}
        </span>
      </div>
    </section>
  );
}

function MaterialsTable() {
  return (
    <div className="overflow-hidden">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-muted text-[11px] font-semibold text-secondary">
          <tr>
            <th className="px-4 py-3" />
            <th className="px-4 py-3">Codice</th>
            <th className="px-4 py-3">Descrizione</th>
            <th className="px-4 py-3">Categoria</th>
            <th className="px-4 py-3">UM</th>
            <th className="px-4 py-3">Disponibile</th>
            <th className="px-4 py-3">Impegnato</th>
            <th className="px-4 py-3">Fabbisogno 90g</th>
            <th className="px-4 py-3">Copertura</th>
            <th className="px-4 py-3">Stato</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {materialRows.map((row) => (
            <tr className="border-t border-subtle hover:bg-table-row-hover" key={row[0]}>
              <td className="px-4 py-3 text-secondary">
                <Star className="size-4" />
              </td>
              <td className="px-4 py-3 font-semibold text-info underline">{row[0]}</td>
              <td className="px-4 py-3">
                <div className="font-semibold text-foreground">{row[1]}</div>
                <div className="text-xs text-secondary">{row[2]}</div>
              </td>
              <td className="px-4 py-3 text-secondary">{row[3]}</td>
              <td className="px-4 py-3 text-foreground">{row[4]}</td>
              <td className="px-4 py-3">
                <div className="font-semibold text-foreground">{row[5]}</div>
                <div className="text-xs font-semibold text-success">€ 4.980.000</div>
              </td>
              <td className="px-4 py-3 font-semibold text-foreground">{row[6]}</td>
              <td className="px-4 py-3 font-semibold text-foreground">{row[7]}</td>
              <td className="px-4 py-3">
                <CoverageRing percent={row[8]} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge
                  label={row[9]}
                  tone={
                    row[9] === "Critico"
                      ? "danger"
                      : row[9] === "In esaurimento"
                        ? "warning"
                        : "success"
                  }
                />
              </td>
              <td className="px-4 py-3 text-right">
                <MoreVertical className="inline size-4 text-secondary" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-subtle px-4 py-3 text-sm text-secondary">
        <span>Mostra 25 per pagina</span>
        <span>1-8 di 124</span>
      </div>
    </div>
  );
}

function MaterialInspector() {
  return (
    <aside className="rounded-md border border-subtle bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold text-foreground">BIN-60E1</h3>
            <Star className="size-4 text-secondary" />
            <Badge variant="success">Disponibile</Badge>
          </div>
          <div className="mt-5 flex items-center gap-4">
            <div className="size-20 rounded-md bg-muted" />
            <div>
              <div className="text-xl font-semibold text-foreground">Binario tipo 60E1</div>
              <div className="mt-1 text-sm text-secondary">Lunghezza standard 18,00 m</div>
              <div className="mt-3 flex gap-2">
                <Badge variant="neutral">Armamento</Badge>
                <Badge variant="neutral">Tracciato</Badge>
              </div>
            </div>
          </div>
        </div>
        <X className="size-4 text-secondary" />
      </div>

      <div className="mt-5 flex gap-6 border-b border-subtle text-sm font-semibold">
        {["Panoramica", "Movimenti", "Ordini", "Collegamenti", "Documenti"].map((tab, index) => (
          <button
            className={
              index === 0 ? "border-b-2 border-primary pb-3 text-primary" : "pb-3 text-secondary"
            }
            key={tab}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      <Panel title="Posizione e stock">
        <SummaryLine label="Magazzino principale" value="Verona" />
        <SummaryLine label="Ubicazione" value="Area A - Scaffale 12" />
        <SummaryLine label="Disponibile" value="12.450 m" />
        <SummaryLine label="Impegnato" value="8.750 m" />
        <SummaryLine label="Ordinato" value="4.000 m" />
        <SummaryLine label="Fabbisogno 90g" value="15.200 m" />
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-foreground">Livello di copertura</span>
            <span className="font-semibold text-success">82%</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-full w-[82%] rounded-full bg-success" />
          </div>
        </div>
      </Panel>

      <Panel title="Valore e costi">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <SummaryBlock label="Prezzo unitario" value="€ 399,50 / m" />
          <SummaryBlock label="Valore disponibile" value="€ 4.980.000" />
          <SummaryBlock label="Valore impegnato" value="€ 3.492.125" />
        </div>
        <SummaryBlock label="Valore totale" value="€ 8.472.125" />
      </Panel>

      <Panel title="Trend copertura">
        <div className="h-24 rounded-md bg-muted p-3">
          <div className="flex h-full items-end gap-2">
            {[90, 84, 82, 78, 64, 58, 49, 43, 35, 31].map((height) => (
              <div
                className="flex-1 rounded-sm bg-success"
                key={height}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Azioni rapide">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline">
            <Truck data-icon="inline-start" />
            Movimenta stock
          </Button>
          <Button variant="outline">
            <ShoppingCart data-icon="inline-start" />
            Crea ordine
          </Button>
          <Button variant="outline">
            <Package data-icon="inline-start" />
            Richiedi fornitura
          </Button>
          <Button variant="outline">
            <Link2 data-icon="inline-start" />
            Collega a voce
          </Button>
        </div>
      </Panel>
    </aside>
  );
}

type CoverageRingProps = {
  percent: number;
};

function CoverageRing({ percent }: CoverageRingProps) {
  const color =
    percent < 45
      ? "var(--danger-base)"
      : percent < 65
        ? "var(--warning-base)"
        : "var(--success-base)";

  return (
    <div
      className="grid size-12 place-items-center rounded-full"
      style={{ background: `conic-gradient(${color} ${percent * 3.6}deg, var(--bg-muted) 0deg)` }}
    >
      <span className="grid size-9 place-items-center rounded-full bg-card text-xs font-semibold text-foreground">
        {percent}%
      </span>
    </div>
  );
}

type PanelProps = {
  children: ReactNode;
  title: string;
};

function Panel({ children, title }: PanelProps) {
  return (
    <section className="mt-4 rounded-md border border-subtle bg-surface p-4">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="mt-3">{children}</div>
    </section>
  );
}

type SummaryLineProps = {
  label: string;
  value: string;
};

function SummaryLine({ label, value }: SummaryLineProps) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-secondary">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function SummaryBlock({ label, value }: SummaryLineProps) {
  return (
    <div className="py-2 text-sm">
      <div className="text-xs text-secondary">{label}</div>
      <div className="mt-1 font-semibold text-foreground">{value}</div>
    </div>
  );
}
