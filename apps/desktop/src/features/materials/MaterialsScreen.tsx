import {
  AlertTriangle,
  Bell,
  Box,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  type LucideIcon,
  MoreVertical,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  Warehouse,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MaterialTone = "danger" | "success" | "warning";

type MaterialRow = {
  available: string;
  availableHint: string;
  category: string;
  code: string;
  committed: string;
  coverage: number;
  demand: string;
  description: string;
  iconTone: "blue" | "green" | "red";
  status: string;
  tone: MaterialTone;
  unit: string;
};

export const materialRows: MaterialRow[] = [
  {
    available: "12.450 m",
    availableHint: "Disponibile",
    category: "Armamento",
    code: "BIN-60E1",
    committed: "8.750 m",
    coverage: 82,
    demand: "15.200 m",
    description: "Binario tipo 60E1",
    iconTone: "blue",
    status: "Disponibile",
    tone: "success",
    unit: "m",
  },
  {
    available: "1.250 cad",
    availableHint: "Critico",
    category: "Armamento",
    code: "TRV-B70",
    committed: "980 cad",
    coverage: 60,
    demand: "2.100 cad",
    description: "Traversa in c.a. B70",
    iconTone: "red",
    status: "In esaurimento",
    tone: "warning",
    unit: "cad",
  },
  {
    available: "2.980 t",
    availableHint: "Disponibile",
    category: "Sottofondo",
    code: "BAL-A32",
    committed: "2.400 t",
    coverage: 54,
    demand: "5.500 t",
    description: "Pietrisco ballast 32/50",
    iconTone: "blue",
    status: "Critico",
    tone: "danger",
    unit: "t",
  },
  {
    available: "850 m3",
    availableHint: "Basso",
    category: "Opere civili",
    code: "CLS-R425",
    committed: "1.200 m3",
    coverage: 37,
    demand: "2.300 m3",
    description: "Calcestruzzo R425",
    iconTone: "blue",
    status: "Critico",
    tone: "danger",
    unit: "m3",
  },
  {
    available: "4.200 m",
    availableHint: "Disponibile",
    category: "Impianti",
    code: "CAV-FIBRA",
    committed: "1.100 m",
    coverage: 116,
    demand: "3.600 m",
    description: "Cavo fibra ottica",
    iconTone: "green",
    status: "Disponibile",
    tone: "success",
    unit: "m",
  },
  {
    available: "6.150 set",
    availableHint: "Disponibile",
    category: "Opere civili",
    code: "ACC-PALF",
    committed: "3.200 set",
    coverage: 154,
    demand: "4.000 set",
    description: "Accessori pali fondazione",
    iconTone: "blue",
    status: "Disponibile",
    tone: "success",
    unit: "set",
  },
  {
    available: "1.780 set",
    availableHint: "Basso",
    category: "Impianti",
    code: "TUB-PEHD",
    committed: "1.600 m",
    coverage: 56,
    demand: "3.200 m",
    description: "Tubo PEHD corrugato",
    iconTone: "blue",
    status: "In esaurimento",
    tone: "warning",
    unit: "m",
  },
  {
    available: "3.410 t",
    availableHint: "Disponibile",
    category: "Opere civili",
    code: "FER-B450C",
    committed: "1.900 t",
    coverage: 98,
    demand: "2.800 t",
    description: "Ferro tondo B450C",
    iconTone: "green",
    status: "Disponibile",
    tone: "success",
    unit: "t",
  },
];

const selectedMaterial = materialRows[0] as MaterialRow;

export function MaterialsScreen() {
  return (
    <div className="space-y-4 pt-4">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <h2 className="text-[26px] font-bold leading-[1.08] tracking-[-0.02em] text-[var(--text-primary)] 2xl:text-[32px]">
            Materiali e coperture
          </h2>
          <p className="mt-2 max-w-3xl text-[14px] font-medium leading-6 text-[var(--text-secondary)] 2xl:text-[15px]">
            Controllo operativo di stock, impegni, fabbisogno e rischio di fornitura.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              caption="Stock disponibile"
              delta="+ 4,2% vs 20 apr"
              icon={Box}
              label="Valore magazzino"
              tone="blue"
              value="€ 18,75M"
            />
            <MetricCard
              caption="Fuori soglia minima"
              delta="+ 2 vs 20 apr"
              icon={AlertTriangle}
              label="Critici"
              tone="danger"
              value="8"
            />
            <MetricCard
              caption="Entro 30 giorni"
              delta="+ 3 vs 20 apr"
              icon={Bell}
              label="In esaurimento"
              tone="warning"
              value="12"
            />
            <MetricCard
              caption="Fabbisogno 90 giorni"
              delta="+ 6% vs 20 apr"
              icon={ShieldCheck}
              label="Copertura media"
              tone="success"
              value="78%"
            />
          </div>
        </div>

        <Panel className="self-start p-4">
          <div className="flex items-center justify-between">
            <PanelTitle>Alert supply</PanelTitle>
            <span className="rounded-md bg-[var(--danger-soft)] px-2 py-1 text-[11px] font-bold text-[var(--danger-base)]">
              2 critici
            </span>
          </div>
          <div className="mt-3 divide-y divide-[var(--border-subtle)]">
            <AlertRow
              description="Rischio di fermo cantiere"
              label="2 materiali critici su opere civili"
              tone="danger"
            />
            <AlertRow
              description="Verifica in corso con il fornitore"
              label="1 fornitura in conferma consegna"
              tone="warning"
            />
          </div>
          <button
            className="mt-3 flex w-full items-center justify-between text-[12px] font-semibold text-[var(--info-base)]"
            type="button"
          >
            Vedi tutti gli alert
            <ChevronRight className="size-3.5" />
          </button>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="min-w-0 p-0">
          <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] p-3 lg:p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {["Tutti", "Critici", "In esaurimento", "Strategici"].map((tab, index) => (
                <button
                  className={cn(
                    "h-8 rounded-full px-3 text-[12px] font-semibold transition-colors 2xl:h-9 2xl:px-4 2xl:text-[13px]",
                    index === 0
                      ? "bg-[var(--accent-primary)] text-[var(--text-inverse)] shadow-sm"
                      : "bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]",
                  )}
                  key={tab}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(180px,1fr)_auto_auto] xl:flex xl:flex-wrap xl:items-center">
              <label className="relative min-w-0">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] pl-10 pr-3 text-[13px] font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                  placeholder="Cerca nella tabella..."
                  type="search"
                />
              </label>
              <ToolbarButton icon={Filter}>Filtri</ToolbarButton>
              <ToolbarButton icon={Download}>Esporta</ToolbarButton>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-[12px]">
              <thead className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="px-3 py-2 text-[10px]">Materiale</th>
                  <th className="px-3 py-2 text-[10px]">Categoria</th>
                  <th className="px-3 py-2 text-[10px]">Disp.</th>
                  <th className="px-3 py-2 text-[10px]">Impegn.</th>
                  <th className="px-3 py-2 text-[10px]">Fabbis.</th>
                  <th className="px-3 py-2 text-[10px]">Cop.</th>
                  <th className="px-3 py-2 text-[10px]">Stato</th>
                  <th className="w-8 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {materialRows.map((row, index) => (
                  <MaterialTableRow isSelected={index === 0} key={row.code} row={row} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-3 py-2">
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
              Vista 1-8 di 24 materiali
            </span>
            <button
              className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)]"
              type="button"
            >
              Mostra <span className="font-semibold text-[var(--text-primary)]">25</span> per pagina
              <ChevronDown className="size-3.5" />
            </button>
          </div>
        </Panel>

        <aside className="space-y-4">
          <Panel>
            <div className="flex items-center justify-between">
              <PanelTitle>Focus materiale</PanelTitle>
              <button
                aria-label="Chiudi focus materiale"
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 rounded-[14px] border border-[var(--border-subtle)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <MaterialIcon tone="blue" />
                  <div className="min-w-0">
                    <div className="truncate text-[16px] font-bold text-[var(--text-primary)]">
                      {selectedMaterial.code}
                    </div>
                    <div className="mt-1 truncate text-[12px] font-medium text-[var(--text-secondary)]">
                      {selectedMaterial.description}
                    </div>
                  </div>
                </div>
                <StatusPill tone="success">Disponibile</StatusPill>
              </div>

              <dl className="mt-5 divide-y divide-[var(--border-subtle)]">
                <DetailLine
                  label="Categoria"
                  value={`${selectedMaterial.category} · ${selectedMaterial.unit}`}
                />
                <DetailLine label="Disponibile" value={selectedMaterial.available} />
                <DetailLine label="Impegnato" value={selectedMaterial.committed} />
                <DetailLine label="Fabbisogno 90g" value={selectedMaterial.demand} />
              </dl>

              <button
                className="mt-4 flex w-full items-center justify-end border-t border-[var(--border-subtle)] pt-3 text-[var(--text-secondary)]"
                type="button"
              >
                <ChevronRight className="size-4" />
              </button>

              <div className="mt-3">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-medium text-[var(--text-secondary)]">Copertura</span>
                  <span className="text-[13px] font-bold text-[var(--text-primary)]">
                    {selectedMaterial.coverage}%
                  </span>
                </div>
                <CoverageBar coverage={selectedMaterial.coverage} tone={selectedMaterial.tone} />
              </div>
            </div>

            <button
              className="mt-3 flex w-full items-center justify-between text-[12px] font-semibold text-[var(--info-base)]"
              type="button"
            >
              Vedi storico e movimenti
              <ChevronRight className="size-3.5" />
            </button>
          </Panel>

          <Panel>
            <PanelTitle>Azioni rapide</PanelTitle>
            <div className="mt-4 grid gap-2">
              <ActionButton icon={Warehouse}>Movimenta stock</ActionButton>
              <ActionButton icon={Bell}>Apri alert fornitura</ActionButton>
              <button
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 text-[13px] font-semibold text-[var(--text-inverse)] transition-colors hover:bg-[var(--accent-primary-hover)]"
                type="button"
              >
                <ShoppingCart className="size-4" />
                Crea ordine materiale
              </button>
            </div>
          </Panel>
        </aside>
      </section>
    </div>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 shadow-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}

function PanelTitle({ children }: { children: string }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
      {children}
    </div>
  );
}

