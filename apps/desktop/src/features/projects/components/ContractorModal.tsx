import { X } from "lucide-react";
import { Button } from "@/components/shared/Button";

export function ContractorModal({
  contractorDraft,
  onChange,
  onClose,
  onCreate,
}: {
  contractorDraft: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <button
        aria-label="Chiudi creazione appaltatore"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section className="relative w-full max-w-md rounded-[22px] border border-subtle bg-card shadow-panel">
        <div className="flex items-center justify-between gap-4 border-b border-subtle px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
              Appaltatori
            </div>
            <h3 className="mt-1 text-lg font-semibold text-foreground">Nuovo appaltatore</h3>
          </div>
          <button
            className="flex size-9 items-center justify-center rounded-[14px] text-secondary transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
              Nome appaltatore
            </span>
            <input
              className="mt-2 h-11 w-full rounded-[14px] border border-subtle bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onCreate();
                }
              }}
              placeholder="Es. RFI"
              value={contractorDraft}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-subtle px-5 py-4">
          <Button onClick={onClose} type="button" variant="outline">
            Annulla
          </Button>
          <Button onClick={onCreate} type="button">
            Crea
          </Button>
        </div>
      </section>
    </div>
  );
}
