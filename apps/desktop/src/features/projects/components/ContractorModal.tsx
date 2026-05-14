import { Building2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { Dialog, DialogActions } from "@/components/shared/Dialog";
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
  const name = contractorDraft;
  const [contact, setContact] = useState("");
  const isValid = name.trim().length >= 2;

  function handleCreate() {
    if (!isValid) return;
    onChange(name);
    onCreate(name);
  }

  return (
    <Dialog isOpen onClose={onClose} zIndex={75}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
            <Building2 className="size-5" />
          </span>
          <div>
            <div className="text-11px font-semibold uppercase tracking-0_2em text-[var(--text-secondary)]">
              Appaltatori
            </div>
            <h3 className="mt-1 text-18px font-semibold text-[var(--text-primary)]">
              Nuovo appaltatore
            </h3>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-11px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
              Nome appaltatore <span className="text-[var(--danger-base)]">*</span>
            </span>
            <input
              autoFocus
              className={cn(
                "mt-2 h-11 w-full rounded-14px border bg-[var(--surface-base)] px-3.5 text-14px font-medium text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]",
                name.trim().length > 0 && name.trim().length < 2
                  ? "border-[var(--danger-base)]/40"
                  : "border-[var(--border-subtle)]",
              )}
              onChange={(event) => onChange(event.target.value)}
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
      </div>

      <DialogActions className="mt-5">
        <Button onClick={onClose} variant="secondary">
          Annulla
        </Button>
        <Button disabled={!isValid} onClick={handleCreate} variant="primary">
          Crea appaltatore
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
