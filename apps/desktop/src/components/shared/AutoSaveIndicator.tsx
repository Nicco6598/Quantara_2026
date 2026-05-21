import { Check, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type AutoSaveStatus = "idle" | "saving" | "saved" | "error" | "unsaved";

export function AutoSaveIndicator({
  lastSaved,
  status,
}: {
  status: AutoSaveStatus;
  lastSaved: string | null;
}) {
  if (status === "idle") return null;

  const timeLabel = lastSaved
    ? new Date(lastSaved).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-11px font-medium transition-all duration-[var(--duration-fast)]",
        status === "unsaved" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
        status === "saving" && "bg-[var(--info-soft)] text-[var(--info-base)]",
        status === "saved" && "bg-[var(--success-soft)] text-[var(--success-base)]",
        status === "error" && "bg-[var(--danger-soft)] text-[var(--danger-base)]",
      )}
    >
      {status === "unsaved" && <span className="size-1.5 rounded-full bg-current" />}
      {status === "saving" && <Loader2 className="size-3 animate-spin" strokeWidth={2.5} />}
      {status === "saved" && <Check className="size-3" strokeWidth={3} />}
      {status === "error" && <XCircle className="size-3" strokeWidth={2.5} />}
      <span>
        {status === "unsaved" && "Modifiche non salvate"}
        {status === "saving" && "Salvataggio..."}
        {status === "saved" && `Salvato${timeLabel ? ` ${timeLabel}` : ""}`}
        {status === "error" && "Errore salvataggio"}
      </span>
    </div>
  );
}
