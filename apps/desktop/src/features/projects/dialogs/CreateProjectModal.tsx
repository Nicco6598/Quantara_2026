import { contractSchema } from "@quantara/validation";
import { SPRING_EASE } from "@/components/shared/easings";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  FileText,
  PlusCircle,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ProjectControlButton } from "@/features/projects/components/workspace-ui";

import type {
  CreateDesktopContractRequest,
  DesktopContract,
  DesktopTariffBook,
} from "@/lib/desktopData";

import { formatMoney } from "@/lib/formatters";

type ProjectModalStep = 1 | 2;

export type ProjectFormState = {
  applicationContractCode: string;
  contractorName: string;
  contractualAmount: string;
  frameworkAgreementCode: string;
  tenderDiscountPercent: string;
  tariffBookId: string;
  title: string;
};

type CreateProjectModalProps = {
  contractorOptions: string[];
  defaultTariffBookId: string;
  initialValues?: ProjectFormState;
  onClose: () => void;
  onCreate: (
    request: CreateDesktopContractRequest,
    meta: { contractorName: string },
  ) => Promise<DesktopContract | null>;
  submitLabel?: string;
  tariffBooks: DesktopTariffBook[];
};

const draftStorageKey = "quantara.projectDraft.v1";
const currentDraftStorageKey = "quantara.projectDraft.v2";

function createInitialProjectForm(defaultTariffBookId: string): ProjectFormState {
  return {
    applicationContractCode: "",
    contractorName: "",
    contractualAmount: "",
    frameworkAgreementCode: "",
    tenderDiscountPercent: "",
    tariffBookId: defaultTariffBookId,
    title: "",
  };
}

