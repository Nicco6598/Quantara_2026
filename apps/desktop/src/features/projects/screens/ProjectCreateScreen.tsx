import { contractSchema } from "@quantara/validation";
import { m } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  FileText,
  Percent,
  Save,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/ToastProvider";
import { clearAutoDraft, loadAutoDraft, saveAutoDraft, useAutoSave } from "@/hooks/use-auto-save";
import { useActionHandler } from "@/hooks/useAction";
import { useNavigate } from "@/hooks/useNavigate";
import {
  type CreateDesktopContractRequest,
  createDesktopContract,
  type DesktopTariffBook,
  listDesktopContracts,
  listDesktopTariffBooks,
  updateDesktopContract,
} from "@/lib/desktopData";

import { normalizeContractorName, readStringRecord, writeJson } from "@/lib/shared-utils";
import { dispatchDataChanged } from "@/lib/sync-events";
import { motionDuration, motionEase, motionSpring } from "@/motion";
import { isContractorMigrationComplete } from "@/lib/contractor-resolve";
import { takeProjectEditSession } from "@/lib/workflow-navigation";
import { STORAGE_KEYS } from "@/persistence/storage-keys";
import { useAppStore } from "@/store/app-store";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";
import { cn } from "@/lib/utils";
import {
  AlertBanner,
  Button,
  DetailList,
  DetailRow,
  MetricCard,
  Panel,
  StatusChip,
} from "@/components/shared";
import { CurrencyField, SelectField, TextField } from "@/components/shared/form";
import type { SelectOption } from "@/components/shared/form";

const PROJECT_AUTO_DRAFT_KEY = STORAGE_KEYS.projectAutoDraft;
const PROJECT_STEPPER_SPRING = { type: "spring", ...motionSpring.panel } as const;
const PROJECT_STEPPER_REVEAL = {
  duration: motionDuration.reveal,
  ease: motionEase.emphasized,
} as const;

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

const projectContractorStorageKey = STORAGE_KEYS.projectContractors;
const contractorRegistryStorageKey = STORAGE_KEYS.contractorRegistry;

type ProjectUIState = {
  draft: ProjectFormState;
  step: 1 | 2;
  error: string;
  tariffSearchQuery: string;
};

type ProjectUIAction =
  | {
      type: "SET_DRAFT";
      payload: ProjectFormState | ((prev: ProjectFormState) => ProjectFormState);
    }
  | { type: "NAVIGATE_STEP"; payload: { step: 1 | 2; error: string } }
  | { type: "SET_ERROR"; payload: string }
  | { type: "SET_TARIFF_SEARCH"; payload: string };

function projectUIReducer(state: ProjectUIState, action: ProjectUIAction): ProjectUIState {
  switch (action.type) {
    case "SET_DRAFT":
      return {
        ...state,
        draft:
          typeof action.payload === "function"
            ? (action.payload as (prev: ProjectFormState) => ProjectFormState)(state.draft)
            : action.payload,
      };
    case "NAVIGATE_STEP":
      return { ...state, step: action.payload.step, error: action.payload.error };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_TARIFF_SEARCH":
      return { ...state, tariffSearchQuery: action.payload };
  }
}

