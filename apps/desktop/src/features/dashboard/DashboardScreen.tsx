import { AlertTriangle, FolderKanban, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { StatusBadge, type StatusTone } from "@/components/shared/StatusBadge";

const overviewMetrics = [
  {
    detail: "Budget complessivo dei lotti attivi nel perimetro corrente",
    label: "EAC portafoglio",
    tone: "info",
    value: "€ 91,45M",
  },
  {
    detail: "Cantieri con SAL, forecast e materiali sotto controllo operativo",
    label: "Lotti attivi",
    tone: "success",
    value: "8",
  },
  {
    detail: "Snodi che richiedono presidio nelle prossime 72 ore",
    label: "Escalation",
    tone: "warning",
    value: "3",
  },
  {
    detail: "Responsabili di commessa in carico sul portafoglio",
    label: "PM operativi",
    tone: "neutral",
    value: "5",
  },
] as const;

const projectRows = [
  {
    id: "milano-verona",
    lot: "Lotto 3A · Verona Est",
    milestone: "SAL 9 in emissione",
    progress: 68,
    project: "Linea AV/AC Milano-Verona",
    sal: "€ 2,16M",
    status: "In linea",
    tone: "success",
  },
  {
    id: "firenze-av",
    lot: "Lotto 2B · Galleria Belvedere",
    milestone: "Riprogrammare getto galleria",
    progress: 72,
    project: "Nodo di Firenze AV",
    sal: "€ 1,99M",
    status: "Attenzione",
    tone: "warning",
  },
  {
    id: "napoli-bari",
    lot: "Lotto 1C · Tratta Orsara",
    milestone: "Sbloccare quadro extra-costi",
    progress: 45,
    project: "Linea AV Napoli-Bari",
    sal: "€ 2,89M",
    status: "Critico",
    tone: "danger",
  },
  {
    id: "genova-ventimiglia",
    lot: "Lotto Unico · Tratta Finale",
    milestone: "Validazione piano interferenze",
    progress: 25,
    project: "Linea AV Genova-Ventimiglia",
    sal: "€ 0,84M",
    status: "In linea",
    tone: "success",
  },
  {
    id: "rete-nord",
    lot: "Programma 2024 · Manutenzione",
    milestone: "Ordine ricambi giugno",
    progress: 15,
    project: "Manutenzione Rete Nord",
    sal: "€ 0,21M",
    status: "Monitoraggio",
    tone: "info",
  },
] as const;

const daySignals = [
  {
    detail: "Napoli-Bari e Adriatica hanno documentazione SAL incompleta.",
    label: "2 dossier bloccati",
    tone: "danger",
  },
  {
    detail: "Milano-Verona e Catania hanno milestone di firma nelle prossime 24 ore.",
    label: "4 snodi ravvicinati",
    tone: "warning",
  },
  {
    detail: "Cinque lotti tengono curva lavori e materiali sopra soglia di sicurezza.",
    label: "Presidio stabile",
    tone: "success",
  },
] as const;

const focusRows = [
  { label: "In linea", tone: "success", value: "5" },
  { label: "Sotto presidio", tone: "warning", value: "2" },
  { label: "Escalation", tone: "danger", value: "1" },
  { label: "Completati", tone: "info", value: "2" },
] as const;

const activityRows = [
  "Verbale OS #45 caricato per Napoli-Bari",
  "Firma SAL 9 richiesta a Direzione Lavori per Milano-Verona",
  "Consegna quadri AT ripianificata sul Passante merci Catania",
  "Scarpata sud validata dopo sopralluogo su Genova-Ventimiglia",
] as const;

export function DashboardScreen() {
  return (
    <main className="p-6 pb-8">
      <section className="rounded-[28px] border border-subtle bg-card p-6 shadow-soft">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">Sala controllo portfolio</Badge>
              <span className="text-xs text-secondary">Aggiornato alle 17:40</span>
            </div>
            <h2 className="mt-4 text-[2rem] font-semibold tracking-tight text-foreground">
              Visione unica su cantieri, SAL e presidio operativo.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-secondary">
              Questa vista condensa volumi, criticita e code approvative del portafoglio senza
              aprire singoli dossier. L'obiettivo e capire in pochi secondi dove serve l'azione.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {overviewMetrics.map((metric) => (
                <MetricTile
                  detail={metric.detail}
                  key={metric.label}
                  label={metric.label}
                  tone={metric.tone}
                  value={metric.value}
                />
              ))}
            </div>
          </div>

          <section className="rounded-[24px] border border-subtle bg-muted/40 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-info" />
              <h3 className="text-base font-semibold text-foreground">Segnali giornata</h3>
            </div>
            <div className="mt-4 space-y-3">
              {daySignals.map((signal) => (
                <SignalCard
                  detail={signal.detail}
                  key={signal.label}
                  label={signal.label}
                  tone={signal.tone}
                />
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_340px]">
        <section className="rounded-[28px] border border-subtle bg-card shadow-soft">
          <div className="flex flex-col gap-3 border-b border-subtle px-5 py-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                Registro portfolio
              </div>
              <h3 className="mt-2 text-lg font-semibold text-foreground">
                Lotti attivi e relativo presidio
              </h3>
            </div>
            <Button
              onClick={() =>
                window.dispatchEvent(new CustomEvent("navigate", { detail: "projects" }))
              }
              size="sm"
              variant="outline"
            >
              Apri board progetti
            </Button>
          </div>

          <div className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
            <div className="hidden grid-cols-[1.6fr_0.8fr_0.8fr_0.7fr_auto] gap-4 xl:grid">
              <span>Progetto</span>
              <span>Milestone</span>
              <span>SAL</span>
              <span>Avanzamento</span>
              <span>Azioni</span>
            </div>
          </div>

          <div>
            {projectRows.map((row) => (
              <ProjectRow key={row.id} row={row} />
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <FolderKanban className="size-4 text-info" />
              <h3 className="text-base font-semibold text-foreground">Distribuzione stato</h3>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {focusRows.map((row) => (
                <MetricTile
                  detail="Stato attuale del perimetro portfolio"
                  key={row.label}
                  label={row.label}
                  tone={row.tone}
                  value={row.value}
                />
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning" />
              <h3 className="text-base font-semibold text-foreground">Feed operativo</h3>
            </div>
            <div className="mt-4 space-y-3">
              {activityRows.map((row) => (
                <div
                  className="rounded-[20px] border border-subtle bg-muted/40 px-4 py-3"
                  key={row}
                >
                  <div className="text-sm font-medium text-foreground">{row}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function MetricTile({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: StatusTone | "neutral";
  value: string;
}) {
  const toneClass =
    tone === "danger"
      ? "text-danger"
      : tone === "warning"
        ? "text-warning"
        : tone === "success"
          ? "text-success"
          : tone === "info"
            ? "text-info"
            : "text-foreground";

  return (
    <div className="rounded-[22px] border border-subtle bg-muted/35 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
        {label}
      </div>
      <div className={`mt-3 text-2xl font-semibold ${toneClass}`}>{value}</div>
      <p className="mt-2 text-xs leading-5 text-secondary">{detail}</p>
    </div>
  );
}

function SignalCard({ detail, label, tone }: { detail: string; label: string; tone: StatusTone }) {
  const badgeLabel =
    tone === "danger"
      ? "Critico"
      : tone === "warning"
        ? "Presidio"
        : tone === "success"
          ? "Stabile"
          : "Info";

  return (
    <div className="rounded-[20px] border border-subtle bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <StatusBadge label={badgeLabel} tone={tone} />
      </div>
      <p className="mt-2 text-xs leading-5 text-secondary">{detail}</p>
    </div>
  );
}

function ProjectRow({ row }: { row: (typeof projectRows)[number] }) {
  return (
    <div className="grid gap-4 border-t border-subtle px-5 py-4 xl:grid-cols-[1.6fr_0.8fr_0.8fr_0.7fr_auto] xl:items-center">
      <div>
        <div className="text-sm font-semibold text-foreground">{row.project}</div>
        <div className="mt-1 text-xs text-secondary">{row.lot}</div>
      </div>
      <div className="text-sm text-foreground">{row.milestone}</div>
      <div>
        <div className="text-sm font-semibold text-foreground">{row.sal}</div>
        <div className="mt-1">
          <StatusBadge label={row.status} tone={row.tone} />
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground">{row.progress}%</div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${
              row.tone === "danger"
                ? "bg-danger"
                : row.tone === "warning"
                  ? "bg-warning"
                  : row.tone === "info"
                    ? "bg-info"
                    : "bg-success"
            }`}
            style={{ width: `${row.progress}%` }}
          />
        </div>
      </div>
      <div className="flex justify-start xl:justify-end">
        <Button
          onClick={() =>
            window.dispatchEvent(new CustomEvent("navigate", { detail: "project-detail" }))
          }
          size="sm"
          variant="outline"
        >
          Apri
        </Button>
      </div>
    </div>
  );
}
