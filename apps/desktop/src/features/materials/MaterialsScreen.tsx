import { Bell, Download, Filter, Package, Search, Truck } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { ScreenShell } from "@/components/shared/Screen";
import { StatusBadge } from "@/components/shared/StatusBadge";

const materialRows = [
  {
    available: "12.450 m",
    category: "Armamento",
    code: "BIN-60E1",
    committed: "8.750 m",
    coverage: 82,
    demand: "15.200 m",
    description: "Binario tipo 60E1",
    risk: "Delivery in conferma",
    status: "Disponibile",
    tone: "success" as const,
    unit: "m",
  },
  {
    available: "1.250 cad",
    category: "Armamento",
    code: "TRV-B70",
    committed: "980 cad",
    coverage: 60,
    demand: "2.100 cad",
    description: "Traversa in c.a. B70",
    risk: "Copertura a 30 giorni",
    status: "In esaurimento",
    tone: "warning" as const,
    unit: "cad",
  },
  {
    available: "2.980 t",
    category: "Sottofondo",
    code: "BAL-A32",
    committed: "2.400 t",
    coverage: 54,
    demand: "5.500 t",
    description: "Pietrisco ballast 32/50",
    risk: "Nuova fornitura da sbloccare",
    status: "Critico",
    tone: "danger" as const,
    unit: "t",
  },
  {
    available: "850 m3",
    category: "Opere civili",
    code: "CLS-R425",
    committed: "1.200 m3",
    coverage: 37,
    demand: "2.300 m3",
    description: "Calcestruzzo R425",
    risk: "Fuori soglia di copertura",
    status: "Critico",
    tone: "danger" as const,
    unit: "m3",
  },
  {
    available: "4.200 m",
    category: "Impianti",
    code: "CAV-FIBRA",
    committed: "1.100 m",
    coverage: 116,
    demand: "3.600 m",
    description: "Cavo fibra ottica",
    risk: "Copertura ampia",
    status: "Disponibile",
    tone: "success" as const,
    unit: "m",
  },
] as const;

const watchRows = [
  { label: "2 materiali critici su opere civili", tone: "danger" as const },
  { label: "1 fornitura armamento in conferma consegna", tone: "warning" as const },
  { label: "Copertura media portfolio 78%", tone: "success" as const },
] as const;

function MetricCard({
  detail,
  label,
  tone = "neutral",
  value,
}: {
  detail: string;
  label: string;
  tone?: "danger" | "info" | "neutral" | "success" | "warning";
  value: string;
}) {
  const toneClass = {
    danger: "text-[var(--danger-base)]",
    info: "text-[var(--info-base)]",
    success: "text-[var(--success-base)]",
    warning: "text-[var(--warning-base)]",
    neutral: "text-[var(--text-primary)]",
  }[tone];

  return (
    <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div className={`mt-3 text-2xl font-semibold ${toneClass}`}>{value}</div>
      <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">{detail}</p>
    </section>
  );
}