export function ProjectCreateScreen() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const [tariffBooks, setTariffBooks] = useState<DesktopTariffBook[]>([]);
  const [contractorOptions, setContractorOptions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [tariffYearFilterOpen, setTariffYearFilterOpen] = useState(false);
  const [tariffYearFilters, setTariffYearFilters] = useState<number[]>([]);
  const savingRef = useRef(false);

  const editSession = useMemo(() => takeProjectEditSession(), []);
  const editingContractIdRef = useRef(editSession?.contractId ?? null);

  const initialValues = useMemo(() => {
    return (editSession?.form as ProjectFormState | undefined) ?? null;
  }, [editSession]);

  const [ui, dispatch] = useReducer(projectUIReducer, null, () => ({
    draft: initialValues ?? {
      applicationContractCode: "",
      contractorName: "",
      contractualAmount: "",
      frameworkAgreementCode: "",
      tenderDiscountPercent: "",
      tariffBookIds: [],
      title: "",
      osExcludedAmount: "",
      budgetIvaPercent: "",
      osIvaPercent: "",
    },
    step: 1 as const,
    error: "",
    tariffSearchQuery: "",
  }));
  const { draft, step, error, tariffSearchQuery } = ui;

  const availableTariffYears = useMemo(
    () => [...new Set(tariffBooks.map((book) => book.year))].sort((a, b) => b - a),
    [tariffBooks],
  );

  const filteredTariffBooks = useMemo(() => {
    const q = tariffSearchQuery.trim().toLowerCase();
    const selectedYears = new Set(tariffYearFilters);
    return tariffBooks.filter((book) => {
      if (selectedYears.size > 0 && !selectedYears.has(book.year)) return false;
      if (!q) return true;
      return (
        book.name.toLowerCase().includes(q) ||
        book.sourceName.toLowerCase().includes(q) ||
        String(book.year).includes(q)
      );
    });
  }, [tariffBooks, tariffSearchQuery, tariffYearFilters]);

  const firstTariffBook = tariffBooks[0];

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [tariffBooksResult, contractsResult] = await Promise.all([
          listDesktopTariffBooks([]),
          listDesktopContracts([]),
        ]);
        if (!active) return;
        setTariffBooks(tariffBooksResult.data);
        const contractors = readStringRecord(projectContractorStorageKey);
        const registry = readStringList(contractorRegistryStorageKey);
        const assignedContractorNames = contractsResult.data.reduce<string[]>((acc, contract) => {
          const name = contract.contractorName ?? contractors[contract.id];
          if (typeof name === "string" && name.trim() !== "") acc.push(name);
          return acc;
        }, []);
        const uniqueContractors = mergeContractorOptions([...registry, ...assignedContractorNames]);
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
      dispatch({ type: "SET_DRAFT", payload: (s) => ({ ...s, tariffBookIds: [] }) });
      return;
    }
    dispatch({
      type: "SET_DRAFT",
      payload: (s) => {
        const validIds = s.tariffBookIds.filter((id) => tariffBooks.some((book) => book.id === id));
        return validIds.length > 0
          ? { ...s, tariffBookIds: validIds }
          : { ...s, tariffBookIds: firstTariffBook?.id ? [firstTariffBook.id] : [] };
      },
    });
  }, [firstTariffBook?.id, tariffBooks]);

  const amount = parseLocalizedMoney(draft.contractualAmount);
  const discountPercent = parseFloat(draft.tenderDiscountPercent.replace(",", "."));
  const parsedDiscount =
    Number.isFinite(discountPercent) && discountPercent >= 0 && discountPercent <= 100
      ? discountPercent
      : Number.NaN;
  const validation = useMemo(() => getProjectValidation(draft), [draft]);
  const canGoNext = step === 1 && validation.identityError === null;

  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const restoredDraftRef = useRef<ProjectFormState | null>(null);

  useEffect(() => {
    if (!initialValues) {
      const savedDraft = loadAutoDraft<ProjectFormState>(PROJECT_AUTO_DRAFT_KEY);
      if (savedDraft?.title) {
        restoredDraftRef.current = savedDraft;
        setShowRestoreDialog(true);
      }
    }
  }, [initialValues]);

  const handleRestoreDraft = useCallback(() => {
    if (restoredDraftRef.current) {
      dispatch({ type: "SET_DRAFT", payload: restoredDraftRef.current });
    }
    setShowRestoreDialog(false);
  }, []);

  const handleDiscardDraft = useCallback(() => {
    clearAutoDraft(PROJECT_AUTO_DRAFT_KEY);
    setShowRestoreDialog(false);
  }, []);

  const handleProjectAutoSave = useCallback((data: unknown) => {
    saveAutoDraft(PROJECT_AUTO_DRAFT_KEY, data);
  }, []);

  const autoSave = useAutoSave({
    data: draft,
    intervalMs: 30000,
    key: PROJECT_AUTO_DRAFT_KEY,
    onSave: handleProjectAutoSave,
  });

  useEffect(() => {
    useAppStore.getState().setProjectToolbar({
      autoSaveLastSaved: autoSave.lastSaved,
      autoSaveStatus: autoSave.status,
      canGoNext,
      canSubmit: validation.canSubmit,
      currentStep: step,
      error,
      isEditing: !!initialValues,
      isSaving,
      totalSteps: 2,
    });
  }, [
    autoSave.lastSaved,
    autoSave.status,
    canGoNext,
    error,
    initialValues,
    isSaving,
    step,
    validation.canSubmit,
  ]);

  const handleSubmitRef = useRef<() => Promise<void>>(async () => {});

  useActionHandler(
    "project.submit",
    useCallback(() => {
      handleSubmitRef.current();
    }, []),
  );

  // Subscribe to step navigation from toolbar step clicks
  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prev) => {
      if (
        state.projectPendingStep !== prev.projectPendingStep &&
        state.projectPendingStep !== null
      ) {
        const target = state.projectPendingStep;
        if (target === 1) {
          dispatch({ type: "NAVIGATE_STEP", payload: { step: 1, error: "" } });
        } else if (target === 2) {
          dispatch({ type: "NAVIGATE_STEP", payload: { step: 2, error: "" } });
        }
        useAppStore.getState().setProjectPendingStep(null);
      }
    });
    return unsub;
  }, []);

  const handleSubmit = useCallback(async () => {
    const err = validation.submitError;
    if (err) {
      dispatch({ type: "SET_ERROR", payload: err });
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
      contractorName: sanitizeTextValue(draft.contractorName) || null,
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
      dispatch({
        type: "SET_ERROR",
        payload: parsed.error.issues[0]?.message ?? "Controlla i dati inseriti.",
      });
      return;
    }

    savingRef.current = true;
    setIsSaving(true);

    try {
      const editingContractId = editingContractIdRef.current;

      const savedContract = editingContractId
        ? await updateDesktopContract(editingContractId, { ...request, id: editingContractId })
        : await createDesktopContract(request);

      if (editingContractId) {
        editingContractIdRef.current = null;
        notify({ message: "Progetto aggiornato.", title: "Aggiornato", tone: "success" });
      } else {
        notify({ message: "Progetto creato.", title: "Creato", tone: "success" });
      }

      const contractorName = sanitizeTextValue(draft.contractorName);
      if (contractorName && !isContractorMigrationComplete()) {
        const contractors = readStringRecord(projectContractorStorageKey);
        writeJson(projectContractorStorageKey, {
          ...contractors,
          [savedContract.id]: contractorName,
        });
      }

      // Sync SAL workflow project so the project appears in SAL screens immediately
      useSalWorkflowStore.getState().createProject({
        client: contractorName || "Senza appaltatore",
        description: `${sanitizeTextValue(draft.frameworkAgreementCode)} - ${sanitizeTextValue(draft.applicationContractCode)}`,
        id: savedContract.id,
        name: sanitizeTextValue(draft.title),
        year: new Date().getFullYear(),
      });

      dispatchDataChanged();
      navigate("projects");
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : String(err) });
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [amount, draft, navigate, notify, parsedDiscount, validation.submitError]);

  // Keep refs in sync with latest callback/validation
  handleSubmitRef.current = handleSubmit;

  const handleGoToStep = useCallback((targetStep: 1 | 2) => {
    dispatch({ type: "NAVIGATE_STEP", payload: { step: targetStep, error: "" } });
  }, []);

  const handleSaveDraft = useCallback(() => {
    saveAutoDraft(PROJECT_AUTO_DRAFT_KEY, draft);
    notify({ message: "Bozza progetto salvata.", title: "Bozza salvata", tone: "success" });
  }, [draft, notify]);

  const actionFeedback =
    error ||
    (step === 1
      ? validation.identityError
      : (validation.submitError ?? "Il progetto è pronto per la creazione."));
  const actionFeedbackTone =
    error || (step === 1 ? validation.identityError : validation.submitError)
      ? "warning"
      : "success";

  const contractorSelectOptions: SelectOption[] = useMemo(
    () => contractorOptions.map((name) => ({ value: name, label: name })),
    [contractorOptions],
  );

  const budgetIvaPct = parseFloat(draft.budgetIvaPercent.replace(",", "."));
  const hasBudgetIva =
    draft.budgetIvaPercent !== "" && Number.isFinite(budgetIvaPct) && budgetIvaPct > 0;
  const budgetIvaAmount =
    hasBudgetIva && Number.isFinite(amount) ? amount * (budgetIvaPct / 100) : 0;
  const budgetIvaTotal = hasBudgetIva && Number.isFinite(amount) ? amount + budgetIvaAmount : 0;

  const osParsed = parseLocalizedMoney(draft.osExcludedAmount);
  const osIvaPctVal = parseFloat(draft.osIvaPercent.replace(",", "."));
  const hasOsIva = draft.osIvaPercent !== "" && Number.isFinite(osIvaPctVal) && osIvaPctVal > 0;
  const osIvaAmount = hasOsIva && Number.isFinite(osParsed) ? osParsed * (osIvaPctVal / 100) : 0;
  const osIvaTotal = hasOsIva && Number.isFinite(osParsed) ? osParsed + osIvaAmount : 0;

  return (
    <main className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-5 md:px-6">
      {showRestoreDialog && (
        <ConfirmDialog
          confirmLabel="Ripristina"
          isOpen={showRestoreDialog}
          onCancel={handleDiscardDraft}
          onConfirm={handleRestoreDraft}
          title="Ripristina bozza"
        >
          {`È stata trovata una bozza salvata "${restoredDraftRef.current?.title}". Vuoi ripristinarla?`}
        </ConfirmDialog>
      )}
      <div className="flex items-start justify-between gap-5 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="text-12px font-medium text-[var(--text-tertiary)]">
            {initialValues ? "Modifica progetto" : "Nuovo progetto"}
          </div>
          <h2 className="mt-1 max-w-3xl text-28px font-semibold leading-tight text-[var(--text-primary)] md:text-32px">
            {step === 1 ? "Dati contratto e perimetro" : "Importo e perimetro economico"}
          </h2>
          <p className="mt-2 max-w-2xl text-13px font-medium leading-5 text-[var(--text-secondary)]">
            {step === 1
              ? "Definisci identita, codici contrattuali e appaltatore del progetto."
              : "Definisci importo contrattuale, OS esclusi e tariffari del progetto."}
          </p>
        </div>
      </div>

      <nav
        aria-label="Avanzamento creazione progetto"
        className="mt-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] p-3"
      >
        <div className="flex items-center gap-3">
          <ProjectStepButton
            description="Anagrafica e codici"
            isActive={step === 1}
            isComplete={validation.checks.identity}
            label="Contratto"
            onClick={() => handleGoToStep(1)}
            stepNumber={1}
          />
          <div className="h-px flex-1 bg-[var(--border-subtle)]" />
          <ProjectStepButton
            description="Budget e tariffari"
            isActive={step === 2}
            isComplete={validation.canSubmit}
            label="Economia"
            onClick={() => handleGoToStep(2)}
            stepNumber={2}
          />
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--bg-muted)]">
          <m.div
            animate={{ scaleX: step === 1 ? 0.5 : 1 }}
            className="h-full w-full origin-left rounded-full bg-[var(--accent-primary)]"
            initial={false}
            transition={PROJECT_STEPPER_REVEAL}
          />
        </div>
      </nav>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_350px]">
        <Panel padding="lg" className="min-w-0 md:p-6">
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
                <TextField
                  label="Nome progetto"
                  onChange={(v) =>
                    dispatch({
                      type: "SET_DRAFT",
                      payload: (s) => ({ ...s, title: sanitizeTextInput(v) }),
                    })
                  }
                  placeholder="Linea AV/AC Milano-Verona"
                  value={draft.title}
                />
                <TextField
                  label="Contratto applicativo"
                  onChange={(v) =>
                    dispatch({
                      type: "SET_DRAFT",
                      payload: (s) => ({ ...s, applicationContractCode: sanitizeTextInput(v) }),
                    })
                  }
                  placeholder="CA-MV-001"
                  value={draft.applicationContractCode}
                />
                <TextField
                  label="Accordo quadro"
                  onChange={(v) =>
                    dispatch({
                      type: "SET_DRAFT",
                      payload: (s) => ({ ...s, frameworkAgreementCode: sanitizeTextInput(v) }),
                    })
                  }
                  placeholder="AQ-RFI-2026"
                  value={draft.frameworkAgreementCode}
                />
                <SelectField
                  label="Appaltatore"
                  onChange={(v) =>
                    dispatch({
                      type: "SET_DRAFT",
                      payload: (s) => ({ ...s, contractorName: sanitizeTextInput(v) }),
                    })
                  }
                  options={contractorSelectOptions}
                  placeholder="Seleziona appaltatore"
                  value={draft.contractorName}
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
                  <CurrencyField
                    label="Importo contrattuale"
                    value={safeParseMoney(draft.contractualAmount)}
                    onChange={(v) =>
                      dispatch({
                        type: "SET_DRAFT",
                        payload: (s) => ({ ...s, contractualAmount: v > 0 ? String(v) : "" }),
                      })
                    }
                    placeholder="26.150.000,00"
                  />
                  <IvaToggleInput
                    label="IVA su importo"
                    percent={draft.budgetIvaPercent}
                    baseAmount={parseLocalizedMoney(draft.contractualAmount)}
                    onChange={(pct) =>
                      dispatch({
                        type: "SET_DRAFT",
                        payload: (s) => ({ ...s, budgetIvaPercent: pct }),
                      })
                    }
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
                        dispatch({
                          type: "SET_DRAFT",
                          payload: (s) => ({ ...s, tenderDiscountPercent: v }),
                        });
                        return;
                      }
                      const parsed = parseFloat(v.replace(",", "."));
                      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100)
                        dispatch({
                          type: "SET_DRAFT",
                          payload: (s) => ({
                            ...s,
                            tenderDiscountPercent: String(Math.round(parsed * 100) / 100),
                          }),
                        });
                    }}
                    placeholder="18,25"
                    step="0.01"
                    type="number"
                    value={draft.tenderDiscountPercent}
                  />
                </label>
              </div>

              <div className="mt-5">
                <CurrencyField
                  label="OS Esclusi da ribassi"
                  value={safeParseMoney(draft.osExcludedAmount)}
                  onChange={(v) =>
                    dispatch({
                      type: "SET_DRAFT",
                      payload: (s) => ({ ...s, osExcludedAmount: v > 0 ? String(v) : "" }),
                    })
                  }
                  placeholder="1.500.000,00"
                />
                <IvaToggleInput
                  label="IVA su OS esclusi"
                  percent={draft.osIvaPercent}
                  baseAmount={parseLocalizedMoney(draft.osExcludedAmount)}
                  onChange={(pct) =>
                    dispatch({ type: "SET_DRAFT", payload: (s) => ({ ...s, osIvaPercent: pct }) })
                  }
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
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                        <input
                          className="h-11 w-full rounded-14px border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 pl-9 pr-3 text-13px font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                          onChange={(e) =>
                            dispatch({ type: "SET_TARIFF_SEARCH", payload: e.target.value })
                          }
                          placeholder={`Cerca tra ${tariffBooks.length} tariffari...`}
                          value={tariffSearchQuery}
                        />
                      </div>
                      <div className="relative">
                        <button
                          className="inline-flex h-11 w-full min-w-[168px] items-center justify-between rounded-14px border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 px-4 text-13px font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)] sm:w-auto"
                          onClick={() => setTariffYearFilterOpen((open) => !open)}
                          type="button"
                        >
                          {tariffYearFilters.length === 0
                            ? "Tutti gli anni"
                            : tariffYearFilters.length === 1
                              ? String(tariffYearFilters[0])
                              : `${tariffYearFilters.length} anni`}
                          <ChevronDown
                            className={cn(
                              "size-4 text-[var(--text-secondary)] transition-transform",
                              tariffYearFilterOpen && "rotate-180",
                            )}
                          />
                        </button>
                        {tariffYearFilterOpen ? (
                          <>
                            <button
                              aria-label="Chiudi filtro anno"
                              className="fixed inset-0 z-[var(--z-dropdown-menu)] cursor-default"
                              onClick={() => setTariffYearFilterOpen(false)}
                              type="button"
                            />
                            <div className="absolute right-0 top-full z-[var(--z-dropdown-menu)] mt-1 w-full min-w-[190px] overflow-hidden rounded-18px bg-[var(--surface-base)] p-1.5 shadow-soft ring-1 ring-[var(--border-subtle)]">
                              <button
                                className={cn(
                                  "flex w-full items-center justify-between rounded-10px px-3 py-2 text-left text-13px font-medium transition-colors",
                                  tariffYearFilters.length === 0
                                    ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                                    : "text-[var(--text-primary)] hover:bg-[var(--bg-muted)]",
                                )}
                                onClick={() => {
                                  setTariffYearFilters([]);
                                  setTariffYearFilterOpen(false);
                                }}
                                type="button"
                              >
                                Tutti gli anni
                                {tariffYearFilters.length === 0 ? (
                                  <Check className="size-3.5" strokeWidth={3} />
                                ) : null}
                              </button>
                              {availableTariffYears.map((year) => {
                                const selected = tariffYearFilters.includes(year);
                                return (
                                  <button
                                    className={cn(
                                      "flex w-full items-center justify-between rounded-10px px-3 py-2 text-left text-13px font-medium transition-colors",
                                      selected
                                        ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                                        : "text-[var(--text-primary)] hover:bg-[var(--bg-muted)]",
                                    )}
                                    key={year}
                                    onClick={() => {
                                      setTariffYearFilters((current) =>
                                        selected
                                          ? current.filter((item) => item !== year)
                                          : [...current, year].sort((a, b) => b - a),
                                      );
                                    }}
                                    type="button"
                                  >
                                    {year}
                                    {selected ? (
                                      <Check className="size-3.5" strokeWidth={3} />
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                    {filteredTariffBooks.length === 0 ? (
                      <p className="mt-3 text-12px text-[var(--text-secondary)]">
                        Nessun tariffario corrisponde ai filtri.
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
                                dispatch({
                                  type: "SET_DRAFT",
                                  payload: (s) => ({
                                    ...s,
                                    tariffBookIds: isSelected
                                      ? s.tariffBookIds.filter((id) => id !== book.id)
                                      : [...s.tariffBookIds, book.id],
                                  }),
                                })
                              }
                              type="button"
                            >
                              <span
                                className={`flex size-6 shrink-0 items-center justify-center rounded-md border ${
                                  isSelected
                                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-inverse)]"
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

          <div className="mt-6 border-t border-[var(--border-subtle)]/70 pt-5">
            {actionFeedback ? (
              <div className="mb-4">
                <AlertBanner
                  title={actionFeedback}
                  tone={actionFeedbackTone === "success" ? "success" : "warning"}
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                disabled={step === 1 || isSaving}
                icon={ArrowLeft}
                onClick={() => handleGoToStep(1)}
                variant="secondary"
              >
                Indietro
              </Button>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  disabled={isSaving}
                  icon={Save}
                  onClick={handleSaveDraft}
                  variant="secondary"
                >
                  Salva bozza
                </Button>
                {step === 1 ? (
                  <Button
                    disabled={!canGoNext || isSaving}
                    onClick={() => handleGoToStep(2)}
                    variant="primary"
                  >
                    Continua
                    <ArrowRight className="size-4" />
                  </Button>
                ) : (
                  <Button
                    disabled={!validation.canSubmit || isSaving}
                    onClick={() => void handleSubmit()}
                    variant="primary"
                  >
                    {isSaving
                      ? "Salvataggio..."
                      : initialValues
                        ? "Aggiorna progetto"
                        : "Crea progetto"}
                    <Check className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Panel>

        <aside className="space-y-5">
          <Panel eyebrow="Anteprima" padding="lg">
            <div className="rounded-22px bg-[var(--surface-base)] p-4">
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
                {Number.isFinite(amount) && amount > 0 ? (
                  <div className="rounded-xl bg-[var(--bg-muted)]/70 p-3">
                    <div className="text-10px font-semibold uppercase tracking-overline text-[var(--text-secondary)]">
                      Importo contrattuale
                    </div>
                    <DetailList className="mt-1">
                      <DetailRow label="BASE" value={formatAmount(amount)} />
                      {hasBudgetIva ? (
                        <>
                          <DetailRow
                            label={`+ IVA (${budgetIvaPct.toLocaleString("it-IT")}%)`}
                            value={formatAmount(budgetIvaAmount)}
                            className="text-[var(--info-base)]"
                          />
                          <DetailRow
                            label="= TOTALE"
                            value={formatAmount(budgetIvaTotal)}
                            className="border-t border-[var(--border-subtle)]/50 pt-1 text-[var(--info-base)] font-bold"
                          />
                        </>
                      ) : (
                        <div className="text-11px font-medium text-[var(--text-secondary)]">
                          (IVA non applicata)
                        </div>
                      )}
                    </DetailList>
                  </div>
                ) : (
                  <div className="rounded-xl bg-[var(--bg-muted)]/70 p-3">
                    <div className="text-10px font-semibold uppercase tracking-overline text-[var(--text-secondary)]">
                      Importo contrattuale
                    </div>
                    <div className="mt-1 text-11px font-medium text-[var(--text-secondary)]">
                      Da inserire
                    </div>
                  </div>
                )}

                <MetricCard
                  caption=""
                  density="compact"
                  icon={ShieldCheck}
                  label="Ribasso d'asta"
                  value={
                    Number.isFinite(parsedDiscount)
                      ? `${parsedDiscount.toLocaleString("it-IT")}%`
                      : "Da inserire"
                  }
                />

                {Number.isFinite(osParsed) && osParsed > 0 ? (
                  <div className="rounded-xl bg-[var(--bg-muted)]/70 p-3">
                    <div className="text-10px font-semibold uppercase tracking-overline text-[var(--text-secondary)]">
                      OS esclusi da ribasso
                    </div>
                    <DetailList className="mt-1">
                      <DetailRow label="BASE" value={formatAmount(osParsed)} />
                      {hasOsIva ? (
                        <>
                          <DetailRow
                            label={`+ IVA (${osIvaPctVal.toLocaleString("it-IT")}%)`}
                            value={formatAmount(osIvaAmount)}
                            className="text-[var(--info-base)]"
                          />
                          <DetailRow
                            label="= TOTALE"
                            value={formatAmount(osIvaTotal)}
                            className="border-t border-[var(--border-subtle)]/50 pt-1 text-[var(--info-base)] font-bold"
                          />
                        </>
                      ) : (
                        <div className="text-11px font-medium text-[var(--text-secondary)]">
                          (IVA non applicata)
                        </div>
                      )}
                    </DetailList>
                  </div>
                ) : (
                  <MetricCard
                    caption=""
                    density="compact"
                    icon={WalletCards}
                    label="OS esclusi da ribasso"
                    value="Non impostato"
                  />
                )}

                <MetricCard
                  caption=""
                  density="compact"
                  icon={FileText}
                  label="Tariffari associati"
                  value={
                    draft.tariffBookIds.length > 0
                      ? `${draft.tariffBookIds.length} tariffari`
                      : "Nessuno"
                  }
                />
              </div>
            </div>
          </Panel>

          <Panel eyebrow="Controlli rapidi" padding="lg">
            <div className="mt-3 grid gap-2">
              {[
                { isOk: validation.checks.identity, label: "Nome progetto compilato" },
                { isOk: validation.checks.amount, label: "Importo contrattuale valido" },
                { isOk: validation.checks.discount, label: "Ribasso valido (0-100%)" },
                { isOk: validation.checks.os, label: "OS esclusi < budget" },
                { isOk: draft.tariffBookIds.length > 0, label: "Almeno un tariffario" },
              ].map(({ isOk, label }) => (
                <div
                  className="flex items-center justify-between gap-2 rounded-14px bg-[var(--surface-base)] px-3 py-2"
                  key={label}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {isOk ? (
                      <Check className="size-4 shrink-0 text-[var(--success-base)]" />
                    ) : (
                      <CircleAlert className="size-4 shrink-0 text-[var(--warning-base)]" />
                    )}
                    <span className="truncate text-12px font-medium text-[var(--text-secondary)]">
                      {label}
                    </span>
                  </span>
                  <StatusChip dot size="sm" tone={isOk ? "success" : "warning"}>
                    {isOk ? "OK" : "Check"}
                  </StatusChip>
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </main>
  );
}

function ProjectStepButton({
  description,
  isActive,
  isComplete,
  label,
  onClick,
  stepNumber,
}: {
  description: string;
  isActive: boolean;
  isComplete: boolean;
  label: string;
  onClick: () => void;
  stepNumber: 1 | 2;
}) {
  return (
    <m.button
      aria-current={isActive ? "step" : undefined}
      animate={{
        scale: isActive ? 1.012 : 1,
        y: isActive ? -1 : 0,
      }}
      className={`relative flex min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-18px px-4 py-3.5 text-left focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)] ${
        isActive
          ? "ring-1 ring-[color-mix(in_srgb,var(--accent-primary)_28%,transparent)]"
          : "ring-1 ring-transparent hover:bg-[var(--bg-muted)]/70"
      }`}
      initial={false}
      layout
      onClick={onClick}
      transition={PROJECT_STEPPER_SPRING}
      type="button"
      whileTap={{ scale: 0.985 }}
    >
      {isActive ? (
        <m.span
          className="absolute inset-0 rounded-18px bg-[color-mix(in_srgb,var(--accent-primary)_9%,var(--surface-base)_91%)] shadow-[inset_0_1px_0_color-mix(in_srgb,white_45%,transparent)]"
          layoutId="project-stepper-active-surface"
          transition={PROJECT_STEPPER_SPRING}
        />
      ) : null}
      <m.span
        animate={{ scale: isActive ? 1.08 : 1 }}
        className={`relative flex size-9 shrink-0 items-center justify-center rounded-14px text-12px font-bold shadow-[inset_0_1px_0_color-mix(in_srgb,white_30%,transparent)] ${
          isActive
            ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
            : isComplete
              ? "bg-[var(--success-soft)] text-[var(--success-base)]"
              : "bg-[var(--surface-base)] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]/70"
        }`}
        layout
        transition={PROJECT_STEPPER_SPRING}
      >
        {!isActive && isComplete ? <Check className="size-4" strokeWidth={3} /> : stepNumber}
      </m.span>
      <span className="relative min-w-0">
        <span className="block truncate text-15px font-bold text-[var(--text-primary)]">
          {label}
        </span>
        <span className="mt-1 block truncate text-12px font-medium text-[var(--text-secondary)]">
          {description}
        </span>
      </span>
    </m.button>
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

function readStringList(key: string): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function mergeContractorOptions(values: string[]) {
  const options = new Map<string, string>();

  for (const value of values) {
    const contractor = normalizeContractorName(value);
    if (contractor.length < 2 || contractor === "Appaltatore da assegnare") {
      continue;
    }

    options.set(contractor.toLocaleLowerCase("it-IT"), contractor);
  }

  return [...options.values()].sort((left, right) => left.localeCompare(right));
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

function safeParseMoney(value: string): number {
  if (!value) return 0;
  const p = parseLocalizedMoney(value);
  return Number.isFinite(p) ? p : 0;
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
