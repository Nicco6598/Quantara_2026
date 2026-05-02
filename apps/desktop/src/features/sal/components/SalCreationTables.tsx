import { ChevronDown, Download, MoreHorizontal, Trash2 } from "lucide-react";
import { memo, type ReactNode, useState } from "react";
import { DragDropReorder } from "@/components/shared/DragDropReorder";
import { InlineEdit } from "@/components/shared/InlineEdit";
import { cn } from "@/lib/utils";
import type { SalLineDraft, SalLineView, SalVerificationCheck } from "../types";

export function Currency({ value }: { value: number }) {
  return (
    <span className="font-mono">
      {value.toLocaleString("it-IT", {
        currency: "EUR",
        minimumFractionDigits: 2,
        style: "currency",
      })}
    </span>
  );
}

export function NumberValue({ value }: { value: number }) {
  return (
    <span className="font-mono">
      {value.toLocaleString("it-IT", { maximumFractionDigits: 3, minimumFractionDigits: 3 })}
    </span>
  );
}

export const SelectedVoicesPanel = memo(function SelectedVoicesPanel({
  lines,
  onFactorChange,
  onRemove,
  onReorder,
  onSurcharge,
}: {
  lines: SalLineView[];
  onFactorChange: (
    voiceId: string,
    field: "factor1" | "factor2" | "factor3",
    value: number,
  ) => void;
  onRemove: (voiceId: string) => void;
  onReorder: (lines: SalLineDraft[]) => void;
  onSurcharge: (voiceId: string, percent: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[20px] bg-[var(--bg-muted)]/40 ring-1 ring-[var(--border-subtle)]/60">
      <div className="max-h-[680px] overflow-y-auto">
        <div className="min-w-[1060px]">
          <div className="sticky top-0 z-10 grid grid-cols-[1.2fr_72px_100px_100px_100px_120px_100px_110px_120px_44px] items-center gap-1 bg-[var(--surface-base)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-secondary)] shadow-[0_1px_0_var(--border-subtle)]">
            <span>Voce</span>
            <span>U.M.</span>
            <span className="text-right">Fattore 1</span>
            <span className="text-right">Fattore 2</span>
            <span className="text-right">Fattore 3</span>
            <span className="text-right">Quantità</span>
            <span className="text-right">Magg.</span>
            <span className="text-right">Totale</span>
            <span className="text-right">Dettaglio</span>
            <span />
          </div>

          {lines.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <p className="text-[13px] font-medium text-[var(--text-secondary)]">
                Cerca una voce tariffaria qui sopra e aggiungila alla bozza.
              </p>
            </div>
          ) : (
            <DragDropReorder
              items={lines}
              onReorder={onReorder}
              renderItem={(line: SalLineView, index: number) => (
                <SelectedVoiceRow
                  index={index}
                  key={line.id}
                  line={line}
                  onFactorChange={onFactorChange}
                  onRemove={onRemove}
                  onSurcharge={onSurcharge}
                />
              )}
              uniqueId={(line: SalLineView) => line.id}
            />
          )}
        </div>
      </div>
    </div>
  );
});

