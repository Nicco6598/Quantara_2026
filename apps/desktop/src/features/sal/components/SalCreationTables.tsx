import { Check, ChevronDown, Download, Filter, MoreHorizontal, Search, Trash2 } from "lucide-react";
import { memo, type ReactNode, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { SalLineView, SalVerificationCheck, SalVoiceDraft } from "../types";

type CatalogGroup = {
  category: string;
  id: string;
  macroCode: string;
  tariffBookName: string;
  voices: SalVoiceDraft[];
};

export function Currency({ value }: { value: number }) {
  return (
    <span>
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
    <span>
      {value.toLocaleString("it-IT", { maximumFractionDigits: 3, minimumFractionDigits: 3 })}
    </span>
  );
}

export function CatalogPanel({
  onToggle,
  selectedIds,
  voices,
}: {
  onToggle: (voice: SalVoiceDraft) => void;
  selectedIds: Set<string>;
  voices: SalVoiceDraft[];
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredVoices = useMemo(
    () =>
      normalizedQuery.length === 0
        ? voices
        : voices.filter((voice) =>
            `${voice.code} ${voice.description} ${voice.category}`
              .toLowerCase()
              .includes(normalizedQuery),
          ),
    [normalizedQuery, voices],
  );
  const groupedVoices = useMemo(() => groupCatalogVoices(filteredVoices), [filteredVoices]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_40px_40px] gap-2">
        <label className="relative flex h-10 items-center rounded-[10px] border border-subtle bg-card">
          <Search className="ml-3 size-4 text-secondary" />
          <input
            aria-label="Cerca voce o codice tariffario"
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-[13px] outline-none"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca voce o codice..."
            value={query}
          />
        </label>
        <button aria-label="Filtra tariffario" className="sal-icon-button" type="button">
          <Filter className="size-4" />
        </button>
        <button aria-label="Altre opzioni tariffario" className="sal-icon-button" type="button">
          <MoreHorizontal className="size-4" />
        </button>
      </div>
      <div className="overflow-hidden rounded-[12px] border border-subtle">
        <div className="grid grid-cols-[38px_96px_minmax(180px,1fr)_64px_78px_106px] bg-muted/45 px-3 py-2 text-xs font-semibold text-secondary">
          <span />
          <span>Codice</span>
          <span>Descrizione</span>
          <span>U.M.</span>
          <span className="text-right">Manod.</span>
          <span className="text-right">Prezzo unitario</span>
        </div>
        {filteredVoices.length === 0 ? (
          <EmptyTableState
            message={
              voices.length === 0
                ? "Nessuna voce reale caricata per questo tariffario."
                : "Nessuna voce corrisponde alla ricerca."
            }
          />
        ) : (
          <div className="max-h-[318px] overflow-y-auto">
            {groupedVoices.map((group) => {
              const isExpanded = normalizedQuery.length > 0 || expandedGroups.has(group.id);
              return (
                <div className="border-t border-subtle" key={group.id}>
                  <button
                    aria-expanded={isExpanded}
                    className="grid w-full grid-cols-[38px_96px_minmax(180px,1fr)_64px_78px_106px] items-center bg-muted/25 px-3 py-2 text-left text-[12px] font-bold hover:bg-muted/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    onClick={() =>
                      setExpandedGroups((current) => {
                        const next = new Set(current);
                        if (next.has(group.id)) next.delete(group.id);
                        else next.add(group.id);
                        return next;
                      })
                    }
                    type="button"
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 text-primary transition-transform",
                        !isExpanded && "-rotate-90",
                      )}
                    />
                    <span>{group.macroCode}</span>
                    <span className="truncate">{group.category}</span>
                    <span>{group.voices.length}</span>
                    <span className="text-right text-secondary">sottovoci</span>
                    <span className="text-right text-secondary">voci</span>
                  </button>
                  {isExpanded
                    ? group.voices.map((voice) => (
                        <button
                          aria-pressed={selectedIds.has(voice.id)}
                          className="grid w-full grid-cols-[38px_96px_minmax(180px,1fr)_64px_78px_106px] items-center border-t border-subtle px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                          key={voice.id}
                          onClick={() => onToggle(voice)}
                          type="button"
                        >
                          <span
                            className={cn(
                              "ml-4 flex size-5 items-center justify-center rounded-[6px] border border-subtle",
                              selectedIds.has(voice.id) && "border-primary bg-primary text-white",
                            )}
                          >
                            {selectedIds.has(voice.id) ? <Check className="size-3.5" /> : null}
                          </span>
                          <span className="font-semibold">{voice.code}</span>
                          <span className="truncate" title={voice.description}>
                            {truncateDescription(voice.description)}
                          </span>
                          <span>{voice.unit}</span>
                          <span className="text-right font-semibold">
                            {voice.laborPercentage.toLocaleString("it-IT", {
                              maximumFractionDigits: 2,
                              minimumFractionDigits: 0,
                            })}
                            %
                          </span>
                          <span className="text-right font-semibold">
                            <Currency value={voice.unitPrice} />
                          </span>
                        </button>
                      ))
                    : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export const SelectedVoicesPanel = memo(function SelectedVoicesPanel({
  lines,
  onQuantity,
  onRemove,
  onSurcharge,
}: {
  lines: SalLineView[];
  onQuantity: (voiceId: string, quantity: number) => void;
  onRemove: (voiceId: string) => void;
  onSurcharge: (voiceId: string, percent: number) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-[12px] border border-subtle">
      <div className="min-w-[960px]">
        <div className="grid grid-cols-[42px_112px_minmax(220px,1fr)_58px_82px_104px_96px_118px_118px_42px] bg-muted/45 px-3 py-2 text-xs font-semibold text-secondary">
          <span>#</span>
          <span>Codice</span>
          <span>Descrizione</span>
          <span>U.M.</span>
          <span className="text-right">Manod.</span>
          <span>Quantita</span>
          <span>Magg.</span>
          <span>Ribasso</span>
          <span>Totale riga</span>
          <span />
        </div>
        {lines.length === 0 ? (
          <EmptyTableState message="Seleziona una voce reale dal catalogo per iniziare la bozza SAL." />
        ) : (
          lines.map((line, index) => (
            <SelectedVoiceRow
              index={index}
              key={line.id}
              line={line}
              onQuantity={onQuantity}
              onRemove={onRemove}
              onSurcharge={onSurcharge}
            />
          ))
        )}
      </div>
    </div>
  );
});

export function AccountingRows({ lines }: { lines: SalLineView[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(lines[0]?.id ?? null);

  if (lines.length === 0) {
    return (
      <div className="rounded-[14px] border border-subtle">
        <EmptyTableState message="Il registro SAL apparira quando avrai selezionato almeno una voce tariffaria." />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[14px] border border-subtle">
      <div className="min-w-[1100px]">
        <div className="grid grid-cols-[44px_160px_110px_minmax(260px,1fr)_74px_130px_130px_120px_54px] bg-muted/45 px-3 py-3 text-xs font-semibold text-secondary">
          <span />
          <span>Tariffario</span>
          <span>Codice</span>
          <span>Descrizione voce</span>
          <span>U.M.</span>
          <span>Quantita totale</span>
          <span>Importo</span>
          <span>Stato</span>
          <span />
        </div>
        {lines.map((line) => {
          const expanded = expandedId === line.id;
          return (
            <div className="border-t border-subtle" key={line.id}>
              <button
                aria-expanded={expanded}
                className="grid w-full grid-cols-[44px_160px_110px_minmax(260px,1fr)_74px_130px_130px_120px_54px] items-center px-3 py-3 text-left text-[13px] hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                onClick={() => setExpandedId(expanded ? null : line.id)}
                type="button"
              >
                <ChevronDown
                  className={cn(
                    "size-4 text-primary transition-transform",
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
                <MoreHorizontal className="size-5 text-secondary" />
              </button>
              {expanded ? (
                <div className="grid gap-3 border-t border-subtle bg-muted/20 p-3 lg:grid-cols-[1.25fr_1fr]">
                  <NestedTable
                    columns={[
                      "Descrizione misura",
                      "U.M.",
                      "Fattore 1",
                      "Fattore 2",
                      "Fattore 3",
                      "Quantita",
                      "Note",
                    ]}
                    title="A) Misure"
                  >
                    {line.measurementRows.length === 0 ? (
                      <tr>
                        <td className="px-3 py-3 text-secondary" colSpan={7}>
                          Nessuna misura inserita per questa voce.
                        </td>
                      </tr>
                    ) : (
                      line.measurementRows.map((row) => (
                        <tr className="border-t border-subtle" key={row.id}>
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
                    columns={["Codice", "Descrizione", "Base di calcolo", "%", "Importo generato"]}
                    title="B) Voce collegata / maggiorazione"
                  >
                    {line.linkedCharges.length === 0 ? (
                      <tr>
                        <td className="px-3 py-3 text-secondary" colSpan={5}>
                          Nessuna maggiorazione collegata alla voce.
                        </td>
                      </tr>
                    ) : (
                      line.linkedCharges.map((charge) => (
                        <tr className="border-t border-subtle" key={charge.id}>
                          <td className="px-3 py-2">{charge.code}</td>
                          <td className="px-3 py-2">{charge.description}</td>
                          <td className="px-3 py-2">
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
        "rounded-[12px] border border-subtle bg-white p-4 text-[#10182f] shadow-inner",
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
            {["N.", "Codice", "Descrizione", "U.M.", "Quantita", "Prezzo", "Importo"].map(
              (head) => (
                <th className="border border-[#c9d2e3] p-2 text-left" key={head}>
                  {head}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td className="border border-[#c9d2e3] p-3 text-center text-[#53617a]" colSpan={7}>
                Anteprima disponibile dopo l'inserimento delle voci.
              </td>
            </tr>
          ) : (
            lines.slice(0, compact ? 5 : 8).map((line, index) => (
              <tr key={line.id}>
                <td className="border border-[#c9d2e3] p-2">{index + 1}</td>
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
        "flex items-center justify-between rounded-[12px] border border-subtle bg-card px-3 py-3",
        disabled && "opacity-60",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <span className="truncate text-sm font-semibold">{label}</span>
      </div>
      <span className="hidden text-xs font-semibold text-success md:inline">
        {disabled ? "Non disponibile" : "Pronto per export"}
      </span>
      <Download className="size-4 text-secondary" />
    </div>
  );
}

export function CheckRow({ check }: { check: SalVerificationCheck }) {
  return (
    <div className="grid grid-cols-[minmax(220px,1fr)_120px_minmax(220px,1.4fr)] items-center border-b border-subtle px-3 py-3 text-[13px] last:border-b-0">
      <span className="flex items-center gap-2 font-semibold">
        <Check
          className={cn(
            "size-4",
            check.tone === "success"
              ? "text-success"
              : check.tone === "danger"
                ? "text-danger"
                : "text-warning",
          )}
        />
        {check.label}
      </span>
      <StatusPill tone={check.tone}>{check.result}</StatusPill>
      <span className="text-xs text-secondary">{check.detail}</span>
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
        tone === "danger" && "bg-danger/10 text-danger",
        tone === "warning" && "bg-warning/10 text-warning",
        tone === "success" && "bg-success/10 text-success",
        tone === "info" && "bg-primary/10 text-primary",
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
    <div className="overflow-hidden rounded-[12px] border border-subtle bg-card">
      <div className="border-b border-subtle px-3 py-2 text-[13px] font-bold">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-[12px]">
          <thead className="bg-muted/45 text-secondary">
            <tr>
              {columns.map((column) => (
                <th className="px-3 py-2 font-semibold" key={column}>
                  {column}
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

function SelectedVoiceRow({
  index,
  line,
  onQuantity,
  onRemove,
  onSurcharge,
}: {
  index: number;
  line: SalLineView;
  onQuantity: (voiceId: string, quantity: number) => void;
  onRemove: (voiceId: string) => void;
  onSurcharge: (voiceId: string, percent: number) => void;
}) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className="border-t border-subtle">
      <div className="grid grid-cols-[42px_112px_minmax(220px,1fr)_58px_82px_104px_96px_118px_118px_42px] items-center px-3 py-2 text-[13px]">
        <button
          aria-expanded={expanded}
          aria-label={`Espandi ${line.voice.code}`}
          className="flex size-7 items-center justify-center rounded-[8px] bg-primary/10 text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          <ChevronDown className={cn("size-4 transition-transform", !expanded && "-rotate-90")} />
        </button>
        <span className="font-semibold">{line.voice.code}</span>
        <span className="truncate font-semibold" title={line.voice.description}>
          {truncateDescription(line.voice.description)}
        </span>
        <span>{line.voice.unit}</span>
        <span className="text-right font-semibold">
          {line.voice.laborPercentage.toLocaleString("it-IT", {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0,
          })}
          %
        </span>
        <input
          aria-label={`Quantita per ${line.voice.code}`}
          className="h-8 rounded-[8px] border border-subtle bg-card px-2 text-right text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          min={0}
          onChange={(event) => onQuantity(line.voice.id, Number(event.target.value))}
          step="0.001"
          type="number"
          value={line.quantity}
        />
        <select
          aria-label={`Maggiorazione per ${line.voice.code}`}
          className="h-8 rounded-[8px] border border-subtle bg-card px-2 text-[12px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          onChange={(event) => onSurcharge(line.voice.id, Number(event.target.value))}
          value={line.surchargePercent}
        >
          <option value={0}>0%</option>
          <option value={10}>10%</option>
          <option value={25}>25%</option>
        </select>
        <span className="text-right font-semibold text-danger">
          -<Currency value={line.discountAmount} />
        </span>
        <span className="text-right font-bold text-primary">
          <Currency value={line.totalAmount} />
        </span>
        <button
          aria-label={`Rimuovi ${line.voice.code}`}
          className="ml-auto flex size-8 items-center justify-center rounded-[10px] text-secondary hover:bg-danger/10 hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger"
          onClick={() => onRemove(line.voice.id)}
          type="button"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      {expanded ? (
        <div className="border-t border-subtle bg-muted/20 px-3 py-3">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.9fr]">
            <NestedTable
              columns={["#", "Descrizione misura", "U.M.", "F1", "F2", "F3", "Quantita", "Note"]}
              title="Sottorighe misura"
            >
              {line.measurementRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-secondary" colSpan={8}>
                    Inserisci una quantita nella riga padre per generare il sommario misura.
                  </td>
                </tr>
              ) : (
                line.measurementRows.map((row, rowIndex) => (
                  <tr className="border-t border-subtle" key={row.id}>
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
              title="Collegate / maggiorazioni"
            >
              {line.linkedCharges.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-secondary" colSpan={5}>
                    Nessuna voce collegata attiva.
                  </td>
                </tr>
              ) : (
                line.linkedCharges.map((charge) => (
                  <tr className="border-t border-subtle" key={charge.id}>
                    <td className="px-3 py-2">{charge.code}</td>
                    <td className="px-3 py-2">{charge.description}</td>
                    <td className="px-3 py-2 text-right">
                      <Currency value={charge.baseAmount} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {charge.percent.toLocaleString("it-IT")}
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
      ) : null}
    </div>
  );
}

function groupCatalogVoices(voices: readonly SalVoiceDraft[]): CatalogGroup[] {
  const groups = new Map<string, CatalogGroup>();

  for (const voice of voices) {
    const macroCode = inferMacroCode(voice.code);
    const category = inferVoiceGroupLabel(voice, macroCode);
    const id = `${voice.tariffBookId}::${macroCode}`;
    const current = groups.get(id);

    if (current) {
      current.voices.push(voice);
      continue;
    }

    groups.set(id, {
      category,
      id,
      macroCode,
      tariffBookName: voice.tariffBookName,
      voices: [voice],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      voices: [...group.voices].sort((left, right) => left.code.localeCompare(right.code)),
    }))
    .sort((left, right) => left.macroCode.localeCompare(right.macroCode));
}

function inferMacroCode(code: string): string {
  const trimmedCode = code.trim();
  const digitPrefix = trimmedCode.replace(/\D/g, "");
  if (digitPrefix.length >= 4) {
    return digitPrefix.slice(0, 4);
  }

  const parts = trimmedCode.split(/[.\-_/ ]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[1]}`;
  }
  return parts[0] ?? trimmedCode;
}

function inferVoiceGroupLabel(voice: SalVoiceDraft, macroCode: string): string {
  if (voice.category.trim().length > 0) {
    return `${macroCode} - ${voice.category}`;
  }
  return macroCode ? `Macro voce ${macroCode}` : "Voci tariffario";
}

function truncateDescription(description: string): string {
  const normalized = description.replace(/\s+/g, " ").trim();
  if (normalized.length <= 100) {
    return normalized;
  }
  return `${normalized.slice(0, 97)}...`;
}

function EmptyTableState({ message }: { message: string }) {
  return (
    <div className="border-t border-subtle px-4 py-8 text-center text-[13px] text-secondary">
      {message}
    </div>
  );
}
