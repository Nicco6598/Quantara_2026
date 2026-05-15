import { CheckCircle2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/shared/Button";
import { ChangelogTree } from "@/components/shared/ChangelogTree";
import { Dialog } from "@/components/shared/Dialog";
import { parseChangelogTree } from "@/lib/changelog-tree";
import type { PendingReleaseNotes } from "@/lib/updateReleaseNotes";

type UpdateReleaseNotesDialogProps = {
  notes: PendingReleaseNotes;
  onClose: () => void;
};

export function UpdateReleaseNotesDialog({ notes, onClose }: UpdateReleaseNotesDialogProps) {
  const tree = useMemo(() => parseChangelogTree(notes.body), [notes.body]);
  const [installedAt, setInstalledAt] = useState("");
  useEffect(() => {
    setInstalledAt(new Date(notes.installedAt).toLocaleString("it-IT"));
  }, [notes.installedAt]);

  return (
    <Dialog
      className="max-w-2xl rounded-22px"
      contentClassName="flex max-h-[70dvh] min-h-0 flex-col overflow-hidden rounded-[18px] p-0"
      isOpen
      onClose={onClose}
      zIndex={210}
    >
      <div className="flex shrink-0 items-start gap-4 p-5 pb-0">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--success-soft)] text-[var(--success-base)]">
          <CheckCircle2 className="size-6" />
        </span>
        <div className="min-w-0 pt-1">
          <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--surface-base)_76%,transparent)] px-2.5 py-0.5 text-10px font-semibold uppercase tracking-0_2em text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
            Aggiornamento completato
          </span>
          <h2 className="mt-3 text-19px font-semibold leading-tight text-[var(--text-primary)]">
            Quantara v{notes.version} è attiva
          </h2>
          <p className="mt-2 text-13px leading-5 text-[var(--text-secondary)]">
            Riavvio completato il {installedAt}. Puoi continuare a lavorare dalla versione
            aggiornata.
          </p>
        </div>
      </div>

      {tree.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col px-5 pt-4">
          <div className="flex shrink-0 items-center gap-2 text-11px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
            <Sparkles className="size-3.5" />
            Novità di v{notes.version}
          </div>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pb-3">
            <ChangelogTree nodes={tree} startCollapsed={false} />
          </div>
        </div>
      )}

      <div className="flex shrink-0 justify-end border-t border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-base)_88%,transparent)] p-5">
        <Button onClick={onClose} variant="primary">
          Continua
        </Button>
      </div>
    </Dialog>
  );
}
