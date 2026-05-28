import { useVirtualizer } from "@tanstack/react-virtual";
import { m } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilterSearch } from "@/components/filters/FilterSearch";
import { FilterSelect } from "@/components/filters/FilterSelect";
import { Button } from "@/components/shared/Button";
import { Dialog } from "@/components/shared/Dialog";
import type { DesktopTariffBook } from "@/lib/desktopData";
import { cn } from "@/lib/utils";
import { TariffEditField } from "./TariffEditField";

export type AddVoiceResult = {
  existingBookIds: string[];
  newBook: { name: string; sourceName: string; year: number } | null;
  voiceData: {
    category: string;
    description: string;
    laborPercentage: number | null;
    officialCode: string;
    unitOfMeasure: string;
    unitPrice: number;
  };
};

const ROW_HEIGHT = 56;

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-10px font-bold uppercase tracking-wider",
        status === "draft"
          ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
          : status === "validated"
            ? "bg-[var(--info-soft)] text-[var(--info-base)]"
            : "bg-[var(--success-soft)] text-[var(--success-base)]",
      )}
    >
      {status === "draft" ? "Bozza" : status === "validated" ? "Validato" : "Attivo"}
    </span>
  );
}

export function AddVoiceDialog({
  isOpen,
  onClose,
  tariffBooks,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  tariffBooks: DesktopTariffBook[];
  onSave: (result: AddVoiceResult) => Promise<void>;
}) {
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const currentYear = new Date().getFullYear();
  const [newBookName, setNewBookName] = useState(`${currentYear} EXTRA`);
  const [newBookSourceName, setNewBookSourceName] = useState("");
  const [newBookYear, setNewBookYear] = useState(String(currentYear));
  const [officialCode, setOfficialCode] = useState("");
  const [description, setDescription] = useState("");
  const [unitOfMeasure, setUnitOfMeasure] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [laborPercentage, setLaborPercentage] = useState("");
  const [category, setCategory] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sortedBooks = useMemo(
    () => [...tariffBooks].sort((a, b) => b.year - a.year || a.name.localeCompare(b.name)),
    [tariffBooks],
  );

  const availableYears = useMemo(() => {
    const years = new Set(sortedBooks.map((b) => b.year));
    return [...years].sort((a, b) => b - a).map(String);
  }, [sortedBooks]);

  const availableSources = useMemo(() => {
    const sources = new Set(sortedBooks.map((b) => b.sourceName).filter(Boolean));
    return [...sources].sort();
  }, [sortedBooks]);

  const filteredBooks = useMemo(() => {
    let result = sortedBooks;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.sourceName.toLowerCase().includes(q) ||
          String(b.year).includes(q),
      );
    }
    if (yearFilter !== "all") {
      result = result.filter((b) => String(b.year) === yearFilter);
    }
    if (sourceFilter !== "all") {
      result = result.filter((b) => b.sourceName === sourceFilter);
    }
    return result;
  }, [sortedBooks, searchQuery, yearFilter, sourceFilter]);

  const hasFilters =
    yearFilter !== "all" || sourceFilter !== "all" || searchQuery.trim().length > 0;

  const allFilteredSelected =
    filteredBooks.length > 0 && filteredBooks.every((b) => selectedIds.has(b.id));

  const virtualizer = useVirtualizer({
    count: filteredBooks.length,
    estimateSize: () => ROW_HEIGHT,
    getScrollElement: () => scrollRef.current,
    overscan: 8,
  });

  useEffect(() => {
    if (!isOpen) return;
    setTab("existing");
    setSelectedIds(new Set());
    setSearchQuery("");
    setYearFilter("all");
    setSourceFilter("all");
    setNewBookName(`${new Date().getFullYear()} EXTRA`);
    setNewBookSourceName("");
    setNewBookYear(String(new Date().getFullYear()));
    setOfficialCode("");
    setDescription("");
    setUnitOfMeasure("");
    setUnitPrice("");
    setLaborPercentage("");
    setCategory("");
    setIsSaving(false);
  }, [isOpen]);

  const canSave =
    (tab === "existing" ? selectedIds.size > 0 : newBookName.trim().length > 0) &&
    officialCode.trim().length > 0;

  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAllToggle = useCallback(() => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const b of filteredBooks) next.delete(b.id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const b of filteredBooks) next.add(b.id);
        return next;
      });
    }
  }, [allFilteredSelected, filteredBooks]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setYearFilter("all");
    setSourceFilter("all");
  }, []);

  const handleSave = useCallback(async () => {
    if (!canSave || isSaving) return;
    setIsSaving(true);
    try {
      const parsedPrice = unitPrice.trim()
        ? Number(unitPrice.replace(",", ".").replace(/[^0-9.]/g, ""))
        : 0;
      const parsedLabor = laborPercentage.trim()
        ? Number(laborPercentage.replace(",", ".").replace(/[^0-9.]/g, ""))
        : null;

      await onSave({
        existingBookIds: tab === "existing" ? [...selectedIds] : [],
        newBook:
          tab === "new"
            ? {
                name: newBookName.trim(),
                sourceName: newBookSourceName.trim(),
                year: Number(newBookYear),
              }
            : null,
        voiceData: {
          category,
          description,
          laborPercentage: parsedLabor != null && Number.isNaN(parsedLabor) ? null : parsedLabor,
          officialCode,
          unitOfMeasure,
          unitPrice: Number.isNaN(parsedPrice) ? 0 : parsedPrice,
        },
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  }, [
    canSave,
    isSaving,
    tab,
    selectedIds,
    newBookName,
    newBookSourceName,
    newBookYear,
    category,
    description,
    laborPercentage,
    officialCode,
    unitOfMeasure,
    unitPrice,
    onSave,
    onClose,
  ]);

  return (
    <Dialog
      className="w-[1140px] max-w-none"
      contentClassName="flex max-h-[85vh] flex-col overflow-hidden p-0"
      isOpen={isOpen}
      onClose={onClose}
    >
      {/* Header with double-border style */}
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
        <div className="min-w-0">
          <div className="text-10px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
            Nuova voce tariffaria
          </div>
          <h3 className="mt-1.5 text-21px font-semibold leading-tight text-[var(--text-primary)]">
            Aggiungi voce
          </h3>
        </div>
        <m.button
          aria-label="Chiudi"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]"
          onClick={onClose}
          type="button"
        >
          <X className="size-4" />
        </m.button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-muted)]/25 px-5 pb-0 pt-2">
        <button
          className={cn(
            "relative h-9 rounded-t-lg px-4 text-12px font-semibold transition-colors",
            tab === "existing"
              ? "bg-[var(--surface-base)] text-[var(--accent-primary)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--accent-primary)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
          )}
          onClick={() => setTab("existing")}
          type="button"
        >
          Aggiungi a esistenti
        </button>
        <button
          className={cn(
            "relative h-9 rounded-t-lg px-4 text-12px font-semibold transition-colors",
            tab === "new"
              ? "bg-[var(--surface-base)] text-[var(--accent-primary)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--accent-primary)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
          )}
          onClick={() => setTab("new")}
          type="button"
        >
          Crea nuovo
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <m.div
          key={tab}
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 14 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        >
          {tab === "existing" ? (
            <>
              <fieldset className="mb-5">
                <legend className="mb-3 text-11px font-bold uppercase tracking-caption text-[var(--text-secondary)]">
                  Seleziona tariffari
                </legend>

                {sortedBooks.length > 0 ? (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <FilterSearch
                      className="min-w-0 flex-1"
                      onChange={setSearchQuery}
                      placeholder="Cerca per nome, ente o anno..."
                      value={searchQuery}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <FilterSelect
                        displayMap={
                          new Map([
                            ["all", "Tutti gli anni"],
                            ...availableYears.map((y) => [y, y] as const),
                          ])
                        }
                        label="Anno"
                        onChange={setYearFilter}
                        options={["all", ...availableYears]}
                        value={yearFilter}
                      />
                      <FilterSelect
                        displayMap={
                          new Map([
                            ["all", "Tutti gli enti"],
                            ...availableSources.map((s) => [s, s] as const),
                          ])
                        }
                        label="Ente"
                        onChange={setSourceFilter}
                        options={["all", ...availableSources]}
                        value={sourceFilter}
                      />
                      {hasFilters ? (
                        <button
                          className="flex h-10 items-center gap-1.5 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3.5 text-12px font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                          onClick={clearFilters}
                          type="button"
                        >
                          <svg
                            aria-hidden
                            className="size-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            viewBox="0 0 24 24"
                          >
                            <title>Cancella filtri</title>
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                          Cancella filtri
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {filteredBooks.length > 1 ? (
                  <button
                    className="mb-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-12px font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)]"
                    onClick={handleSelectAllToggle}
                    type="button"
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                        allFilteredSelected
                          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                          : selectedIds.size > 0
                            ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                            : "border-[var(--border-subtle)]",
                      )}
                    >
                      {allFilteredSelected || selectedIds.size > 0 ? (
                        <svg
                          aria-hidden
                          className={cn("size-3", allFilteredSelected ? "" : "opacity-50")}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={3}
                          viewBox="0 0 24 24"
                        >
                          <title>
                            {allFilteredSelected ? "Deseleziona tutti" : "Seleziona tutti"}
                          </title>
                          {allFilteredSelected ? (
                            <path d="M20 6L9 17l-5-5" />
                          ) : (
                            <path d="M6 12h12" />
                          )}
                        </svg>
                      ) : null}
                    </span>
                    {filteredBooks.length === sortedBooks.length
                      ? allFilteredSelected
                        ? "Deseleziona tutti"
                        : `Seleziona tutti (${filteredBooks.length})`
                      : allFilteredSelected
                        ? "Deseleziona tutti i filtrati"
                        : `Seleziona tutti i filtrati (${filteredBooks.length})`}
                  </button>
                ) : null}
              </fieldset>

              <div
                ref={scrollRef}
                className="overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)]"
                style={{ height: Math.min(filteredBooks.length * ROW_HEIGHT, 280) }}
              >
                {filteredBooks.length === 0 ? (
                  <div className="flex items-center justify-center px-4 py-10 text-13px font-medium text-[var(--text-secondary)]">
                    {hasFilters
                      ? "Nessun tariffario corrisponde ai filtri."
                      : "Nessun tariffario disponibile."}
                  </div>
                ) : (
                  <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
                    {virtualizer.getVirtualItems().map((virtualItem) => {
                      const book = filteredBooks[virtualItem.index];
                      if (!book) return null;
                      const checked = selectedIds.has(book.id);
                      return (
                        <div
                          key={book.id}
                          className={cn(
                            "absolute left-0 right-0 flex items-center gap-3 border-b border-[var(--border-subtle)]/50 px-3 transition-colors last:border-b-0",
                            checked && "bg-[var(--accent-primary)]/[0.04]",
                          )}
                          style={{
                            height: `${virtualItem.size}px`,
                            transform: `translateY(${virtualItem.start}px)`,
                          }}
                        >
                          <label
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                              checked
                                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                                : "border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/60",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggle(book.id)}
                              className="sr-only"
                            />
                            {checked ? (
                              <svg
                                aria-hidden
                                className="size-3"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={3}
                                viewBox="0 0 24 24"
                              >
                                <title>Selezionato</title>
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            ) : null}
                          </label>
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-13px font-semibold text-[var(--text-primary)]">
                                  {book.name}
                                </span>
                                <StatusBadge status={book.status} />
                              </div>
                              <span className="mt-0.5 block truncate text-11px font-medium text-[var(--text-secondary)]">
                                {book.sourceName}
                                {book.sourceName ? " · " : ""}
                                {book.year}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedIds.size > 0 ? (
                <p className="mt-3 text-13px font-semibold text-[var(--text-secondary)]">
                  Selezionati{" "}
                  <span className="text-[var(--accent-primary)]">{selectedIds.size}</span>{" "}
                  {selectedIds.size === 1 ? "tariffario" : "tariffari"}
                </p>
              ) : null}
            </>
          ) : (
            <fieldset className="mb-5">
              <legend className="mb-3 text-11px font-bold uppercase tracking-caption text-[var(--text-secondary)]">
                Nuovo tariffario
              </legend>
              <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4">
                <TariffEditField label="Nome" onChange={setNewBookName} value={newBookName} />
                <div className="grid grid-cols-2 gap-3">
                  <TariffEditField
                    label="Ente"
                    onChange={setNewBookSourceName}
                    value={newBookSourceName}
                  />
                  <TariffEditField label="Anno" onChange={setNewBookYear} value={newBookYear} />
                </div>
              </div>
              <p className="mt-2 text-12px font-medium text-[var(--text-tertiary)]">
                La voce verrà salvata in un nuovo tariffario con stato "Attivo".
              </p>
            </fieldset>
          )}
        </m.div>

        {/* Voice Details */}
        <fieldset className="pb-4">
          <legend className="mb-3 text-11px font-bold uppercase tracking-caption text-[var(--text-secondary)]">
            Dettagli voce
          </legend>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_140px] gap-3">
              <TariffEditField label="Codice" onChange={setOfficialCode} value={officialCode} />
              <TariffEditField label="U.M." onChange={setUnitOfMeasure} value={unitOfMeasure} />
            </div>
            <TariffEditField label="Descrizione" onChange={setDescription} value={description} />
            <div className="grid grid-cols-2 gap-3">
              <TariffEditField label="Prezzo (€)" onChange={setUnitPrice} value={unitPrice} />
              <TariffEditField
                label="Manodopera (%)"
                onChange={setLaborPercentage}
                value={laborPercentage}
              />
            </div>
            <TariffEditField label="Categoria" onChange={setCategory} value={category} />
          </div>
        </fieldset>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-6 border-t border-[var(--border-subtle)] bg-[var(--bg-muted)]/30 px-6 py-4">
        <div className="min-w-0">
          {tab === "existing" && selectedIds.size > 0 ? (
            <span className="text-13px font-semibold text-[var(--text-secondary)]">
              Salvataggio in{" "}
              <span className="text-[var(--accent-primary)]">{selectedIds.size}</span>{" "}
              {selectedIds.size === 1 ? "tariffario" : "tariffari"}
            </span>
          ) : tab === "new" && newBookName.trim() ? (
            <span className="text-13px font-semibold text-[var(--text-secondary)]">
              Nuovo tariffario:{" "}
              <span className="text-[var(--text-primary)]">{newBookName.trim()}</span>
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-3">
          <Button disabled={isSaving} onClick={onClose} variant="outline">
            Annulla
          </Button>
          <Button disabled={!canSave || isSaving} onClick={handleSave} variant="primary">
            {isSaving
              ? "Salvataggio..."
              : tab === "existing"
                ? `Salva in ${selectedIds.size} tariffari`
                : "Crea tariffario e salva"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