const SelectedVoiceRow = memo(function SelectedVoiceRow({
  index,
  line,
  onFactorChange,
  onRemove,
  onSurcharge,
}: {
  index: number;
  line: SalLineView;
  onFactorChange: (
    voiceId: string,
    field: "factor1" | "factor2" | "factor3",
    value: number,
  ) => void;
  onRemove: (voiceId: string) => void;
  onSurcharge: (voiceId: string, percent: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "border-t border-[var(--border-subtle)]/50",
        index % 2 === 0 ? "bg-[var(--surface-base)]" : "bg-[var(--bg-muted)]/20",
      )}
    >
      <div className="grid grid-cols-[1.2fr_72px_100px_100px_100px_120px_100px_110px_120px_44px] items-center gap-1 px-4 py-2.5 text-[13px]">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="shrink-0 text-[11px] font-medium text-[var(--text-secondary)]">
            {index + 1}
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold text-[var(--text-primary)]">
              {line.voice.code}
            </div>
            <div
              className="mt-0.5 truncate text-[12px] text-[var(--text-secondary)]"
              title={line.voice.description}
            >
              {truncateDescription(line.voice.description, 64)}
            </div>
          </div>
        </div>

        <span className="text-[var(--text-secondary)]">{line.voice.unit}</span>

        <div className="flex justify-end">
          <InlineEdit
            ariaLabel={`Fattore 1 per ${line.voice.code}`}
            className="w-20"
            onCommit={(value) => onFactorChange(line.voice.id, "factor1", value)}
            value={line.factor1}
          />
        </div>

        <div className="flex justify-end">
          <InlineEdit
            ariaLabel={`Fattore 2 per ${line.voice.code}`}
            className="w-20"
            onCommit={(value) => onFactorChange(line.voice.id, "factor2", value)}
            value={line.factor2}
          />
        </div>

        <div className="flex justify-end">
          <InlineEdit
            ariaLabel={`Fattore 3 per ${line.voice.code}`}
            className="w-20"
            onCommit={(value) => onFactorChange(line.voice.id, "factor3", value)}
            value={line.factor3}
          />
        </div>

        <span className="text-right font-semibold text-[var(--text-primary)]">
          <NumberValue value={line.quantity} />
        </span>

        <div className="flex justify-end">
          <select
            aria-label={`Maggiorazione per ${line.voice.code}`}
            className="h-8 w-[76px] rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-2 text-[12px] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
            onChange={(event) => onSurcharge(line.voice.id, Number(event.target.value))}
            value={line.surchargePercent}
          >
            <option value={0}>0%</option>
            <option value={10}>10%</option>
            <option value={25}>25%</option>
          </select>
        </div>

        <span className="text-right font-bold text-[var(--accent-primary)]">
          <Currency value={line.totalAmount} />
        </span>

        <div className="flex justify-end">
          <button
            aria-label="Espandi dettaglio"
            className={cn(
              "flex size-8 items-center justify-center rounded-[10px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)]",
              expanded && "bg-[var(--bg-muted)]",
            )}
            onClick={() => setExpanded((v) => !v)}
            type="button"
          >
            <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
          </button>
        </div>

        <button
          aria-label={`Rimuovi ${line.voice.code}`}
          className="flex size-8 items-center justify-center rounded-[10px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)]"
          onClick={() => onRemove(line.voice.id)}
          type="button"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {expanded && (
        <div className="ml-4 border-l-2 border-[var(--border-subtle)] bg-[var(--bg-muted)]/30 px-4 py-3">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.9fr]">
            <NestedTable
              columns={["#", "Descrizione", "U.M.", "F1", "F2", "F3", "Qtà", "Note"]}
              title="Sottorighe misura"
            >
              {line.measurementRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-[var(--text-secondary)]" colSpan={8}>
                    Compila i fattori per generare la misura.
                  </td>
                </tr>
              ) : (
                line.measurementRows.map((row, rowIndex) => (
                  <tr className="border-t border-[var(--border-subtle)]/50" key={row.id}>
                    <td className="px-3 py-2">{rowIndex + 1}</td>
                    <td className="px-3 py-2">{row.description}</td>
                    <td className="px-3 py-2">{row.unit}</td>
                    <td className="px-3 py-2 text-right">{row.factor1.toLocaleString("it-IT")}</td>
                    <td className="px-3 py-2 text-right">{row.factor2.toLocaleString("it-IT")}</td>
                    <td className="px-3 py-2 text-right">{row.factor3.toLocaleString("it-IT")}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {row.partialQuantity.toLocaleString("it-IT")}
                    </td>
                    <td className="px-3 py-2">{row.notes}</td>
                  </tr>
                ))
              )}
            </NestedTable>

            <NestedTable
              columns={["Codice", "Tipo", "Base", "%", "Importo"]}
              title="Maggiorazioni / collegate"
            >
              {line.linkedCharges.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-[var(--text-secondary)]" colSpan={5}>
                    Nessuna maggiorazione attiva.
                  </td>
                </tr>
              ) : (
                line.linkedCharges.map((charge) => (
                  <tr className="border-t border-[var(--border-subtle)]/50" key={charge.id}>
                    <td className="px-3 py-2">{charge.code}</td>
                    <td className="px-3 py-2">{charge.description}</td>
                    <td className="px-3 py-2 text-right">
                      <Currency value={charge.baseAmount} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {charge.percent.toLocaleString("it-IT")} %
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      <Currency value={charge.total} />
                    </td>
                  </tr>
                ))
              )}
            </NestedTable>
          </div>
        </div>
      )}
    </div>
  );
});

