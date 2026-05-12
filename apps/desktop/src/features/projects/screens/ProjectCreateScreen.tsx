import { contractSchema } from "@quantara/validation";
import {
  Check,
  CircleAlert,
  FileText,
  Percent,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/shared/ToastProvider";

import { useNavigate } from "@/hooks/useNavigate";
import {
  type CreateDesktopContractRequest,
  type DesktopTariffBook,
  createDesktopContract,
  listDesktopTariffBooks,
  updateDesktopContract,
} from "@/lib/desktopData";

import { readStringRecord, writeJson } from "@/lib/shared-utils";
import { dispatchDataChanged } from "@/lib/sync-events";
import { useAppStore } from "@/store/app-store";

type ProjectFormState = {
  applicationContractCode: string;
  contractorName: string;
  contractualAmount: string;
  frameworkAgreementCode: string;
  tenderDiscountPercent: string;
  tariffBookIds: string[];
  title: string;
  osExcludedAmount: string;
  budgetIvaPercent: string;
  osIvaPercent: string;
};

const projectContractorStorageKey = "quantara.projectContractors.v1";

export function ProjectCreateScreen() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const [tariffBooks, setTariffBooks] = useState<DesktopTariffBook[]>([]);
  const [contractorOptions, setContractorOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState("");
  const [tariffSearchQuery, setTariffSearchQuery] = useState("");

  const filteredTariffBooks = useMemo(() => {
    const q = tariffSearchQuery.trim().toLowerCase();
    if (!q) return tariffBooks;
    return tariffBooks.filter(
      (book) =>
        book.name.toLowerCase().includes(q) ||
        book.sourceName.toLowerCase().includes(q) ||
        String(book.year).includes(q),
    );
  }, [tariffBooks, tariffSearchQuery]);

  const initialValues = useMemo(() => {
    try {
      const raw = window.sessionStorage.getItem("quantara.editingProject.v1");
      if (raw) {
        window.sessionStorage.removeItem("quantara.editingProject.v1");
        return JSON.parse(raw) as ProjectFormState;
      }
    } catch {
      /* no-op */
    }
    return null;
  }, []);

  const defaultTariffBookId = tariffBooks[0]?.id ?? "";

  function createFallbackDraft(): ProjectFormState {
    return {
      applicationContractCode: "",
      contractorName: "",
      contractualAmount: "",
      frameworkAgreementCode: "",
      tenderDiscountPercent: "",
      tariffBookIds: defaultTariffBookId ? [defaultTariffBookId] : [],
      title: "",
      osExcludedAmount: "",
      budgetIvaPercent: "",
      osIvaPercent: "",
    };
  }

  const [draft, setDraft] = useState<ProjectFormState>(() => {
    if (initialValues) {
      const validIds = initialValues.tariffBookIds.filter((id) =>
        tariffBooks.some((book) => book.id === id),
      );
      return {
        ...createFallbackDraft(),
        ...initialValues,
        tariffBookIds: validIds.length > 0 ? validIds : [],
      };
    }
    return createFallbackDraft();
  });

  const firstTariffBook = tariffBooks[0];

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const tariffBooksResult = await listDesktopTariffBooks([]);
        if (!active) return;
        setTariffBooks(tariffBooksResult.data);
        const contractors = readStringRecord(projectContractorStorageKey);
        const uniqueContractors = [...new Set(Object.values(contractors))].sort();
        setContractorOptions(uniqueContractors);
      } catch {
        /* no-op */
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (tariffBooks.length === 0) {
      setDraft((s) => ({ ...s, tariffBookIds: [] }));
      return;
    }
    setDraft((s) => {
      const validIds = s.tariffBookIds.filter((id) => tariffBooks.some((book) => book.id === id));
      return validIds.length > 0
        ? { ...s, tariffBookIds: validIds }
        : { ...s, tariffBookIds: firstTariffBook?.id ? [firstTariffBook.id] : [] };
    });
  }, [firstTariffBook?.id, tariffBooks]);

  const amount = parseLocalizedMoney(draft.contractualAmount);
  const discountPercent = parseFloat(draft.tenderDiscountPercent.replace(",", "."));
  const parsedDiscount =
    Number.isFinite(discountPercent) && discountPercent >= 0 && discountPercent <= 100
      ? discountPercent
      : Number.NaN;
  const validation = getProjectValidation(draft);
  const canGoNext = step === 1 && validation.identityError === null;

  // Sync toolbar state
  useEffect(() => {
    useAppStore.getState().setProjectToolbar({
      canGoNext,
      canSubmit: validation.canSubmit,
      currentStep: step,
      error,
      isEditing: !!initialValues,
      isSaving: saving,
      totalSteps: 2,
    });
  }, [canGoNext, error, initialValues, saving, step, validation.canSubmit]);

  const validationRef = useRef(validation);
  validationRef.current = validation;
  const handleSubmitRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    const handler = (event: Event) => {
      const actionId = (event as CustomEvent<string>).detail;
      if (actionId === "project-goto-step-1") {
        setStep(1);
        setError("");
        return;
      }
      if (actionId === "project-goto-step-2") {
        const err = validationRef.current.identityError;
        if (err) {
          setError(err);
          return;
        }
        setError("");
        setStep(2);
        return;
      }
      if (actionId === "project-submit") {
        handleSubmitRef.current();
      }
    };
    window.addEventListener("project-create-action", handler);
    return () => window.removeEventListener("project-create-action", handler);
  }, []);

  // Subscribe to step navigation from toolbar step clicks
  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prev) => {
      if (
        state.projectPendingStep !== prev.projectPendingStep &&
        state.projectPendingStep !== null
      ) {
        const target = state.projectPendingStep;
        if (target === 1) {
          setStep(1);
          setError("");
        } else if (target === 2) {
          const err = validationRef.current.identityError;
          if (err) {
            setError(err);
            return;
          }
          setError("");
          setStep(2);
        }
        useAppStore.getState().setProjectPendingStep(null);
      }
    });
    return unsub;
  }, []);

  const handleSubmit = useCallback(async () => {
    const err = validation.submitError;
    if (err) {
      setError(err);
      return;
    }

    const osParsed = parseLocalizedMoney(draft.osExcludedAmount);
    const osAmount = Number.isFinite(osParsed) && osParsed > 0 ? osParsed : 0;

    const tariffPriorities = draft.tariffBookIds.map((bookId, index) => ({
      priority: (index + 1) * 10,
      reason: "Tariffario associato al progetto",
      tariffBookId: bookId,
    }));

    const request: CreateDesktopContractRequest = {
      applicationContractCode: sanitizeTextValue(draft.applicationContractCode),
      contractualAmount: amount,
      frameworkAgreementCode: sanitizeTextValue(draft.frameworkAgreementCode),
      id: `contract_locale_${Date.now()}`,
      tenderDiscountPercent: Number.isFinite(parsedDiscount) ? parsedDiscount : 0,
      tariffPriorities,
      title: sanitizeTextValue(draft.title),
      osExcludedAmount: osAmount > 0 ? osAmount : null,
    };

    const parsed = contractSchema.safeParse({
      ...request,
      contractualAmount: { amount: request.contractualAmount, currency: "EUR" },
      tenderDiscountPercent: request.tenderDiscountPercent,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Controlla i dati inseriti.");
      return;
    }

    setSaving(true);

    try {
      const editingContractId = initialValues?.contractorName
        ? window.sessionStorage.getItem("quantara.editingContractId.v1")
        : null;

      if (editingContractId) {
        window.sessionStorage.removeItem("quantara.editingContractId.v1");
        await updateDesktopContract(editingContractId, { ...request, id: editingContractId });
        notify({ message: "Progetto aggiornato.", title: "Aggiornato", tone: "success" });
      } else {
        await createDesktopContract(request);
        notify({ message: "Progetto creato.", title: "Creato", tone: "success" });
      }

      const contractors = readStringRecord(projectContractorStorageKey);
      const contractorName = sanitizeTextValue(draft.contractorName);
      if (contractorName) {
        writeJson(projectContractorStorageKey, {
          ...contractors,
          [request.id]: contractorName,
        });
      }

      dispatchDataChanged();
      navigate("projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [amount, draft, initialValues, navigate, notify, parsedDiscount, validation.submitError]);

  // Keep refs in sync with latest callback/validation
  handleSubmitRef.current = handleSubmit;

  return (
    <main className="relative mx-auto w-full max-w-5xl px-4 pb-10 pt-6 md:px-6">
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="text-10px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
            {initialValues ? "Modifica progetto" : "Nuovo progetto"}
          </div>
          <h2 className="mt-2 max-w-3xl text-28px font-semibold leading-1_05 tracking-neg-0_035em text-[var(--text-primary)] md:text-38px">
            {step === 1 ? "Dati contratto e perimetro" : "Importo e perimetro economico"}
          </h2>
          <p className="mt-2 max-w-2xl text-13px font-medium leading-5 text-[var(--text-secondary)]">
            {step === 1
              ? "Definisci identita, codici contrattuali e appaltatore del progetto."
              : "Definisci importo contrattuale, OS esclusi e tariffari del progetto."}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
        <div className="min-w-0 rounded-2xl bg-[var(--surface-base)]/80 p-5 ring-1 ring-[var(--border-subtle)]/70 md:p-6">
          {step === 1 ? (
            <section>
              <div className="flex items-start gap-4 border-b border-[var(--border-subtle)]/70 pb-5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-14px bg-[var(--info-soft)] text-[var(--info-base)]">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-17px font-semibold text-[var(--text-primary)]">
                    Anagrafica progetto
                  </div>
                  <p className="mt-1 text-13px leading-5 text-[var(--text-secondary)]">
                    Inserisci dati identificativi e codici contrattuali.
                  </p>
                </div>
              </div>
              <div className="mt-6 grid gap-x-4 gap-y-5 md:grid-cols-2">
                <ProjectTextField
                  label="Nome progetto"
                  onChange={(v) => setDraft((s) => ({ ...s, title: sanitizeTextInput(v) }))}
                  placeholder="Linea AV/AC Milano-Verona"
                  value={draft.title}
                />
                <ProjectTextField
                  label="Contratto applicativo"
                  onChange={(v) =>
                    setDraft((s) => ({ ...s, applicationContractCode: sanitizeTextInput(v) }))
                  }
                  placeholder="CA-MV-001"
                  value={draft.applicationContractCode}
                />
                <ProjectTextField
                  label="Accordo quadro"
                  onChange={(v) =>
                    setDraft((s) => ({ ...s, frameworkAgreementCode: sanitizeTextInput(v) }))
                  }
                  placeholder="AQ-RFI-2026"
                  value={draft.frameworkAgreementCode}
                />
                <ContractorSelect
                  options={contractorOptions}
                  value={draft.contractorName}
                  onChange={(v) =>
                    setDraft((s) => ({ ...s, contractorName: sanitizeTextInput(v) }))
                  }
                />
              </div>
            </section>
          ) : (
            <section>
              <div className="flex items-start gap-4 border-b border-[var(--border-subtle)]/70 pb-5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-14px bg-[var(--info-soft)] text-[var(--info-base)]">
                  <WalletCards className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-17px font-semibold text-[var(--text-primary)]">
                    Setup economico
                  </div>
                  <p className="mt-1 text-13px leading-5 text-[var(--text-secondary)]">
                    Definisci importi principali del progetto.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-x-4 gap-y-5 md:grid-cols-2">
                <div className="space-y-2">
                  <ProjectCurrencyField
                    label="Importo contrattuale"
                    onChange={(v) => setDraft((s) => ({ ...s, contractualAmount: v }))}
                    placeholder="26.150.000,00"
                    value={draft.contractualAmount}
                  />
                  <IvaToggleInput
                    label="IVA su importo"
                    percent={draft.budgetIvaPercent}
                    baseAmount={parseLocalizedMoney(draft.contractualAmount)}
                    onChange={(pct) => setDraft((s) => ({ ...s, budgetIvaPercent: pct }))}
                  />
                </div>

                <label className="block">
                  <span className="text-11px font-semibold uppercase tracking-overline text-[var(--text-secondary)]">
                    Ribasso d'asta (%)
                  </span>
                  <input
                    className="mt-3 h-11 w-full rounded-14px border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 px-4 text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                    max={100}
                    min={0}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || v === "-") {
                        setDraft((s) => ({ ...s, tenderDiscountPercent: v }));
                        return;
                      }
                      const parsed = parseFloat(v.replace(",", "."));
                      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100)
                        setDraft((s) => ({
                          ...s,
                          tenderDiscountPercent: String(Math.round(parsed * 100) / 100),
                        }));
                    }}
                    placeholder="18,25"
                    step="0.01"
                    type="number"
                    value={draft.tenderDiscountPercent}
                  />
                </label>
              </div>

              <div className="mt-5">
                <ProjectCurrencyField
                  label="OS Esclusi da ribassi"
                  onChange={(v) => setDraft((s) => ({ ...s, osExcludedAmount: v }))}
                  placeholder="1.500.000,00"
                  value={draft.osExcludedAmount}
                />
                <IvaToggleInput
                  label="IVA su OS esclusi"
                  percent={draft.osIvaPercent}
                  baseAmount={parseLocalizedMoney(draft.osExcludedAmount)}
                  onChange={(pct) => setDraft((s) => ({ ...s, osIvaPercent: pct }))}
                />
              </div>

              <div className="mt-5 rounded-18px bg-[var(--bg-muted)]/70 px-4 py-3 text-xs font-medium leading-5 text-[var(--text-secondary)]">
                Il ribasso viene applicato a tutte le voci SAL. Le voci OS (oneri sicurezza) sono
                escluse automaticamente.
              </div>

              <div className="mt-6 border-t border-[var(--border-subtle)]/70 pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-12px bg-[var(--info-soft)] text-[var(--info-base)]">
                    <FileText className="size-5" />
                  </div>
                  <div>
                    <div className="text-14px font-semibold text-[var(--text-primary)]">
                      Tariffari associati
                    </div>
                    <p className="mt-0.5 text-12px text-[var(--text-secondary)]">
                      Seleziona i tariffari da collegare al progetto.
                    </p>
                  </div>
                </div>
                {tariffBooks.length === 0 ? (
                  <p className="mt-3 text-12px text-[var(--text-secondary)]">
                    Nessun tariffario disponibile.
                  </p>
                ) : (
                  <>
                    <div className="relative mt-4">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                      <input
                        className="h-10 w-full rounded-12px border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 pl-9 pr-3 text-13px font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                        onChange={(e) => setTariffSearchQuery(e.target.value)}
                        placeholder={`Cerca tra ${tariffBooks.length} tariffari...`}
                        value={tariffSearchQuery}
                      />
                    </div>
                    {filteredTariffBooks.length === 0 ? (
                      <p className="mt-3 text-12px text-[var(--text-secondary)]">
                        Nessun tariffario corrisponde alla ricerca.
                      </p>
                    ) : (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {filteredTariffBooks.map((book) => {
                          const isSelected = draft.tariffBookIds.includes(book.id);
                          return (
                            <button
                              className={`flex items-center gap-3 rounded-14px border px-4 py-3 text-left transition-all ${
                                isSelected
                                  ? "border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,var(--surface-base)_92%)]"
                                  : "border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/50 hover:border-[var(--border-subtle)]"
                              }`}
                              key={book.id}
                              onClick={() =>
                                setDraft((s) => ({
                                  ...s,
                                  tariffBookIds: isSelected
                                    ? s.tariffBookIds.filter((id) => id !== book.id)
                                    : [...s.tariffBookIds, book.id],
                                }))
                              }
                              type="button"
                            >
                              <span
                                className={`flex size-6 shrink-0 items-center justify-center rounded-md border ${
                                  isSelected
                                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                                    : "border-[var(--border-subtle)]"
                                }`}
                              >
                                {isSelected && <Check className="size-3.5" strokeWidth={3} />}
                              </span>
                              <div className="min-w-0">
                                <div className="truncate text-13px font-semibold text-[var(--text-primary)]">
                                  {book.name}
                                </div>
                                <div className="mt-0.5 text-11px text-[var(--text-secondary)]">
                                  Anno {book.year} · {book.sourceName}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl bg-[var(--surface-base)]/80 p-5 ring-1 ring-[var(--border-subtle)]/70">
            <div className="text-11px font-semibold uppercase tracking-overline text-[var(--text-secondary)]">
              Anteprima
            </div>
            <div className="mt-4 rounded-22px bg-[var(--surface-base)] p-4 shadow-none">
              <div className="truncate text-lg font-semibold text-[var(--text-primary)]">
                {draft.title.trim() || "Nuovo progetto"}
              </div>
              <div className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
                {draft.applicationContractCode.trim() || "Contratto applicativo"} ·{" "}
                {draft.frameworkAgreementCode.trim() || "Accordo quadro"}
              </div>
              <div className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">
                {draft.contractorName.trim() || "Appaltatore da selezionare"}
              </div>
              <div className="mt-4 grid gap-3">
                <BudgetPreviewRow
                  amount={amount}
                  ivaPct={draft.budgetIvaPercent}
                  label="Importo contrattuale"
                />

                <PreviewMetric
                  icon={<ShieldCheck className="size-5" />}
                  label="Ribasso d'asta"
                  value={
                    Number.isFinite(parsedDiscount)
                      ? `${parsedDiscount.toLocaleString("it-IT")}%`
                      : "Da inserire"
                  }
                />

                <BudgetPreviewRow
                  amount={parseLocalizedMoney(draft.osExcludedAmount)}
                  ivaPct={draft.osIvaPercent}
                  label="OS esclusi da ribasso"
                  fallback="Non impostato"
                />

                <PreviewMetric
                  icon={<FileText className="size-5" />}
                  label="Tariffari associati"
                  value={
                    draft.tariffBookIds.length > 0
                      ? `${draft.tariffBookIds.length} tariffari`
                      : "Nessuno"
                  }
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--surface-base)]/80 p-5 ring-1 ring-[var(--border-subtle)]/70">
            <div className="text-11px font-semibold uppercase tracking-overline text-[var(--text-secondary)]">
              Controlli rapidi
            </div>
            <div className="mt-3 grid gap-2 text-xs text-[var(--text-secondary)]">
              <QuickCheckRow isOk={validation.checks.identity} label="Nome progetto compilato" />
              <QuickCheckRow isOk={validation.checks.amount} label="Importo contrattuale valido" />
              <QuickCheckRow isOk={validation.checks.discount} label="Ribasso valido (0-100%)" />
              <QuickCheckRow isOk={validation.checks.os} label="OS esclusi &lt; budget" />
              <QuickCheckRow isOk={draft.tariffBookIds.length > 0} label="Almeno un tariffario" />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ProjectTextField({
  label,
  onChange,
  onKeyDown,
  placeholder,
  value,
}: {
  label: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-11px font-semibold uppercase tracking-overline text-[var(--text-secondary)]">
        {label}
      </span>
      <input
        className="mt-3 h-11 w-full rounded-14px border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 px-4 text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </label>
  );
}

function ProjectCurrencyField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (v: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-11px font-semibold uppercase tracking-overline text-[var(--text-secondary)]">
        {label}
      </span>
      <input
        className="mt-3 h-11 w-full rounded-14px border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 px-4 text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
        inputMode="decimal"
        onChange={(e) => onChange(sanitizeMoneyInput(e.target.value))}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </label>
  );
}

function IvaToggleInput({
  baseAmount,
  label,
  onChange,
  percent,
}: {
  baseAmount: number;
  label: string;
  onChange: (v: string) => void;
  percent: string;
}) {
  const [isOpen, setIsOpen] = useState(percent !== "");
  const pct = parseFloat(percent.replace(",", "."));
  const hasValidPct = Number.isFinite(pct) && pct > 0;
  const ivaAmount = hasValidPct && Number.isFinite(baseAmount) ? baseAmount * (pct / 100) : 0;
  const total = ivaAmount > 0 && Number.isFinite(baseAmount) ? baseAmount + ivaAmount : 0;

  return (
    <div className="mt-2 space-y-2">
      <button
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-11px font-semibold transition-colors ${
          isOpen
            ? "bg-[var(--info-soft)] text-[var(--info-base)] ring-1 ring-[var(--info-base)]/30"
            : "bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted-strong)]"
        }`}
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) onChange("");
        }}
        type="button"
      >
        <Percent className="size-3" />
        {label}
      </button>
      {isOpen ? (
        <div className="space-y-1.5 rounded-12px bg-[var(--bg-muted)]/50 p-3">
          <div className="flex items-center gap-2">
            <input
              className="h-8 w-20 rounded-lg border border-[var(--border-subtle)]/70 bg-[var(--surface-base)] px-2.5 text-12px font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
              max={100}
              min={0}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || v === "-") {
                  onChange(v);
                  return;
                }
                const parsed = parseFloat(v.replace(",", "."));
                if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100)
                  onChange(String(Math.round(parsed * 100) / 100));
              }}
              placeholder="22"
              step="0.1"
              type="number"
              value={percent}
            />
            <span className="text-11px font-medium text-[var(--text-secondary)]">% IVA</span>
          </div>
          {Number.isFinite(baseAmount) && baseAmount > 0 ? (
            <div className="space-y-0.5 text-11px font-medium text-[var(--text-secondary)]">
              <div className="flex justify-between">
                <span>BASE</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {formatAmount(baseAmount)}
                </span>
              </div>
              {hasValidPct ? (
                <div className="flex justify-between">
                  <span>+ IVA ({pct.toLocaleString("it-IT")}%)</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {formatAmount(ivaAmount)}
                  </span>
                </div>
              ) : null}
              {hasValidPct ? (
                <div className="flex justify-between border-t border-[var(--border-subtle)]/50 pt-0.5">
                  <span className="font-semibold text-[var(--info-base)]">= TOTALE</span>
                  <span className="font-semibold text-[var(--info-base)]">
                    {formatAmount(total)}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BudgetPreviewRow({
  amount,
  ivaPct,
  label,
  fallback,
}: {
  amount: number;
  ivaPct: string;
  label: string;
  fallback?: string;
}) {
  const pct = parseFloat(ivaPct.replace(",", "."));
  const hasIva = ivaPct !== "" && Number.isFinite(pct) && pct > 0;
  const ivaAmount = hasIva && Number.isFinite(amount) ? amount * (pct / 100) : 0;
  const total = hasIva && Number.isFinite(amount) ? amount + ivaAmount : 0;

  if (!Number.isFinite(amount) || amount <= 0) {
    return (
      <PreviewMetric
        icon={<WalletCards className="size-5" />}
        label={label}
        value={fallback ?? "Da inserire"}
      />
    );
  }

  return (
    <div className="rounded-xl bg-[var(--bg-muted)]/70 p-3">
      <div className="text-10px font-semibold uppercase tracking-overline text-[var(--text-secondary)]">
        {label}
      </div>
      <div className="mt-1 space-y-0.5">
        <div className="flex items-center justify-between text-sm font-semibold text-[var(--text-primary)]">
          <span>BASE</span>
          <span>{formatAmount(amount)}</span>
        </div>
        {hasIva ? (
          <>
            <div className="flex items-center justify-between text-12px font-medium text-[var(--info-base)]">
              <span>+ IVA ({pct.toLocaleString("it-IT")}%)</span>
              <span>{formatAmount(ivaAmount)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--border-subtle)]/50 pt-0.5 text-13px font-bold text-[var(--text-primary)]">
              <span>= TOTALE</span>
              <span>{formatAmount(total)}</span>
            </div>
          </>
        ) : (
          <div className="text-11px font-medium text-[var(--text-secondary)]">
            (IVA non applicata)
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--bg-muted)]/70 p-3">
      <div className="min-w-0">
        <div className="text-10px font-semibold uppercase tracking-overline text-[var(--text-secondary)]">
          {label}
        </div>
        <div className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">
          {value}
        </div>
      </div>
      <div className="text-[var(--text-secondary)]">{icon}</div>
    </div>
  );
}

function QuickCheckRow({ isOk, label }: { isOk: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-14px bg-[var(--surface-base)] px-3 py-2">
      <span className="flex min-w-0 items-center gap-2">
        {isOk ? (
          <Check className="size-4 shrink-0 text-[var(--success-base)]" />
        ) : (
          <CircleAlert className="size-4 shrink-0 text-[var(--warning-base)]" />
        )}
        <span className="truncate">{label}</span>
      </span>
      <span
        className={
          isOk
            ? "rounded-full bg-[var(--success-soft)] px-3 py-1 text-11px font-bold text-[var(--success-base)]"
            : "rounded-full bg-[var(--warning-soft)] px-3 py-1 text-11px font-bold text-[var(--warning-base)]"
        }
      >
        {isOk ? "OK" : "Check"}
      </span>
    </div>
  );
}

function ContractorSelect({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFilter("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(filter.toLowerCase()));

  return (
    <label className="block">
      <span className="text-11px font-semibold uppercase tracking-overline text-[var(--text-secondary)]">
        Appaltatore
      </span>
      <div className="relative mt-3" ref={ref}>
        {/* biome-ignore lint/a11y/useSemanticElements: wrapper needs a div because it contains an input */}
        <div
          className="flex h-11 w-full cursor-pointer items-center rounded-14px border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 px-4 text-sm font-medium text-[var(--text-primary)] outline-none transition focus-within:border-[var(--accent-primary)] focus-within:ring-2 focus-within:ring-[var(--ring-focus)]"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={() => {}}
          role="button"
          tabIndex={0}
        >
          <input
            className="flex-1 bg-transparent outline-none text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
            onChange={(e) => {
              setFilter(e.target.value);
              setIsOpen(true);
            }}
            onClick={(e) => e.stopPropagation()}
            placeholder="RFI"
            type="text"
            value={isOpen ? filter : value}
          />
        </div>
        {isOpen ? (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-48 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] py-1 shadow-lg">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-[var(--text-secondary)]">Nessun risultato</div>
            ) : (
              filtered.map((option) => (
                <button
                  className="flex w-full items-center px-3 py-2.5 text-left text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)]"
                  key={option}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                    setFilter("");
                  }}
                  type="button"
                >
                  {option}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    </label>
  );
}

function sanitizeTextInput(value: string) {
  return value
    .replace(/\s+/g, " ")
    .split("")
    .filter((char) => {
      const codePoint = char.charCodeAt(0);
      return (codePoint >= 32 && codePoint !== 127) || codePoint === 10 || codePoint === 13;
    })
    .join("");
}

function sanitizeTextValue(value: string) {
  return sanitizeTextInput(value).trim();
}

function sanitizeMoneyInput(value: string) {
  const normalized = value.replace(/\s+/g, "").replace(/[٫،]/g, ",").replace(/[．]/g, ".");
  const sanitized = normalized.replace(/[^\d.,]/g, "");
  if (!sanitized) return "";
  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");
  const sepIndex = Math.max(lastComma, lastDot);
  if (sepIndex < 0) return sanitized.replace(/[.,]/g, "");
  const intPart = sanitized.slice(0, sepIndex).replace(/[.,]/g, "");
  const decPart = sanitized
    .slice(sepIndex + 1)
    .replace(/[.,]/g, "")
    .slice(0, 2);
  const sep = sanitized[sepIndex];
  const hasTrailing = sepIndex === sanitized.length - 1;
  if (!intPart && !decPart && hasTrailing) return "";
  if (!decPart && hasTrailing) return `${intPart}${sep}`;
  return decPart ? `${intPart}${sep}${decPart}` : intPart;
}

function parseLocalizedMoney(value: string) {
  const sanitized = sanitizeMoneyInput(value);
  if (!sanitized) return Number.NaN;
  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");
  const sepIndex = Math.max(lastComma, lastDot);
  const intRaw = sepIndex < 0 ? sanitized.replace(/[.,]/g, "") : sanitized.slice(0, sepIndex);
  const intPart = intRaw.replace(/[.,]/g, "");
  const decPart =
    sepIndex < 0
      ? ""
      : sanitized
          .slice(sepIndex + 1)
          .replace(/[.,]/g, "")
          .slice(0, 2);
  if (!intPart && !decPart) return Number.NaN;
  const normalized = decPart ? `${intPart || "0"}.${decPart}` : intPart || "0";
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function validateProjectIdentity(draft: ProjectFormState) {
  if (sanitizeTextValue(draft.title).length < 3)
    return "Inserisci un nome progetto di almeno 3 caratteri.";
  if (sanitizeTextValue(draft.applicationContractCode).length < 2)
    return "Inserisci il codice del contratto applicativo.";
  if (sanitizeTextValue(draft.frameworkAgreementCode).length < 2)
    return "Inserisci il codice dell'accordo quadro.";
  if (sanitizeTextValue(draft.contractorName).length < 2)
    return "Seleziona o inserisci l'appaltatore del progetto.";
  return null;
}

function getProjectValidation(draft: ProjectFormState) {
  const identityError = validateProjectIdentity(draft);
  const amount = parseLocalizedMoney(draft.contractualAmount);
  const discountStr = draft.tenderDiscountPercent.replace(",", ".");
  const discountVal = parseFloat(discountStr);
  const hasValidAmount = Number.isFinite(amount) && amount > 0;
  const hasValidDiscount =
    discountStr === "" || (Number.isFinite(discountVal) && discountVal >= 0 && discountVal <= 100);
  const osParsed = parseLocalizedMoney(draft.osExcludedAmount);
  const hasValidOs =
    draft.osExcludedAmount === "" ||
    (Number.isFinite(osParsed) && osParsed > 0 && hasValidAmount && osParsed < amount);

  if (identityError) {
    return {
      canSubmit: false,
      checks: {
        amount: hasValidAmount,
        discount: hasValidDiscount,
        identity: false,
        os: hasValidOs,
      },
      identityError,
      submitError: identityError,
    };
  }

  let submitError: string | null = null;
  if (!hasValidAmount) submitError = "Inserisci un importo contrattuale valido e maggiore di zero.";
  else if (!hasValidDiscount) submitError = "Inserisci un ribasso valido tra 0 e 100%.";
  else if (Number.isFinite(osParsed) && osParsed > 0 && hasValidAmount && osParsed >= amount)
    submitError = "L'importo OS esclusi da ribassi deve essere inferiore al budget contrattuale.";

  return {
    canSubmit: submitError === null,
    checks: { amount: hasValidAmount, discount: hasValidDiscount, identity: true, os: hasValidOs },
    identityError,
    submitError,
  };
}

function formatAmount(v: number) {
  return v.toLocaleString("it-IT", {
    currency: "EUR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  });
}