function MetricCard({
  caption,
  delta,
  icon: Icon,
  label,
  tone,
  value,
}: {
  caption: string;
  delta: string;
  icon: LucideIcon;
  label: string;
  tone: "blue" | MaterialTone;
  value: string;
}) {
  return (
    <section className="flex min-h-[112px] items-center gap-3 rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 shadow-sm 2xl:min-h-[128px] 2xl:gap-4">
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full 2xl:size-12",
          tone === "blue" && "bg-[var(--info-soft)] text-[var(--info-base)]",
          tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger-base)]",
          tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
          tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
        )}
      >
        <Icon className="size-5 2xl:size-6" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
          {label}
        </div>
        <div
          className={cn(
            "mt-2 text-[20px] font-bold leading-none 2xl:text-[22px]",
            tone === "blue" && "text-[var(--info-base)]",
            tone === "danger" && "text-[var(--danger-base)]",
            tone === "warning" && "text-[var(--warning-base)]",
            tone === "success" && "text-[var(--success-base)]",
          )}
        >
          {value}
        </div>
        <div className="mt-2 text-[12px] font-medium text-[var(--text-secondary)]">{caption}</div>
        <div
          className={cn(
            "mt-3 text-[11px] font-bold",
            tone === "danger" ? "text-[var(--danger-base)]" : "text-[var(--success-base)]",
          )}
        >
          {delta}
        </div>
      </div>
    </section>
  );
}

