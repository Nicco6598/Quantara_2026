import { contractSchema } from "@quantara/validation";
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
import { useEffect, useState } from "react";
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
  safetyCostsNotSubjectToDiscount: string;
  tariffBookId: string;
  title: string;
};

type CreateProjectModalProps = {
  contractorOptions: string[];
  defaultTariffBookId: string;
  initialValues?: ProjectFormState;
  isSaving: boolean;
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
    safetyCostsNotSubjectToDiscount: "",
    tariffBookId: defaultTariffBookId,
    title: "",
  };
}

export function CreateProjectModal({
  contractorOptions,
  defaultTariffBookId,
  initialValues,
  isSaving,
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
  const [step, setStep] = useState<ProjectModalStep>(1);
  const amount = parseLocalizedMoney(draft.contractualAmount);
  const safetyCostsAmount = parseLocalizedMoney(draft.safetyCostsNotSubjectToDiscount);
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
      safetyCostsNotSubjectToDiscount: safetyCostsAmount,
      tariffPriorities: [],
      title: sanitizeTextValue(draft.title),
    };

    const parsed = contractSchema.safeParse({
      ...request,
      contractualAmount: { amount: request.contractualAmount, currency: "EUR" },
      safetyCostsNotSubjectToDiscount: {
        amount: request.safetyCostsNotSubjectToDiscount,
        currency: "EUR",
      },
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Controlla i dati inseriti.");
      return;
    }

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
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/42 p-4">
      <button
        aria-label="Chiudi creazione progetto"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section className="projects-surface relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-base)] shadow-none">
        <div className="flex items-start justify-between gap-5 px-6 pb-5 pt-6 md:px-8 md:pt-7">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
              Nuovo progetto
            </div>
            <h3 className="mt-2 max-w-3xl text-[24px] font-semibold leading-[1.05] tracking-[-0.035em] text-[var(--text-primary)] md:text-[30px]">
              {step === 1 ? "Dati contratto e perimetro" : "Importo e oneri sicurezza"}
            </h3>
            <p className="mt-2 max-w-2xl text-[13px] font-medium leading-5 text-[var(--text-secondary)]">
              {step === 1
                ? "Definisci identita, codici contrattuali e appaltatore del progetto."
                : "Definisci importo contrattuale e oneri della sicurezza esclusi dal ribasso."}
            </p>
          </div>
          <ProjectControlButton
            aria-label="Chiudi creazione progetto"
            className="size-10 px-0"
            onClick={onClose}
            variant="icon"
          >
            <X className="size-4" />
          </ProjectControlButton>
        </div>

        <div className="px-6 pb-6 md:px-8">
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
                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                        Appaltatore
                      </span>
                      <input
                        className="mt-3 h-[54px] w-full rounded-[16px] border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 px-4 text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                        list="project-contractor-options"
                        onChange={(event) =>
                          setDraft((state) => ({
                            ...state,
                            contractorName: sanitizeTextInput(event.target.value),
                          }))
                        }
                        placeholder="RFI"
                        value={draft.contractorName}
                      />
                      <datalist id="project-contractor-options">
                        {contractorOptions.map((contractor) => (
                          <option key={contractor} value={contractor} />
                        ))}
                      </datalist>
                    </label>
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
                    <ProjectCurrencyField
                      label="Oneri della sicurezza non soggetti a ribassi"
                      onChange={(value) =>
                        setDraft((state) => ({
                          ...state,
                          safetyCostsNotSubjectToDiscount: value,
                        }))
                      }
                      placeholder="0,00"
                      value={draft.safetyCostsNotSubjectToDiscount}
                    />
                  </div>
                  <div className="mt-5 rounded-[18px] bg-[var(--bg-muted)]/70 px-4 py-3 text-xs font-medium leading-5 text-[var(--text-secondary)]">
                    Gli oneri della sicurezza vengono salvati sul progetto e saranno usati nei
                    flussi SAL senza applicazione del ribasso.
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
                    label="Oneri sicurezza"
                    value={
                      Number.isFinite(safetyCostsAmount)
                        ? formatMoney({ amount: safetyCostsAmount, currency: "EUR" })
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
                <QuickCheckRow isOk={validation.checks.identity} label="Nome progetto compilato" />
                <QuickCheckRow
                  isOk={validation.checks.amount}
                  label="Importo contrattuale valido"
                />
                <QuickCheckRow
                  isOk={validation.checks.safetyCosts}
                  label="Oneri sicurezza validi"
                />
                <QuickCheckRow
                  isOk={validation.checks.safetyCostsWithinBudget}
                  label="Oneri entro budget"
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
                disabled={isSaving || !validation.canSubmit}
                icon={PlusCircle}
                onClick={handleSubmit}
                variant="primary"
              >
                {isSaving ? "Salvataggio" : submitLabel}
              </ProjectControlButton>
            )}
          </div>
        </div>
      </section>
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
    <div className="grid items-center gap-4 md:grid-cols-[minmax(130px,160px)_1fr_minmax(150px,190px)]">
      <StepStatus completed={step > 1} index={1} label="Dati" status="Completato" />
      <div className="hidden h-px bg-[var(--border-subtle)]/70 md:block" />
      <StepStatus
        active={step === 2}
        completed={false}
        index={2}
        label="Economico"
        status={step === 2 ? "In configurazione" : "Da configurare"}
      />
    </div>
  );
}