export function CreateProjectModal({
  contractorOptions,
  defaultTariffBookId,
  initialValues,
  onClose,
  onCreate,
  submitLabel = "Crea progetto",
  tariffBooks,
}: CreateProjectModalProps) {
  const firstTariffBook = tariffBooks[0];
  const fallbackDraft = createInitialProjectForm(
    tariffBooks.some((book) => book.id === defaultTariffBookId)
      ? defaultTariffBookId
      : (firstTariffBook?.id ?? ""),
  );
  const [draft, setDraft] = useState<ProjectFormState>(() => {
    if (initialValues) {
      return {
        ...initialValues,
        tariffBookId: tariffBooks.some((book) => book.id === initialValues.tariffBookId)
          ? initialValues.tariffBookId
          : fallbackDraft.tariffBookId,
      };
    }

    try {
      window.localStorage.removeItem(draftStorageKey);
      const saved = window.localStorage.getItem(currentDraftStorageKey);
      const savedDraft = saved ? { ...fallbackDraft, ...JSON.parse(saved) } : fallbackDraft;

      return tariffBooks.some((book) => book.id === savedDraft.tariffBookId)
        ? savedDraft
        : fallbackDraft;
    } catch {
      return fallbackDraft;
    }
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<ProjectModalStep>(1);
  const amount = parseLocalizedMoney(draft.contractualAmount);
  const discountPercent = parseFloat(draft.tenderDiscountPercent.replace(",", "."));
  const parsedDiscount =
    Number.isFinite(discountPercent) && discountPercent >= 0 && discountPercent <= 100
      ? discountPercent
      : Number.NaN;
  const validation = getProjectValidation(draft);

  useEffect(() => {
    if (tariffBooks.length === 0) {
      setDraft((state) => ({ ...state, tariffBookId: "" }));
      return;
    }

    setDraft((state) =>
      tariffBooks.some((book) => book.id === state.tariffBookId)
        ? state
        : { ...state, tariffBookId: firstTariffBook?.id ?? "" },
    );
  }, [firstTariffBook?.id, tariffBooks]);

  useEffect(() => {
    if (initialValues) {
      return;
    }

    try {
      window.localStorage.setItem(currentDraftStorageKey, JSON.stringify(draft));
    } catch {
      // Draft persistence is a convenience; creation must keep working without it.
    }
  }, [draft, initialValues]);

  function handleNext() {
    const validationError = validation.identityError;

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setStep(2);
  }

  async function handleSubmit() {
    const validationError = validation.submitError;

    if (validationError) {
      setError(validationError);
      return;
    }

    const request: CreateDesktopContractRequest = {
      applicationContractCode: sanitizeTextValue(draft.applicationContractCode),
      contractualAmount: amount,
      frameworkAgreementCode: sanitizeTextValue(draft.frameworkAgreementCode),
      id: `contract_locale_${Date.now()}`,
      tenderDiscountPercent: Number.isFinite(parsedDiscount) ? parsedDiscount : 0,
      tariffPriorities: [],
      title: sanitizeTextValue(draft.title),
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

    const created = await onCreate(request, {
      contractorName: sanitizeTextValue(draft.contractorName),
    });

    if (created) {
      try {
        window.localStorage.removeItem(currentDraftStorageKey);
      } catch {
        // Ignore storage cleanup failures.
      }
      onClose();
    }

    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 backdrop-blur-md">
      <button
        aria-label="Chiudi creazione progetto"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <motion.section
        className="relative flex w-full max-w-5xl max-h-[92vh] flex-col overflow-hidden rounded-[28px] bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.5, ease: SPRING_EASE }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
          <div className="flex items-start justify-between gap-5 border-b border-[var(--border-subtle)] px-6 pb-3 pt-4 md:px-8 md:pt-5">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                Nuovo progetto
              </div>
              <h3 className="mt-2 max-w-3xl text-[24px] font-semibold leading-[1.05] tracking-[-0.035em] text-[var(--text-primary)] md:text-[30px]">
                {step === 1 ? "Dati contratto e perimetro" : "Importo e ribasso gara"}
              </h3>
              <p className="mt-2 max-w-2xl text-[13px] font-medium leading-5 text-[var(--text-secondary)]">
                {step === 1
                  ? "Definisci identita, codici contrattuali e appaltatore del progetto."
                  : "Definisci importo contrattuale e percentuale di ribasso d'asta."}
              </p>
            </div>
            <button
              aria-label="Chiudi"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]"
              onClick={onClose}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="px-6 py-3 md:px-8">
            <ProjectStepper step={step} />
          </div>

          <div className="grid min-h-0 flex-1 border-t border-[var(--border-subtle)]/70 lg:grid-cols-[minmax(0,1fr)_350px]">
            <div className="min-h-0 overflow-y-auto px-6 py-7 md:px-8">
              <div className="mx-auto max-w-[760px]">
                {step === 1 ? (
                  <section>
                    <div className="flex items-start gap-4 border-b border-[var(--border-subtle)]/70 pb-5">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--info-soft)] text-[var(--info-base)]">
                        <FileText className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div>
                          <div className="text-[17px] font-semibold text-[var(--text-primary)]">
                            Anagrafica progetto
                          </div>
                          <p className="mt-1 text-[13px] leading-5 text-[var(--text-secondary)]">
                            Inserisci dati identificativi e codici contrattuali.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 grid gap-x-4 gap-y-5 md:grid-cols-2">
                      <ProjectTextField
                        label="Nome progetto"
                        onChange={(value) =>
                          setDraft((state) => ({ ...state, title: sanitizeTextInput(value) }))
                        }
                        placeholder="Linea AV/AC Milano-Verona"
                        value={draft.title}
                      />
                      <ProjectTextField
                        label="Contratto applicativo"
                        onChange={(value) =>
                          setDraft((state) => ({
                            ...state,
                            applicationContractCode: sanitizeTextInput(value),
                          }))
                        }
                        placeholder="CA-MV-001"
                        value={draft.applicationContractCode}
                      />
                      <ProjectTextField
                        label="Accordo quadro"
                        onKeyDown={(event) => {
                          if (event.key === "Tab" && !event.shiftKey) {
                            event.preventDefault();
                            handleNext();
                          }
                        }}
                        onChange={(value) =>
                          setDraft((state) => ({
                            ...state,
                            frameworkAgreementCode: sanitizeTextInput(value),
                          }))
                        }
                        placeholder="AQ-RFI-2026"
                        value={draft.frameworkAgreementCode}
                      />
                      <ContractorSelect
                        options={contractorOptions}
                        value={draft.contractorName}
                        onChange={(value) =>
                          setDraft((state) => ({
                            ...state,
                            contractorName: sanitizeTextInput(value),
                          }))
                        }
                      />
                    </div>
                  </section>
                ) : (
                  <section>
                    <div className="flex items-start gap-4 border-b border-[var(--border-subtle)]/70 pb-5">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--info-soft)] text-[var(--info-base)]">
                        <WalletCards className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div>
                          <div className="text-[17px] font-semibold text-[var(--text-primary)]">
                            Setup economico
                          </div>
                          <p className="mt-1 text-[13px] leading-5 text-[var(--text-secondary)]">
                            Definisci importi principali del progetto.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 grid gap-x-4 gap-y-5 md:grid-cols-2">
                      <ProjectCurrencyField
                        label="Importo contrattuale"
                        onChange={(value) =>
                          setDraft((state) => ({ ...state, contractualAmount: value }))
                        }
                        placeholder="26.150.000,00"
                        value={draft.contractualAmount}
                      />
                      <label className="block">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                          Ribasso d'asta (%)
                        </span>
                        <input
                          className="mt-3 h-11 w-full rounded-[14px] border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 px-4 text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                          max={100}
                          min={0}
                          onChange={(event) => {
                            const v = event.target.value;
                            if (v === "" || v === "-") {
                              setDraft((state) => ({ ...state, tenderDiscountPercent: v }));
                              return;
                            }
                            const parsed = parseFloat(v.replace(",", "."));
                            if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
                              setDraft((state) => ({
                                ...state,
                                tenderDiscountPercent: String(Math.round(parsed * 100) / 100),
                              }));
                            }
                          }}
                          placeholder="18,25"
                          step="0.01"
                          type="number"
                          value={draft.tenderDiscountPercent}
                        />
                      </label>
                    </div>
                    <div className="mt-5 rounded-[18px] bg-[var(--bg-muted)]/70 px-4 py-3 text-xs font-medium leading-5 text-[var(--text-secondary)]">
                      Il ribasso viene applicato a tutte le voci SAL. Le voci OS (oneri sicurezza)
                      sono escluse automaticamente.
                    </div>
                  </section>
                )}
              </div>
            </div>

            <aside className="min-h-0 overflow-y-auto border-t border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/35 p-5 lg:border-l lg:border-t-0">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Anteprima
                </div>
                <div className="mt-4 rounded-[22px] bg-[var(--surface-base)] p-4 shadow-none">
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
                    <PreviewMetric
                      icon={<WalletCards className="size-5" />}
                      label="Importo contrattuale"
                      value={
                        Number.isFinite(amount)
                          ? formatMoney({ amount, currency: "EUR" })
                          : "Da inserire"
                      }
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
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Controlli rapidi
                </div>
                <div className="mt-3 grid gap-2 text-xs text-[var(--text-secondary)]">
                  <QuickCheckRow
                    isOk={validation.checks.identity}
                    label="Nome progetto compilato"
                  />
                  <QuickCheckRow
                    isOk={validation.checks.amount}
                    label="Importo contrattuale valido"
                  />
                  <QuickCheckRow
                    isOk={validation.checks.discount}
                    label="Ribasso valido (0-100%)"
                  />
                </div>
              </div>
            </aside>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)]/70 bg-[var(--surface-base)] px-6 py-4 md:px-8">
            <div className="min-h-5 text-sm font-medium text-[var(--danger-base)]">{error}</div>
            <div className="flex flex-wrap gap-3">
              {step === 2 ? (
                <ProjectControlButton icon={ArrowLeft} onClick={() => setStep(1)} variant="neutral">
                  Indietro
                </ProjectControlButton>
              ) : null}
              {step === 1 ? (
                <ProjectControlButton onClick={handleNext} variant="primary">
                  Avanti
                  <ArrowRight className="size-4" />
                </ProjectControlButton>
              ) : (
                <ProjectControlButton
                  disabled={saving || !validation.canSubmit}
                  icon={PlusCircle}
                  onClick={handleSubmit}
                  variant="primary"
                >
                  {saving ? "Salvataggio" : submitLabel}
                </ProjectControlButton>
              )}
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

