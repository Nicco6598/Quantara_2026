import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { SalDocumentView, SalProject } from "@/features/sal/domain/sal-workflow";
import { formatMoney } from "@/lib/formatters";

export const PAGE_SIZE = 20;

export function ProjectSalGroup({
  project,
  sals,
}: {
  project: SalProject | undefined;
  sals: SalDocumentView[];
}) {
  const total = sals.reduce((sum, sal) => sum + sal.total, 0);

  return (
    <section className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {project?.name ?? "Progetto non trovato"}
          </h3>
          <div className="mt-1 text-xs text-secondary">
            {project ? `${project.year} · ${project.client || "Committente non indicato"}` : "-"}
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="neutral">{sals.length} SAL</Badge>
          <Badge variant="success">{formatAmount(total)}</Badge>
        </div>
      </div>
      <SalTable projectById={new Map(project ? [[project.id, project]] : [])} sals={sals} />
    </section>
  );
}

export function SalTable({
  projectById,
  sals,
}: {
  projectById: Map<string, SalProject>;
  sals: SalDocumentView[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
          <tr>
            <th className="px-5 py-3">SAL</th>
            <th className="px-5 py-3">Progetto</th>
            <th className="px-5 py-3">Data</th>
            <th className="px-5 py-3">Voci</th>
            <th className="px-5 py-3">Totale</th>
            <th className="px-5 py-3">Stato</th>
          </tr>
        </thead>
        <tbody>
          {sals.map((sal) => {
            const project = projectById.get(sal.projectId);

            return (
              <tr className="border-t border-subtle" key={sal.id}>
                <td className="px-5 py-4">
                  <div className="font-semibold text-foreground">{sal.title}</div>
                  <div className="mt-1 text-xs text-secondary">{sal.description || sal.notes}</div>
                </td>
                <td className="px-5 py-4 text-secondary">
                  {project ? `${project.name} · ${project.year}` : sal.projectId}
                </td>
                <td className="px-5 py-4 text-secondary">{sal.date}</td>
                <td className="px-5 py-4 text-foreground">{sal.lines.length}</td>
                <td className="px-5 py-4 text-lg font-semibold text-foreground">
                  {formatAmount(sal.total)}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge
                    label={statusLabel(sal.status)}
                    tone={sal.status === "closed" ? "success" : "info"}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PaginationControls({
  current,
  onPageChange,
  total,
  totalItems,
}: {
  current: number;
  onPageChange: (page: number) => void;
  total: number;
  totalItems: number;
}) {
  if (total <= 1) {
    return null;
  }

  const start = (current - 1) * PAGE_SIZE + 1;
  const end = Math.min(current * PAGE_SIZE, totalItems);

  return (
    <div className="flex items-center justify-between border-t border-subtle px-5 py-3">
      <div className="text-sm text-secondary">
        Mostrando {start}-{end} di {totalItems}
      </div>
      <div className="flex items-center gap-2">
        <Button
          disabled={current === 1}
          onClick={() => onPageChange(current - 1)}
          size="sm"
          variant="outline"
        >
          Precedente
        </Button>
        <span className="text-sm text-secondary">
          {current} / {total}
        </span>
        <Button
          disabled={current === total}
          onClick={() => onPageChange(current + 1)}
          size="sm"
          variant="outline"
        >
          Successiva
        </Button>
      </div>
    </div>
  );
}

export function groupSalsByProject(sals: SalDocumentView[]) {
  const groups = new Map<string, SalDocumentView[]>();

  for (const sal of sals) {
    const current = groups.get(sal.projectId);

    if (current) {
      current.push(sal);
    } else {
      groups.set(sal.projectId, [sal]);
    }
  }

  return [...groups.entries()].map(([projectId, grouped]) => ({
    projectId,
    sals: grouped,
  }));
}

function statusLabel(status: "closed" | "draft") {
  return status === "closed" ? "Chiusa" : "Bozza";
}

function formatAmount(amount: number) {
  return formatMoney({ amount, currency: "EUR" });
}