function StepStatus({
  active,
  completed,
  index,
  label,
  status,
}: {
  active?: boolean;
  completed: boolean;
  index: number;
  label: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={
          completed
            ? "flex size-10 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[var(--text-inverse)]"
            : active
              ? "flex size-10 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]"
              : "flex size-10 items-center justify-center rounded-full bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]"
        }
      >
        {completed ? (
          <Check className="size-5" />
        ) : (
          <span className="text-sm font-bold">{index}</span>
        )}
      </div>
      <div>
        <div className="text-sm font-semibold text-[var(--text-primary)]">{label}</div>
        <div
          className={
            active
              ? "text-xs font-medium text-[var(--info-base)]"
              : "text-xs text-[var(--text-secondary)]"
          }
        >
          {status}
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
        className="mt-3 h-[54px] w-full rounded-[16px] border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 px-4 text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
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
        className="mt-3 h-[54px] w-full rounded-[16px] border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 px-4 text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
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
  const safetyCostsAmount = parseLocalizedMoney(draft.safetyCostsNotSubjectToDiscount);
  const hasValidAmount = Number.isFinite(amount) && amount > 0;
  const hasValidSafetyCosts = Number.isFinite(safetyCostsAmount) && safetyCostsAmount >= 0;
  const safetyCostsWithinBudget =
    hasValidAmount && hasValidSafetyCosts && safetyCostsAmount <= amount;

  if (identityError) {
    return {
      canSubmit: false,
      checks: {
        amount: hasValidAmount,
        identity: false,
        safetyCosts: hasValidSafetyCosts,
        safetyCostsWithinBudget,
      },
      identityError,
      submitError: identityError,
    };
  }

  let submitError: string | null = null;
  if (!hasValidAmount) {
    submitError = "Inserisci un importo contrattuale valido e maggiore di zero.";
  } else if (!hasValidSafetyCosts) {
    submitError = "Inserisci oneri sicurezza validi (zero o valore positivo).";
  } else if (!safetyCostsWithinBudget) {
    submitError = "Gli oneri sicurezza non possono superare l'importo contrattuale.";
  }

  return {
    canSubmit: submitError === null,
    checks: {
      amount: hasValidAmount,
      identity: true,
      safetyCosts: hasValidSafetyCosts,
      safetyCostsWithinBudget,
    },
    identityError,
    submitError,
  };
}
