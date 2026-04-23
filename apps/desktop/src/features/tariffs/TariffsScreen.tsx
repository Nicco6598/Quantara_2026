import {
  ChevronDown,
  Columns3,
  Download,
  FileText,
  Filter,
  MoreVertical,
  Search,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";

const tariffRows = [
  [
    "01.A01.A10.005",
    "Scavo di sbancamento in trincea",
    "01 - Opere di scavo",
    "m3",
    "€ 18,50",
    "+4,2%",
  ],
  [
    "01.A02.A20.010",
    "Rinfianco con materiale arido",
    "01 - Opere di scavo",
    "m3",
    "€ 16,80",
    "+3,1%",
  ],
  [
    "01.A03.A30.015",
    "Rilevato in materiale selezionato",
    "01 - Opere di scavo",
    "m3",
    "€ 22,40",
    "+5,7%",
  ],
  [
    "02.B01.B10.020",
    "Calcestruzzo magro per sottofondi",
    "02 - Opere in cls",
    "m3",
    "€ 102,30",
    "+6,8%",
  ],
  [
    "02.B02.B20.025",
    "Calcestruzzo strutturale C25/30",
    "02 - Opere in cls",
    "m3",
    "€ 154,90",
    "+7,9%",
  ],
  [
    "02.B03.B30.030",
    "Calcestruzzo strutturale C28/35",
    "02 - Opere in cls",
    "m3",
    "€ 167,20",
    "+8,1%",
  ],
  [
    "03.C01.C10.035",
    "Fornitura e posa binario tipo 60E1",
    "03 - Armamento",
    "m",
    "€ 1.250,00",
    "+5,3%",
  ],
  ["03.C01.C10.040", "Traverse in c.a. tipo RS", "03 - Armamento", "cad", "€ 28,50", "+2,1%"],
  ["03.C01.C10.045", "Giunzioni incollate", "03 - Armamento", "cad", "€ 42,00", "+4,8%"],
  ["04.D01.D10.050", "Pali trivellati Ø1200 mm", "04 - Fondazioni", "m", "€ 385,00", "+6,2%"],
  [
    "05.E01.E20.060",
    "Pali per linea di contatto",
    "05 - Elettrificazione",
    "cad",
    "€ 210,00",
    "+3,6%",
  ],
] as const;

export function TariffsScreen() {
  return (
    <main className="p-6">
      <div className="grid grid-cols-[1fr_360px] gap-4">
        <div className="min-w-0">
          <MetaStrip />

          <section className="mt-4 rounded-md border border-subtle bg-card shadow-soft">
            <div className="flex gap-8 border-b border-subtle px-4">
              {["Voci tariffario", "Diff. vs 2024", "Anomalie (23)", "Log importazioni"].map(
                (tab, index) => (
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
                ),
              )}
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <Button variant="outline">
                  Tutte le categorie
                  <ChevronDown data-icon="inline-start" />
                </Button>
                <div className="flex h-10 w-[280px] items-center gap-2 rounded-md border border-subtle bg-surface px-3 text-sm text-secondary">
                  <Search className="size-4" />
                  Cerca voce, codice o descrizione...
                </div>
                <Button variant="outline">
                  <Filter data-icon="inline-start" />
                  Filtri
                  <Badge variant="danger">2</Badge>
                </Button>
                <Button variant="outline">
                  <Columns3 data-icon="inline-start" />
                  Colonne
                </Button>
              </div>
              <Button variant="outline">
                <Download data-icon="inline-start" />
                Esporta
              </Button>
            </div>
            <TariffTable />
          </section>

          <div className="mt-4 grid grid-cols-[0.9fr_1.1fr] gap-4">
            <InfoCard
              icon={<FileText className="size-5" />}
              label="Tariffario ufficiale e certificato"
              value="Questo tariffario e stato importato da fonte ufficiale e validato."
            />
            <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
              <h3 className="text-base font-semibold text-foreground">
                Ultimo aggiornamento prezzi
              </h3>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <SideStat label="Voci aumentate" value="7.832 (63,4%)" variant="danger" />
                <SideStat label="Voci diminuite" value="1.245 (10,1%)" variant="success" />
                <SideStat label="Invariate" value="3.271 (26,5%)" />
              </div>
            </section>
          </div>
        </div>

        <TariffInspector />
      </div>
    </main>
  );
}

function MetaStrip() {
  const rows = [
    ["Fonte ufficiale", "Regione Lombardia"],
    ["Anno", "2025"],
    ["File sorgente", "Tariffario_Lombardia_2025.pdf"],
    ["Importato il", "08/05/2024 10:32"],
    ["Stato importazione", "Completato"],
    ["Voci totali", "12.348"],
    ["Affidabilita parsing", "98,6%"],
  ];

  return (
    <section className="grid grid-cols-7 rounded-md border border-subtle bg-card shadow-soft">
      {rows.map(([label, value]) => (
        <div className="border-r border-subtle p-4 last:border-r-0" key={label}>
          <div className="text-xs font-medium text-secondary">{label}</div>
          <div className="mt-2 text-sm font-semibold text-foreground">{value}</div>
        </div>
      ))}
    </section>
  );
}

function TariffTable() {
  return (
    <div className="overflow-hidden">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-muted text-[11px] font-semibold text-secondary">
          <tr>
            <th className="px-4 py-3">Codice ufficiale</th>
            <th className="px-4 py-3">Descrizione</th>
            <th className="px-4 py-3">Categoria</th>
            <th className="px-4 py-3">UM</th>
            <th className="px-4 py-3">Prezzo unitario</th>
            <th className="px-4 py-3">Var. 2024</th>
            <th className="px-4 py-3">Stato</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {tariffRows.map((row) => (
            <tr
              className={
                row[0] === "03.C01.C10.035"
                  ? "border-l-2 border-l-primary bg-sidebar-active"
                  : "border-t border-subtle hover:bg-table-row-hover"
              }
              key={row[0]}
            >
              <td className="px-4 py-3 font-medium text-foreground">{row[0]}</td>
              <td className="px-4 py-3 text-foreground">{row[1]}</td>
              <td className="px-4 py-3 text-secondary">{row[2]}</td>
              <td className="px-4 py-3 text-foreground">{row[3]}</td>
              <td className="px-4 py-3 font-semibold text-foreground">{row[4]}</td>
              <td className="px-4 py-3">
                <Badge variant="danger">{row[5]}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant="success">Validata</Badge>
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
        <span>1-25 di 12.348</span>
      </div>
    </div>
  );
}

function TariffInspector() {
  return (
    <aside className="rounded-md border border-subtle bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="neutral">03.C01.C10.035</Badge>
            <Badge variant="success">Validata</Badge>
          </div>
          <h3 className="mt-4 text-xl font-semibold text-foreground">
            Fornitura e posa binario tipo 60E1
          </h3>
          <div className="mt-3 flex gap-2">
            <Badge variant="info">Armamento</Badge>
            <Badge variant="info">A misura</Badge>
          </div>
        </div>
        <X className="size-4 text-secondary" />
      </div>

      <div className="mt-5 flex gap-6 border-b border-subtle text-sm font-semibold">
        {["Dettagli", "Prezzi", "Collegamenti", "Cronologia"].map((tab, index) => (
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

      <section className="mt-4 rounded-md border border-subtle bg-surface p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Informazioni generali</h4>
          <Button size="sm" variant="outline">
            Modifica
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <SideStat label="Codice ufficiale" value="03.C01.C10.035" />
          <SideStat label="Categoria" value="03 - Armamento" />
          <SideStat label="Unita di misura" value="m" />
          <SideStat label="Tipologia" value="A misura" />
        </div>
        <div className="mt-4 text-sm text-secondary">
          Fornitura e posa in opera di binario tipo 60E1 completo di accessori e fissaggi.
        </div>
      </section>

      <section className="mt-4 rounded-md border border-subtle bg-surface p-4">
        <h4 className="text-sm font-semibold text-foreground">Prezzi e variazioni</h4>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <SideStat label="Prezzo unitario" value="€ 1.250,00 / m" />
          <SideStat label="IVA" value="22%" />
          <SideStat label="Prezzo IVA inclusa" value="€ 1.525,00 / m" />
        </div>
        <div className="mt-4 text-2xl font-semibold text-primary">+5,3% ↑</div>
      </section>

      <section className="mt-4 rounded-md border border-subtle bg-surface p-4">
        <h4 className="text-sm font-semibold text-foreground">Collegamenti e utilizzi</h4>
        {["Voci di lavoro collegate", "SAL che utilizzano questa voce", "Materiali associati"].map(
          (row) => (
            <div
              className="flex items-center justify-between border-b border-subtle py-3 text-sm last:border-b-0"
              key={row}
            >
              <span className="text-foreground">{row}</span>
              <span className="text-secondary">›</span>
            </div>
          ),
        )}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="outline">Segnala anomalia</Button>
        <Button>Crea voce di lavoro</Button>
      </div>
    </aside>
  );
}

type InfoCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function InfoCard({ icon, label, value }: InfoCardProps) {
  return (
    <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
      <div className="flex items-start gap-4">
        <span className="flex size-10 items-center justify-center rounded-md bg-info-soft text-info">
          {icon}
        </span>
        <div>
          <h3 className="text-base font-semibold text-foreground">{label}</h3>
          <p className="mt-2 text-sm text-secondary">{value}</p>
        </div>
      </div>
    </section>
  );
}

type SideStatProps = {
  label: string;
  value: string;
  variant?: "danger" | "success";
};

function SideStat({ label, value, variant }: SideStatProps) {
  return (
    <div>
      <div className="text-xs text-secondary">{label}</div>
      <div
        className={
          variant === "danger"
            ? "mt-1 font-semibold text-primary"
            : variant === "success"
              ? "mt-1 font-semibold text-success"
              : "mt-1 font-semibold text-foreground"
        }
      >
        {value}
      </div>
    </div>
  );
}