function AlertRow({
  description,
  label,
  tone,
}: {
  description: string;
  label: string;
  tone: "danger" | "warning";
}) {
  return (
    <div className="flex items-center gap-3 py-4">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          tone === "danger"
            ? "bg-[var(--danger-soft)] text-[var(--danger-base)]"
            : "bg-[var(--warning-soft)] text-[var(--warning-base)]",
        )}
      >
        <AlertTriangle className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{label}</div>
        <div className="mt-1 truncate text-[12px] font-medium text-[var(--text-secondary)]">
          {description}
        </div>
      </div>
      <StatusPill tone={tone}>{tone === "danger" ? "Critico" : "Warning"}</StatusPill>
    </div>
  );
}

function ToolbarButton({ children, icon: Icon }: { children: string; icon: LucideIcon }) {
  return (
    <button
      className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)]"
      type="button"
    >
      <Icon className="size-4 text-[var(--text-secondary)]" />
      {children}
    </button>
  );
}

function MaterialTableRow({ isSelected, row }: { isSelected: boolean; row: MaterialRow }) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--border-subtle)] text-[13px] transition-colors hover:bg-[var(--bg-muted)]",
        isSelected && "bg-[var(--info-soft)]/45",
      )}
    >
      <td className="px-3 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <MaterialIcon tone={row.iconTone} />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
              {row.code}
            </div>
            <div className="mt-1 truncate text-[12px] font-medium text-[var(--text-secondary)]">
              {row.description}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-2 text-[12px] font-medium text-[var(--text-primary)]">
        {row.category} · {row.unit}
      </td>
      <td className="px-3 py-2">
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">{row.available}</div>
        <div
          className={cn(
            "mt-1 text-[11px] font-bold",
            row.availableHint === "Basso" || row.availableHint === "Critico"
              ? "text-[var(--danger-base)]"
              : "text-[var(--success-base)]",
          )}
        >
          {row.availableHint}
        </div>
      </td>
      <td className="px-3 py-2 text-[12px] font-medium text-[var(--text-primary)]">
        {row.committed}
      </td>
      <td className="px-3 py-2 text-[12px] font-medium text-[var(--text-primary)]">{row.demand}</td>
      <td className="px-3 py-2">
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">{row.coverage}%</div>
        <CoverageBar coverage={row.coverage} tone={row.tone} />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 rounded-full",
              row.tone === "success" && "bg-[var(--success-base)]",
              row.tone === "warning" && "bg-[var(--warning-base)]",
              row.tone === "danger" && "bg-[var(--danger-base)]",
            )}
          />
          <span
            className={cn(
              "text-[12px] font-semibold",
              row.tone === "success" && "text-[var(--success-base)]",
              row.tone === "warning" && "text-[var(--warning-base)]",
              row.tone === "danger" && "text-[var(--danger-base)]",
            )}
          >
            {row.status}
          </span>
        </div>
      </td>
      <td className="px-2 py-2 text-right text-[var(--text-secondary)]">
        <MoreVertical className="ml-auto size-4" />
      </td>
    </tr>
  );
}