function QuickCheckRow({ isOk, label }: { isOk: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-[14px] bg-[var(--surface-base)] px-3 py-2">
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
            ? "rounded-full bg-[var(--success-soft)] px-3 py-1 text-[11px] font-bold text-[var(--success-base)]"
            : "rounded-full bg-[var(--warning-soft)] px-3 py-1 text-[11px] font-bold text-[var(--warning-base)]"
        }
      >
        {isOk ? "OK" : "Check"}
      </span>
    </div>
  );
}

function ProjectStepper({ step }: { step: ProjectModalStep }) {
  return (
    <div className="flex items-center gap-5">
      <StepperDot active={step === 1} completed={step > 1} index={1} label="Dati" />
      <div className="relative flex-1 h-px overflow-hidden rounded-full">
        <div className="absolute inset-0 bg-[var(--border-subtle)]/70" />
        <motion.div
          className="absolute inset-y-0 left-0 bg-[var(--accent-primary)]"
          initial={false}
          animate={{ width: step === 1 ? "0%" : "100%" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <StepperDot active={step === 2} completed={false} index={2} label="Economico" />
    </div>
  );
}

function StepperDot({
  active,
  completed,
  index,
  label,
}: {
  active: boolean;
  completed: boolean;
  index: number;
  label: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <div
        className={
          completed
            ? "flex size-10 items-center justify-center rounded-full bg-[var(--accent-primary)]"
            : active
              ? "flex size-10 items-center justify-center rounded-full bg-[var(--info-base)]"
              : "flex size-10 items-center justify-center rounded-full bg-[var(--bg-muted-strong)]"
        }
      >
        {completed ? (
          <motion.span
            animate={{ rotate: 0, scale: 1 }}
            initial={{ rotate: -90, scale: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <Check className="size-5 text-[var(--text-inverse)]" />
          </motion.span>
        ) : (
          <span
            className={`text-sm font-bold ${active ? "text-[var(--text-inverse)]" : "text-[var(--text-secondary)]"}`}
          >
            {index}
          </span>
        )}
      </div>
      <div>
        <div className="text-sm font-semibold text-[var(--text-primary)]">{label}</div>
        <div
          className={
            completed
              ? "text-xs font-medium text-[var(--success-base)]"
              : active
                ? "text-xs font-medium text-[var(--info-base)]"
                : "text-xs text-[var(--text-secondary)]"
          }
        >
          {completed ? "Completato" : active ? "In corso" : "Da fare"}
        </div>
      </div>
    </div>
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
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
        {label}
      </span>
      <input
        className="mt-3 h-11 w-full rounded-[14px] border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 px-4 text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
        onChange={(event) => onChange(event.target.value)}
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
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
        {label}
      </span>
      <input
        className="mt-3 h-11 w-full rounded-[14px] border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 px-4 text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
        inputMode="decimal"
        onChange={(event) => onChange(sanitizeMoneyInput(event.target.value))}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </label>
  );
}

function PreviewMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[16px] bg-[var(--bg-muted)]/70 p-3">
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
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

function ContractorSelect({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
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
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
        Appaltatore
      </span>
      <div className="relative mt-3" ref={ref}>
        {/* biome-ignore lint/a11y/useSemanticElements: wrapper needs a div because it contains an input */}
        <div
          className="flex h-11 w-full cursor-pointer items-center rounded-[14px] border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 px-4 text-sm font-medium text-[var(--text-primary)] outline-none transition focus-within:border-[var(--accent-primary)] focus-within:ring-2 focus-within:ring-[var(--ring-focus)]"
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
  const normalizedSeparators = value
    .replace(/\s+/g, "")
    .replace(/٫/g, ",")
    .replace(/，/g, ",")
    .replace(/．/g, ".");
  const sanitized = normalizedSeparators.replace(/[^\d.,]/g, "");
  if (!sanitized) {
    return "";
  }

  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");
  const separatorIndex = Math.max(lastComma, lastDot);

  if (separatorIndex < 0) {
    return sanitized.replace(/[.,]/g, "");
  }

  const integerPart = sanitized.slice(0, separatorIndex).replace(/[.,]/g, "");
  const decimalPart = sanitized
    .slice(separatorIndex + 1)
    .replace(/[.,]/g, "")
    .slice(0, 2);
  const separator = sanitized[separatorIndex];
  const hasTrailingSeparator = separatorIndex === sanitized.length - 1;

  if (!integerPart && !decimalPart && hasTrailingSeparator) {
    return "";
  }

  if (!decimalPart && hasTrailingSeparator) {
    return `${integerPart}${separator}`;
  }

  return decimalPart ? `${integerPart}${separator}${decimalPart}` : integerPart;
}

function parseLocalizedMoney(value: string) {
  const sanitized = sanitizeMoneyInput(value);
  if (!sanitized) {
    return Number.NaN;
  }

  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");
  const separatorIndex = Math.max(lastComma, lastDot);
  const integerPartRaw =
    separatorIndex < 0 ? sanitized.replace(/[.,]/g, "") : sanitized.slice(0, separatorIndex);
  const integerPart = integerPartRaw.replace(/[.,]/g, "");
  const decimalPart =
    separatorIndex < 0
      ? ""
      : sanitized
          .slice(separatorIndex + 1)
          .replace(/[.,]/g, "")
          .slice(0, 2);

  if (!integerPart && !decimalPart) {
    return Number.NaN;
  }

  const normalized = decimalPart ? `${integerPart || "0"}.${decimalPart}` : integerPart || "0";
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function validateProjectIdentity(draft: ProjectFormState) {
  if (sanitizeTextValue(draft.title).length < 3) {
    return "Inserisci un nome progetto di almeno 3 caratteri.";
  }

  if (sanitizeTextValue(draft.applicationContractCode).length < 2) {
    return "Inserisci il codice del contratto applicativo.";
  }

  if (sanitizeTextValue(draft.frameworkAgreementCode).length < 2) {
    return "Inserisci il codice dell'accordo quadro.";
  }

  if (sanitizeTextValue(draft.contractorName).length < 2) {
    return "Seleziona o inserisci l'appaltatore del progetto.";
  }

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

  if (identityError) {
    return {
      canSubmit: false,
      checks: {
        amount: hasValidAmount,
        discount: hasValidDiscount,
        identity: false,
      },
      identityError,
      submitError: identityError,
    };
  }

  let submitError: string | null = null;
  if (!hasValidAmount) {
    submitError = "Inserisci un importo contrattuale valido e maggiore di zero.";
  } else if (!hasValidDiscount) {
    submitError = "Inserisci un ribasso valido tra 0 e 100%.";
  }

  return {
    canSubmit: submitError === null,
    checks: {
      amount: hasValidAmount,
      discount: hasValidDiscount,
      identity: true,
    },
    identityError,
    submitError,
  };
}
