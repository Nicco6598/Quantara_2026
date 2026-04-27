import { ArrowLeft, ArrowRight, CheckCircle2, FileText, X } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { contractSchema } from "@quantara/validation";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import type {
  CreateDesktopContractRequest,
  DesktopContract,
  DesktopTariffBook,
  DesktopTariffPriority,
} from "@/lib/desktopData";
import { formatMoney } from "@/lib/formatters";

type ProjectModalStep = 1 | 2;

export type ProjectFormState = {
  applicationContractCode: string;
  contractorName: string;
  contractualAmount: string;
  frameworkAgreementCode: string;
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
  const selectedTariffBook = tariffBooks.find((book) => book.id === draft.tariffBookId);
  const amount = normalizeAmount(draft.contractualAmount);
  const hasValidTariffBook = Boolean(selectedTariffBook);
  const previewPriorities = useMemo<DesktopTariffPriority[]>(
    () =>
      selectedTariffBook
        ? [
            {
              priority: 1,
              reason: "Tariffario principale",
              tariffBookId: selectedTariffBook.id,
            },
          ]
        : [],
    [selectedTariffBook],
  );

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
    const validationError = validateProjectIdentity(draft);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setStep(2);
  }

  async function handleSubmit() {
    const validationError = validateProjectDraft(draft, tariffBooks);

    if (validationError) {
      setError(validationError);
      return;
    }

    const request: CreateDesktopContractRequest = {
      applicationContractCode: draft.applicationContractCode.trim(),
      contractualAmount: amount,
      frameworkAgreementCode: draft.frameworkAgreementCode.trim(),
      id: `contract_locale_${Date.now()}`,
      tariffPriorities: previewPriorities,
      title: draft.title.trim(),
    };

    const parsed = contractSchema.safeParse({
      ...request,
      contractualAmount: { amount: request.contractualAmount, currency: "EUR" },
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Controlla i dati inseriti.");
      return;
    }

    const created = await onCreate(request, { contractorName: draft.contractorName.trim() });

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <button
        aria-label="Chiudi creazione progetto"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section className="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[24px] border border-subtle bg-card shadow-panel">
        <div className="flex items-center justify-between gap-4 border-b border-subtle px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
              Nuovo progetto
            </div>
            <h3 className="mt-1 text-lg font-semibold text-foreground">
              {step === 1 ? "Dati contratto e perimetro" : "Importo e tariffario"}
            </h3>
          </div>
          <button
            className="flex size-9 items-center justify-center rounded-[14px] text-secondary transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="p-5">
              {step === 1 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <ProjectTextField
                    label="Nome progetto"
                    onChange={(value) => setDraft((state) => ({ ...state, title: value }))}
                    placeholder="Linea AV/AC Milano-Verona"
                    value={draft.title}
                  />
                  <ProjectTextField
                    label="Contratto applicativo"
                    onChange={(value) =>
                      setDraft((state) => ({ ...state, applicationContractCode: value }))
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
                      setDraft((state) => ({ ...state, frameworkAgreementCode: value }))
                    }
                    placeholder="AQ-RFI-2026"
                    value={draft.frameworkAgreementCode}
                  />
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
                      Appaltatore
                    </span>
                    <input
                      className="mt-2 h-11 w-full rounded-[14px] border border-subtle bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                      list="project-contractor-options"
                      onChange={(event) =>
                        setDraft((state) => ({ ...state, contractorName: event.target.value }))
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
                  <div className="rounded-[20px] border border-subtle bg-muted/35 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <FileText className="size-4 text-primary" />
                      Dossier iniziale
                    </div>
                    <p className="mt-2 text-xs leading-5 text-secondary">
                      I codici restano visibili in workbench e diventano la base per SAL, tariffari
                      e controllo economico.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <ProjectTextField
                    label="Importo contrattuale"
                    onChange={(value) =>
                      setDraft((state) => ({ ...state, contractualAmount: value }))
                    }
                    placeholder="26150000"
                    type="number"
                    value={draft.contractualAmount}
                  />
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
                      Tariffario principale
                    </span>
                    <select
                      disabled={tariffBooks.length === 0}
                      className="mt-2 h-11 w-full rounded-[14px] border border-subtle bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                      onChange={(event) =>
                        setDraft((state) => ({ ...state, tariffBookId: event.target.value }))
                      }
                      value={draft.tariffBookId}
                    >
                      {tariffBooks.map((book) => (
                        <option key={book.id} value={book.id}>
                          {book.name}
                        </option>
                      ))}
                    </select>
                    {tariffBooks.length === 0 ? (
                      <span className="mt-2 block text-xs leading-5 text-danger">
                        Nessun tariffario disponibile. Importane uno dalla schermata Tariffario
                        prima di creare il progetto.
                      </span>
                    ) : null}
                  </label>
                  <div className="md:col-span-2 rounded-[20px] border border-subtle bg-muted/35 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          Priorita tariffarie
                        </div>
                        <p className="mt-1 text-xs leading-5 text-secondary">
                          Il tariffario selezionato viene impostato come priorita 1. Le priorita
                          secondarie potranno essere aggiunte dal dossier progetto.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedTariffBook ? (
                        <Badge variant="info">
                          {selectedTariffBook.name} · {selectedTariffBook.year}
                        </Badge>
                      ) : (
                        <Badge variant="warning">Tariffario richiesto</Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-subtle px-5 py-4">
              {error ? <div className="mb-3 text-sm text-danger">{error}</div> : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <StepDot active={step === 1} label="Dati" />
                  <StepDot active={step === 2} label="Economico" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {step === 2 ? (
                    <Button onClick={() => setStep(1)} type="button" variant="outline">
                      <ArrowLeft className="size-4" />
                      Indietro
                    </Button>
                  ) : null}
                  {step === 1 ? (
                    <Button onClick={handleNext} type="button">
                      Avanti
                      <ArrowRight className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      disabled={isSaving || !hasValidTariffBook}
                      onClick={handleSubmit}
                      type="button"
                    >
                      <CheckCircle2 className="size-4" />
                      {isSaving ? "Salvataggio" : submitLabel}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <aside className="border-t border-subtle bg-muted/30 p-5 lg:border-l lg:border-t-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
              Anteprima
            </div>
            <div className="mt-4 rounded-[22px] border border-subtle bg-card p-4 shadow-soft">
              <div className="text-sm font-semibold text-foreground">
                {draft.title.trim() || "Nuovo progetto"}
              </div>
              <div className="mt-2 text-xs leading-5 text-secondary">
                {draft.applicationContractCode.trim() || "Contratto applicativo"} ·{" "}
                {draft.frameworkAgreementCode.trim() || "Accordo quadro"}
              </div>
              <div className="mt-2 text-xs leading-5 text-secondary">
                {draft.contractorName.trim() || "Appaltatore da selezionare"}
              </div>
              <div className="mt-4 grid gap-3">
                <PreviewMetric
                  label="Importo"
                  value={
                    Number.isFinite(amount)
                      ? formatMoney({ amount, currency: "EUR" })
                      : "Da inserire"
                  }
                />
                <PreviewMetric label="Tariffario" value={selectedTariffBook?.name ?? "-"} />
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function ProjectTextField({
  label,
  onChange,
  onKeyDown,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: "number" | "text";
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
        {label}
      </span>
      <input
        className="mt-2 h-11 w-full rounded-[14px] border border-subtle bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-subtle bg-muted/35 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function StepDot({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-secondary">
      <span
        className={active ? "size-2.5 rounded-full bg-primary" : "size-2.5 rounded-full bg-muted"}
      />
      {label}
    </div>
  );
}

function normalizeAmount(value: string) {
  const normalizedValue = value.replace(/\./g, "").replace(",", ".").trim();
  return normalizedValue.length > 0 ? Number(normalizedValue) : Number.NaN;
}

function validateProjectIdentity(draft: ProjectFormState) {
  if (draft.title.trim().length < 3) {
    return "Inserisci un nome progetto di almeno 3 caratteri.";
  }

  if (draft.applicationContractCode.trim().length < 2) {
    return "Inserisci il codice del contratto applicativo.";
  }

  if (draft.frameworkAgreementCode.trim().length < 2) {
    return "Inserisci il codice dell'accordo quadro.";
  }

  if (draft.contractorName.trim().length < 2) {
    return "Seleziona o inserisci l'appaltatore del progetto.";
  }

  return null;
}

function validateProjectDraft(draft: ProjectFormState, tariffBooks: DesktopTariffBook[]) {
  const identityError = validateProjectIdentity(draft);

  if (identityError) {
    return identityError;
  }

  const amount = normalizeAmount(draft.contractualAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "Inserisci un importo contrattuale valido e maggiore di zero.";
  }

  if (!/^\d+([,.]\d{1,2})?$/.test(draft.contractualAmount.trim().replace(/\./g, ""))) {
    return "L'importo puo contenere al massimo due decimali.";
  }

  if (!tariffBooks.some((book) => book.id === draft.tariffBookId)) {
    return "Seleziona un tariffario esistente prima di creare il progetto.";
  }

  return null;
}