export function MaterialsScreen() {
  return (
    <ScreenShell>
      <section>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">Supply watch</Badge>
              <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                Magazzino e cantieri sincronizzati 17:32
              </span>
            </div>
            <h2 className="mt-4 text-[34px] font-semibold leading-[1.05] tracking-[-0.045em] text-[var(--text-primary)]">
              Materiali e coperture letti come flusso operativo.
            </h2>
            <p className="mt-2 max-w-3xl text-[16px] font-normal leading-6 text-[var(--text-secondary)]">
              Niente inspector pesanti o pannelli decorativi: solo stock, impegni, fabbisogno e
              segnali di rischio per capire dove serve ordine, riallocazione o fornitura urgente.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard detail="Stock disponibile" label="Valore magazzino" value="€ 18,75M" />
              <MetricCard detail="Fuori soglia minima" label="Critici" tone="warning" value="8" />
              <MetricCard
                detail="Entro 30 giorni"
                label="In esaurimento"
                tone="warning"
                value="12"
              />
              <MetricCard
                detail="Fabbisogno 90 giorni"
                label="Copertura media"
                tone="success"
                value="78%"
              />
            </div>
          </div>

          <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
              Alert supply
            </div>
            <div className="mt-4 space-y-3">
              {watchRows.map((row) => (
                <div
                  className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] px-4 py-3"
                  key={row.label}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[14px] font-medium text-[var(--text-primary)]">
                      {row.label}
                    </div>
                    <Badge variant={row.tone}>{row.tone}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_320px]">
        <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] shadow-none">
          <div className="border-b border-[var(--border-subtle)]/80 px-5 py-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {["Tutti", "Critici", "In esaurimento", "Strategici"].map((tab, index) => (
                  <button
                    className={
                      index === 0
                        ? "rounded-full bg-[var(--accent-primary)] px-3 py-1.5 text-[13px] font-semibold text-white"
                        : "rounded-full bg-[var(--bg-muted)] px-3 py-1.5 text-[13px] font-medium text-[var(--text-secondary)]"
                    }
                    key={tab}
                    type="button"
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    className="h-10 w-[280px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] pl-10 pr-3 text-[13px] text-[var(--text-primary)] outline-none transition-all duration-base placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                    placeholder="Cerca codice o descrizione"
                    type="search"
                  />
                </label>
                <Button size="sm" variant="outline">
                  <Filter className="size-4" />
                  Filtri
                </Button>
                <Button size="sm" variant="outline">
                  <Download className="size-4" />
                  Esporta
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="bg-[var(--bg-muted)] text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-5 py-3">Materiale</th>
                  <th className="px-5 py-3">Categoria</th>
                  <th className="px-5 py-3">Disponibile</th>
                  <th className="px-5 py-3">Impegnato</th>
                  <th className="px-5 py-3">Fabbisogno 90g</th>
                  <th className="px-5 py-3">Copertura</th>
                  <th className="px-5 py-3">Stato</th>
                </tr>
              </thead>
              <tbody>
                {materialRows.map((row) => (
                  <tr className="border-t border-[var(--border-subtle)]/80" key={row.code}>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-[var(--text-primary)]">{row.code}</div>
                      <div className="mt-1 text-[13px] text-[var(--text-secondary)]">
                        {row.description}
                      </div>
                      <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                        {row.risk}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[var(--text-primary)]">
                      {row.category} · {row.unit}
                    </td>
                    <td className="px-5 py-4 font-semibold text-[var(--text-primary)]">
                      {row.available}
                    </td>
                    <td className="px-5 py-4 text-[var(--text-primary)]">{row.committed}</td>
                    <td className="px-5 py-4 text-[var(--text-primary)]">{row.demand}</td>
                    <td className="px-5 py-4">
                      <div className="text-[13px] font-semibold text-[var(--text-primary)]">
                        {row.coverage}%
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--bg-muted-strong)]">
                        <div
                          className={`h-full rounded-full ${
                            row.tone === "danger"
                              ? "bg-[var(--danger-base)]"
                              : row.tone === "warning"
                                ? "bg-[var(--warning-base)]"
                                : "bg-[var(--success-base)]"
                          }`}
                          style={{ width: `${Math.min(row.coverage, 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge label={row.status} tone={row.tone} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-[var(--info-base)]" />
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">
                Focus materiale
              </h3>
            </div>
            <div className="mt-4 rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-inset)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold text-[var(--text-primary)]">
                    BIN-60E1
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    Binario tipo 60E1 · armamento
                  </div>
                </div>
                <StatusBadge label="Disponibile" tone="success" />
              </div>
              <dl className="mt-4 space-y-3">
                {(
                  [
                    ["Disponibile", "12.450 m"],
                    ["Impegnato", "8.750 m"],
                    ["Fabbisogno 90g", "15.200 m"],
                    ["Copertura", "82%"],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)]/80 pb-3 last:border-b-0 last:pb-0"
                    key={label}
                  >
                    <dt className="text-[13px] text-[var(--text-secondary)]">{label}</dt>
                    <dd className="text-[13px] font-semibold text-[var(--text-primary)]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
            <div className="text-[16px] font-semibold text-[var(--text-primary)]">
              Azioni rapide
            </div>
            <div className="mt-4 grid gap-2">
              <Button size="sm" variant="outline">
                <Truck className="size-4" />
                Movimenta stock
              </Button>
              <Button size="sm" variant="outline">
                <Bell className="size-4" />
                Apri alert fornitura
              </Button>
              <Button size="sm">
                <Package className="size-4" />
                Crea ordine materiale
              </Button>
            </div>
          </section>
        </div>
      </section>
    </ScreenShell>
  );
}
