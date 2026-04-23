import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = ["Bozza", "In revisione", "In approvazione", "Approvata", "Emessa"] as const;

export function WorkflowStepper() {
  return (
    <div className="rounded-md border border-subtle bg-card p-4 shadow-soft">
      <div className="grid grid-cols-5 gap-3">
        {steps.map((step, index) => {
          const active = index === 3;
          const complete = index < 3;
          return (
            <div className="flex items-center gap-2" key={step}>
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-secondary",
                  complete && "bg-info-soft text-info",
                  active && "bg-success text-primary-foreground",
                )}
              >
                {complete ? <CheckCircle2 /> : index + 1}
              </div>
              <span
                className={cn("text-xs font-semibold text-secondary", active && "text-foreground")}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
