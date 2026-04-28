import { CheckCircle2 } from "lucide-react";

export function ValidationLine({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2
        className={`size-4 ${ok ? "text-[var(--success-base)]" : "text-[var(--warning-base)]"}`}
      />
      <span>{text}</span>
    </div>
  );
}
