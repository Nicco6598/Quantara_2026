import { motion } from "framer-motion";
import { Building2, X } from "lucide-react";
import { useState } from "react";
import { SPRING_EASE } from "@/components/shared/easings";
export function ContractorModal({
  contractorDraft,
  onChange,
  onClose,
  onCreate,
}: {
  contractorDraft: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState(contractorDraft);
  const [contact, setContact] = useState("");
  const isValid = name.trim().length >= 2;

  function handleCreate() {
    if (!isValid) return;
    onChange(name);
    onCreate(name);
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 px-4 backdrop-blur-md">
      <button
        aria-label="Chiudi creazione appaltatore"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <motion.section
        aria-label="Nuovo appaltatore"
        className="relative w-full max-w-md rounded-4xl bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.5, ease: SPRING_EASE }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <div className="rounded-22px bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] p-0 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
          <div className="flex items-center justify-between gap-4 px-5 pt-5 md:px-6 md:pt-6">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
                <Building2 className="size-5" />
              </span>
              <div>
                <div className="text-11px font-semibold uppercase tracking-0_2em text-[var(--text-secondary)]">
                  Appaltatori
                </div>
                <h3 className="mt-1 text-18px font-bold text-[var(--text-primary)]">
                  Nuovo appaltatore
                </h3>
              </div>
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

          <div className="space-y-4 px-5 py-5 md:px-6">
            <label className="block">
              <span className="text-11px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
                Nome appaltatore <span className="text-[var(--danger-base)]">*</span>
              </span>
              <input
                className={cn(
                  "mt-2 h-11 w-full rounded-14px border bg-[var(--surface-base)] px-3.5 text-14px font-medium text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]",
                  name.trim().length > 0 && name.trim().length < 2
                    ? "border-[var(--danger-base)]/40"
                    : "border-[var(--border-subtle)]",
                )}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder="Es. RFI, Ferrovie Nord, ecc."
                value={name}
              />
              {name.trim().length > 0 && name.trim().length < 2 ? (
                <p className="mt-1.5 text-11px font-medium text-[var(--danger-base)]">
                  Inserisci almeno 2 caratteri
                </p>
              ) : null}
            </label>

            <label className="block">
              <span className="text-11px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
                Referente (opzionale)
              </span>
              <input
                className="mt-2 h-11 w-full rounded-14px border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3.5 text-14px font-medium text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                onChange={(event) => setContact(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder="Nome e cognome (opzionale)"
                value={contact}
              />
            </label>

            {name.trim().length >= 2 ? (
              <div className="rounded-lg bg-[var(--success-soft)]/50 px-3 py-2 text-12px font-medium text-[var(--success-base)]">
                {contact
                  ? `Appaltatore "${name.trim()}" con referente "${contact.trim()}"`
                  : `Appaltatore "${name.trim()}"`}{" "}
                pronto per la creazione
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)]/70 px-5 py-4 md:px-6">
            <button
              className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--bg-muted)] px-5 text-13px font-semibold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)]"
              onClick={onClose}
              type="button"
            >
              Annulla
            </button>
            <button
              className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-full px-6 text-13px font-semibold text-[var(--text-inverse)] transition-colors",
                isValid
                  ? "bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90"
                  : "cursor-not-allowed bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
              )}
              disabled={!isValid}
              onClick={handleCreate}
              type="button"
            >
              <Building2 className="size-4" />
              Crea appaltatore
            </button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