function MaterialIcon({ tone }: { tone: MaterialRow["iconTone"] }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg",
        tone === "blue" && "bg-[var(--info-soft)] text-[var(--info-base)]",
        tone === "green" && "bg-[var(--success-soft)] text-[var(--success-base)]",
        tone === "red" && "bg-[var(--danger-soft)] text-[var(--danger-base)]",
      )}
    >
      {tone === "red" ? <AlertTriangle className="size-5" /> : <Package className="size-5" />}
    </span>
  );
}

function CoverageBar({ coverage, tone }: { coverage: number; tone: MaterialTone }) {
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--bg-muted-strong)]">
      <div
        className={cn(
          "h-full rounded-full",
          tone === "success" && "bg-[var(--success-base)]",
          tone === "warning" && "bg-[var(--warning-base)]",
          tone === "danger" && "bg-[var(--danger-base)]",
        )}
        style={{ width: `${Math.min(coverage, 100)}%` }}
      />
    </div>
  );
}

function StatusPill({ children, tone }: { children: string; tone: MaterialTone }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-bold",
        tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
        tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
        tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger-base)]",
      )}
    >
      {children}
    </span>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-[13px] font-medium text-[var(--text-secondary)]">{label}</dt>
      <dd className="text-right text-[13px] font-bold text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}

function ActionButton({ children, icon: Icon }: { children: string; icon: LucideIcon }) {
  return (
    <button
      className="flex h-11 items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)]"
      type="button"
    >
      <Icon className="size-4 text-[var(--text-secondary)]" />
      {children}
    </button>
  );
}
