import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/shared/Button";
import {
  type DesktopTariffBook,
  type DesktopTariffVoice,
  listDesktopTariffVoices,
} from "@/lib/desktopData";
import { cn } from "@/lib/utils";
import type { ContractorFolder, PortfolioProject } from "../types";
import { createContractorId, createDesktopVoiceKey } from "../utils/projects-helpers";

function buildFallbackTariffVoices(tariffBookId: string): DesktopTariffVoice[] {
  return [
    {
      category: "Opere",
      description: "Voce tariffaria da configurare",
      id: `${tariffBookId}_fallback_1`,
      officialCode: "VOCE-001",
      tariffBookId,
      unitOfMeasure: "cad",
      unitPrice: 0,
    },
  ];
}

export function CreateSalModal({
  contractors,
  onClose,
  onCreate,
  projects,
  tariffBooks,
}: {
  contractors: ContractorFolder[];
  onClose: () => void;
  onCreate: (request: {
    date: string;
    description: string;
    notes: string;
    projectId: string;
    projectYear: number;
    title: string;
    voices: DesktopTariffVoice[];
  }) => void;
  projects: PortfolioProject[];
  tariffBooks: DesktopTariffBook[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [contractorId, setContractorId] = useState(
    projects[0]?.contractor ? createContractorId(projects[0].contractor) : "",
  );
  const contractorProjects = useMemo(
    () => projects.filter((project) => createContractorId(project.contractor) === contractorId),
    [contractorId, projects],
  );
  const [projectId, setProjectId] = useState(contractorProjects[0]?.id ?? projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState("");
  const [selectedTariffBookIds, setSelectedTariffBookIds] = useState<string[]>([]);
  const [activeTariffBookId, setActiveTariffBookId] = useState("");
  const [voicesByBook, setVoicesByBook] = useState<Record<string, DesktopTariffVoice[]>>({});
  const [selectedVoiceIds, setSelectedVoiceIds] = useState<string[]>([]);
  const selectedProject = projects.find((project) => project.id === projectId);
  const activeVoices = activeTariffBookId ? (voicesByBook[activeTariffBookId] ?? []) : [];
  const selectedVoices = selectedTariffBookIds.flatMap((bookId) =>
    (voicesByBook[bookId] ?? []).filter((voice) =>
      selectedVoiceIds.includes(createDesktopVoiceKey(bookId, voice.id)),
    ),
  );

  useEffect(() => {
    const firstProject = contractorProjects[0];

    setProjectId((current) =>
      contractorProjects.some((project) => project.id === current)
        ? current
        : (firstProject?.id ?? ""),
    );
  }, [contractorProjects]);

  useEffect(() => {
    if (!activeTariffBookId && selectedTariffBookIds[0]) {
      setActiveTariffBookId(selectedTariffBookIds[0]);
    }
  }, [activeTariffBookId, selectedTariffBookIds]);

  useEffect(() => {
    let active = true;

    for (const tariffBookId of selectedTariffBookIds) {
      if (voicesByBook[tariffBookId]) {
        continue;
      }

      void listDesktopTariffVoices(tariffBookId, buildFallbackTariffVoices(tariffBookId)).then(
        (result) => {
          if (active) {
            setVoicesByBook((current) => ({
              ...current,
              [tariffBookId]: result.data,
            }));
          }
        },
      );
    }

    return () => {
      active = false;
    };
  }, [selectedTariffBookIds, voicesByBook]);

  function toggleTariffBook(tariffBookId: string) {
    setSelectedTariffBookIds((current) => {
      if (current.includes(tariffBookId)) {
        setSelectedVoiceIds((voiceIds) =>
          voiceIds.filter(
            (voiceId) =>
              !(voicesByBook[tariffBookId] ?? []).some(
                (voice) => voiceId === createDesktopVoiceKey(tariffBookId, voice.id),
              ),
          ),
        );
        return current.filter((id) => id !== tariffBookId);
      }

      return [...current, tariffBookId];
    });
    setActiveTariffBookId(tariffBookId);
  }

  function toggleVoice(voiceId: string) {
    setSelectedVoiceIds((current) =>
      current.includes(voiceId) ? current.filter((id) => id !== voiceId) : [...current, voiceId],
    );
  }

  function goNext() {
    if (step === 1 && !contractorId) {
      setError("Seleziona un appaltatore.");
      return;
    }

    if (step === 2 && !projectId) {
      setError("Seleziona un progetto.");
      return;
    }

    if (step === 3 && selectedTariffBookIds.length === 0) {
      setError("Seleziona almeno un tariffario.");
      return;
    }

    setError("");
    setStep((current) => (current < 4 ? ((current + 1) as 1 | 2 | 3 | 4) : current));
  }

  function handleCreate() {
    if (!projectId || !selectedProject) {
      setError("Seleziona un progetto.");
      return;
    }

    if (selectedVoices.length === 0) {
      setError("Seleziona almeno una voce.");
      return;
    }

    onCreate({
      date,
      description: "",
      notes: "",
      projectId,
      projectYear: new Date().getFullYear(),
      title: title.trim(),
      voices: selectedVoices,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <button
        aria-label="Chiudi creazione SAL"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section className="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[22px] border border-subtle bg-card shadow-panel">
        <div className="flex items-center justify-between gap-4 border-b border-subtle px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
              SAL
            </div>
            <h3 className="mt-1 text-lg font-semibold text-foreground">Nuova SAL</h3>
          </div>
          <button
            className="flex size-9 items-center justify-center rounded-[14px] text-secondary transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid max-h-[70vh] gap-0 overflow-hidden lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="border-b border-subtle bg-muted/30 p-4 lg:border-b-0 lg:border-r">
            {[1, 2, 3, 4].map((item) => (
              <button
                className={cn(
                  "mb-2 flex w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left text-sm",
                  step === item
                    ? "bg-card font-semibold text-foreground shadow-soft"
                    : "text-secondary",
                )}
                key={item}
                onClick={() => setStep(item as 1 | 2 | 3 | 4)}
                type="button"
              >
                <span className="flex size-6 items-center justify-center rounded-full border border-subtle text-xs">
                  {item}
                </span>
                <span>
                  {item === 1
                    ? "Appaltatore"
                    : item === 2
                      ? "Progetto"
                      : item === 3
                        ? "Tariffari"
                        : "Draft"}
                </span>
              </button>
            ))}
          </aside>

          <div className="overflow-y-auto p-5">
            {step === 1 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {contractors.map((contractor) => (
                  <button
                    className={cn(
                      "rounded-[18px] border p-4 text-left transition-colors",
                      contractorId === contractor.id
                        ? "border-primary bg-primary/10"
                        : "border-subtle bg-muted/25 hover:bg-muted",
                    )}
                    key={contractor.id}
                    onClick={() => setContractorId(contractor.id)}
                    type="button"
                  >
                    <div className="text-sm font-semibold text-foreground">
                      {contractor.contractor}
                    </div>
                    <div className="mt-1 text-xs text-secondary">
                      {contractor.projectCount} progetti
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-3">
                {contractorProjects.map((project) => (
                  <button
                    className={cn(
                      "rounded-[18px] border p-4 text-left transition-colors",
                      projectId === project.id
                        ? "border-primary bg-primary/10"
                        : "border-subtle bg-muted/25 hover:bg-muted",
                    )}
                    key={project.id}
                    onClick={() => setProjectId(project.id)}
                    type="button"
                  >
                    <div className="text-sm font-semibold text-foreground">{project.title}</div>
                    <div className="mt-1 text-xs text-secondary">
                      {project.lot} · {project.location}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                <div className="space-y-2">
                  {tariffBooks.map((book) => (
                    <button
                      className={cn(
                        "w-full rounded-[16px] border p-3 text-left",
                        selectedTariffBookIds.includes(book.id)
                          ? "border-primary bg-primary/10"
                          : "border-subtle bg-muted/25 hover:bg-muted",
                      )}
                      key={book.id}
                      onClick={() => toggleTariffBook(book.id)}
                      type="button"
                    >
                      <div className="text-sm font-semibold text-foreground">{book.name}</div>
                      <div className="mt-1 text-xs text-secondary">{book.year}</div>
                    </button>
                  ))}
                </div>
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedTariffBookIds.map((bookId) => {
                      const book = tariffBooks.find((item) => item.id === bookId);
                      return (
                        <Button
                          key={bookId}
                          onClick={() => setActiveTariffBookId(bookId)}
                          size="sm"
                          type="button"
                          variant={activeTariffBookId === bookId ? "default" : "outline"}
                        >
                          {book?.name ?? bookId}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="max-h-[360px] space-y-2 overflow-y-auto">
                    {activeVoices.map((voice) => {
                      const voiceKey = createDesktopVoiceKey(activeTariffBookId, voice.id);

                      return (
                        <label
                          className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-subtle bg-card p-3"
                          key={voiceKey}
                        >
                          <input
                            checked={selectedVoiceIds.includes(voiceKey)}
                            className="mt-1"
                            onChange={() => toggleVoice(voiceKey)}
                            type="checkbox"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-foreground">
                              {voice.officialCode}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-secondary">
                              {voice.description}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
                      Titolo
                    </span>
                    <input
                      className="mt-2 h-11 w-full rounded-[14px] border border-subtle bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                      onChange={(event) => setTitle(event.target.value)}
                      value={title}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
                      Data
                    </span>
                    <input
                      className="mt-2 h-11 w-full rounded-[14px] border border-subtle bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                      onChange={(event) => setDate(event.target.value)}
                      type="date"
                      value={date}
                    />
                  </label>
                </div>
                <div className="rounded-[18px] border border-subtle">
                  {selectedVoices.map((voice) => (
                    <div
                      className="grid gap-3 border-b border-subtle p-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_120px_150px]"
                      key={voice.id}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">
                          {voice.officialCode}
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs text-secondary">
                          {voice.description}
                        </div>
                      </div>
                      <input
                        className="h-10 rounded-[12px] border border-subtle bg-card px-3 text-sm"
                        disabled
                        placeholder="Quantita"
                      />
                      <select
                        className="h-10 rounded-[12px] border border-subtle bg-card px-3 text-sm"
                        disabled
                      >
                        <option>Nessuna</option>
                        <option>Diurna</option>
                        <option>Notturna</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? <div className="mt-4 text-sm text-danger">{error}</div> : null}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-subtle px-5 py-4">
          <Button onClick={onClose} type="button" variant="outline">
            Annulla
          </Button>
          {step > 1 ? (
            <Button
              onClick={() => setStep((current) => (current - 1) as 1 | 2 | 3 | 4)}
              type="button"
              variant="outline"
            >
              Indietro
            </Button>
          ) : null}
          {step < 4 ? (
            <Button onClick={goNext} type="button">
              Avanti
            </Button>
          ) : (
            <Button
              disabled={projects.length === 0 || selectedVoices.length === 0}
              onClick={handleCreate}
              type="button"
            >
              Crea draft
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