export function AccountingRows({ lines }: { lines: SalLineView[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(lines[0]?.id ?? null);

  if (lines.length === 0) {
    return (
      <div className="rounded-[20px] bg-[var(--bg-muted)]/50">
        <EmptyTableState message="Il registro SAL apparirà quando avrai selezionato almeno una voce tariffaria." />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[20px] bg-[var(--bg-muted)]/50">
      <div className="min-w-[1100px]">
        <div className="sticky top-0 z-10 grid grid-cols-[44px_160px_110px_minmax(260px,1fr)_74px_130px_130px_120px_54px] bg-[color-mix(in_srgb,var(--surface-base)_95%,var(--bg-muted)_5%)] px-3 py-3 text-xs font-semibold text-secondary shadow-[0_10px_24px_color-mix(in_srgb,var(--text-primary)_5%,transparent)]">
          <span />
          <span>Tariffario</span>
          <span>Codice</span>
          <span>Descrizione voce</span>
          <span>U.M.</span>
          <span>Quantità totale</span>
          <span>Importo</span>
          <span>Stato</span>
          <span />
        </div>
        {lines.map((line) => {
          const expanded = expandedId === line.id;
          return (
            <div className="border-t border-[var(--border-subtle)]/50" key={line.id}>
              <button
                aria-expanded={expanded}
                className="grid w-full grid-cols-[44px_160px_110px_minmax(260px,1fr)_74px_130px_130px_120px_54px] items-center px-3 py-3 text-left text-[13px] hover:bg-[var(--bg-muted)]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                onClick={() => setExpandedId(expanded ? null : line.id)}
                type="button"
              >
                <ChevronDown
                  className={cn(
                    "size-4 text-[var(--accent-primary)] transition-transform",
                    !expanded && "-rotate-90",
                  )}
                />
                <span>{line.voice.tariffBookName}</span>
                <span>{line.voice.code}</span>
                <span className="font-semibold">{line.voice.description}</span>
                <span>{line.voice.unit}</span>
                <span className="font-semibold">
                  <NumberValue value={line.quantity} />
                </span>
                <span className="font-semibold">
                  <Currency value={line.totalAmount} />
                </span>
                <StatusPill tone={line.status === "complete" ? "success" : "warning"}>
                  {line.status === "complete" ? "Completa" : "Da completare"}
                </StatusPill>
                <MoreHorizontal className="size-5 text-[var(--text-secondary)]" />
              </button>
              {expanded ? (
                <div className="grid gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-muted)]/20 p-3 lg:grid-cols-[1.25fr_1fr]">
                  <NestedTable
                    columns={["Descrizione", "U.M.", "F1", "F2", "F3", "Qtà", "Note"]}
                    title="Misure"
                  >
                    {line.measurementRows.length === 0 ? (
                      <tr>
                        <td className="px-3 py-3 text-[var(--text-secondary)]" colSpan={7}>
                          Nessuna misura inserita.
                        </td>
                      </tr>
                    ) : (
                      line.measurementRows.map((row) => (
                        <tr className="border-t border-[var(--border-subtle)]/50" key={row.id}>
                          <td className="px-3 py-2">{row.description}</td>
                          <td className="px-3 py-2">{row.unit}</td>
                          <td className="px-3 py-2 text-right">
                            {row.factor1.toLocaleString("it-IT")}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {row.factor2.toLocaleString("it-IT")}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {row.factor3.toLocaleString("it-IT")}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {row.partialQuantity.toLocaleString("it-IT")}
                          </td>
                          <td className="px-3 py-2">{row.notes}</td>
                        </tr>
                      ))
                    )}
                  </NestedTable>
                  <NestedTable
                    columns={["Codice", "Tipo", "Base", "%", "Importo"]}
                    title="Collegate"
                  >
                    {line.linkedCharges.length === 0 ? (
                      <tr>
                        <td className="px-3 py-3 text-[var(--text-secondary)]" colSpan={5}>
                          Nessuna maggiorazione attiva.
                        </td>
                      </tr>
                    ) : (
                      line.linkedCharges.map((charge) => (
                        <tr className="border-t border-[var(--border-subtle)]/50" key={charge.id}>
                          <td className="px-3 py-2">{charge.code}</td>
                          <td className="px-3 py-2">{charge.description}</td>
                          <td className="px-3 py-2 text-right">
                            <Currency value={charge.baseAmount} />
                          </td>
                          <td className="px-3 py-2 text-right">
                            {charge.percent.toLocaleString("it-IT")} %
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">
                            <Currency value={charge.total} />
                          </td>
                        </tr>
                      ))
                    )}
                  </NestedTable>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DocumentPreview({
  compact = false,
  lines = [],
}: {
  compact?: boolean;
  lines?: SalLineView[];
}) {
  const total = lines.reduce((sum, line) => sum + line.totalAmount, 0);
  return (
    <div
      className={cn(
        "rounded-[12px] border border-[var(--border-subtle)] bg-white p-4 text-[#10182f] shadow-inner",
        compact && "p-3 text-[11px]",
      )}
    >
      <div className="grid grid-cols-3 border border-[#c9d2e3] text-center text-xs font-semibold">
        <div className="p-3 text-left">
          COMUNE DI ESEMPIO
          <br />
          Ufficio Tecnico
        </div>
        <div className="border-x border-[#c9d2e3] p-3">
          LIBRETTO DELLE MISURE
          <br />
          Stato Avanzamento Lavori n. 1
        </div>
        <div className="p-3 text-left">
          Progetto: TEST
          <br />
          Codice: QNT-01
          <br />
          Anno: 2026
        </div>
      </div>
      <table className="mt-3 w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#f4f6fa]">
            {["N.", "Codice", "Descrizione", "U.M.", "Qtà", "Prezzo", "Importo"].map((h) => (
              <th className="border border-[#c9d2e3] p-2 text-left" key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td className="border border-[#c9d2e3] p-3 text-center text-[#53617a]" colSpan={7}>
                Anteprima dopo l'inserimento delle voci.
              </td>
            </tr>
          ) : (
            lines.slice(0, compact ? 5 : 8).map((line, idx) => (
              <tr key={line.id}>
                <td className="border border-[#c9d2e3] p-2">{idx + 1}</td>
                <td className="border border-[#c9d2e3] p-2">{line.voice.code}</td>
                <td className="border border-[#c9d2e3] p-2">{line.voice.description}</td>
                <td className="border border-[#c9d2e3] p-2">{line.voice.unit}</td>
                <td className="border border-[#c9d2e3] p-2 text-right">
                  {line.quantity.toLocaleString("it-IT")}
                </td>
                <td className="border border-[#c9d2e3] p-2 text-right">
                  {line.voice.unitPrice.toLocaleString("it-IT")}
                </td>
                <td className="border border-[#c9d2e3] p-2 text-right">
                  {line.totalAmount.toLocaleString("it-IT")}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="mt-3 grid grid-cols-[1fr_180px] border border-[#c9d2e3] text-xs font-semibold">
        <div className="p-2">TOTALE COMPLESSIVO DOCUMENTO</div>
        <div className="border-l border-[#c9d2e3] p-2 text-right text-[#006BFF]">
          {total.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}

export function OutputRow({
  disabled,
  icon,
  label,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-3",
        disabled && "opacity-60",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <span className="truncate text-sm font-semibold">{label}</span>
      </div>
      <span className="hidden text-xs font-semibold text-[var(--success-base)] md:inline">
        {disabled ? "Non disponibile" : "Pronto per export"}
      </span>
      <Download className="size-4 text-[var(--text-secondary)]" />
    </div>
  );
}

export function CheckRow({ check }: { check: SalVerificationCheck }) {
  return (
    <div className="grid grid-cols-[minmax(220px,1fr)_120px_minmax(220px,1.4fr)] items-center border-b border-[var(--border-subtle)] px-3 py-3 text-[13px] last:border-b-0">
      <span className="flex items-center gap-2 font-semibold">
        <span
          className={cn(
            "size-4 rounded-full",
            check.tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
            check.tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger-base)]",
            check.tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
          )}
        />
        {check.label}
      </span>
      <StatusPill tone={check.tone}>{check.result}</StatusPill>
      <span className="text-xs text-[var(--text-secondary)]">{check.detail}</span>
    </div>
  );
}

export function StatusPill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "danger" | "info" | "success" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center justify-center rounded-full px-3 py-1 text-[11px] font-bold",
        tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger-base)]",
        tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
        tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
        tone === "info" && "bg-[var(--info-soft)] text-[var(--info-base)]",
      )}
    >
      {children}
    </span>
  );
}

function NestedTable({
  children,
  columns,
  title,
}: {
  children: ReactNode;
  columns: string[];
  title: string;
}) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-base)]">
      <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-[13px] font-bold text-[var(--text-primary)]">
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-[12px]">
          <thead className="bg-[var(--bg-muted)]/45 text-[var(--text-secondary)]">
            <tr>
              {columns.map((col) => (
                <th className="px-3 py-2 font-semibold" key={col}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyTableState({ message }: { message: string }) {
  return (
    <div className="border-t border-[var(--border-subtle)] px-4 py-8 text-center text-[13px] text-[var(--text-secondary)]">
      {message}
    </div>
  );
}

function truncateDescription(description: string, maxLength = 100): string {
  const normalized = description.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const lastSpace = normalized.lastIndexOf(" ", maxLength);
  return lastSpace > 0
    ? `${normalized.slice(0, lastSpace).trim()}...`
    : `${normalized.slice(0, maxLength).trim()}...`;
}
