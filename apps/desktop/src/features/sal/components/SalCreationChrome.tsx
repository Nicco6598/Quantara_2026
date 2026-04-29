import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  Check,
  FileText,
  Save,
  Search,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SalCreationStep } from "../types";

const steps = [
  { id: 1, label: "Impostazione", helper: "Configura contesto e tariffari" },
  { id: 2, label: "Voci e quantita", helper: "Seleziona e inserisci le voci" },
  { id: 3, label: "Verifica", helper: "Controlla importi e coerenze" },
  { id: 4, label: "Conferma", helper: "Anteprima e conferma SAL" },
] as const;

export function SalWorkflowTopbar({
  canGoBack,
  onBack,
  onDraft,
  onPrimary,
  primaryLabel,
  showPrimary = true,
}: {
  canGoBack: boolean;
  onBack: () => void;
  onDraft: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  showPrimary?: boolean;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 border-b border-subtle bg-card/95 px-7">
      <div className="flex items-center gap-3 text-[13px] font-medium text-secondary">
        <span>Portfolio</span>
        <span>/</span>
        <span>Progetti</span>
        <span>/</span>
        <span>TEST</span>
        <span>/</span>
        <span className="text-foreground">Nuova SAL</span>
      </div>
      <div className="flex items-center gap-3">
        <label className="relative hidden h-10 w-[380px] items-center rounded-[12px] border border-subtle bg-card lg:flex">
          <Search className="ml-3 size-4 text-secondary" />
          <input
            className="h-full flex-1 bg-transparent px-3 text-sm outline-none"
            placeholder="Cerca progetti, appaltatori, materiali..."
          />
          <kbd className="mr-2 rounded-[8px] bg-muted px-2 py-1 text-xs text-secondary">⌘ K</kbd>
        </label>
        {canGoBack ? (
          <button className="sal-outline-button" onClick={onBack} type="button">
            <ArrowLeft className="size-4" />
            Indietro
          </button>
        ) : null}
        <button className="sal-outline-button" onClick={onDraft} type="button">
          <Save className="size-4" />
          Salva bozza
        </button>
        {showPrimary ? (
          <button className="sal-primary-button" onClick={onPrimary} type="button">
            {primaryLabel}
            <ArrowRight className="size-4" />
          </button>
        ) : null}
        <button
          className="relative flex size-10 items-center justify-center rounded-[12px] text-secondary hover:bg-muted"
          type="button"
        >
          <Bell className="size-5" />
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-[#ff4d12] text-[10px] font-bold text-white">
            8
          </span>
        </button>
      </div>
    </div>
  );
}

export function SalHero({
  icon: Icon,
  step,
  subtitle,
  title,
}: {
  icon: LucideIcon;
  step: SalCreationStep;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="sal-panel flex items-center justify-between gap-5 p-6">
      <div className="flex items-center gap-5">
        <div className={cn("sal-hero-icon", step === 4 && "bg-success/10 text-success")}>
          <Icon className="size-8" />
        </div>
        <div>
          <h1 className="text-[30px] font-semibold leading-tight text-foreground">{title}</h1>
          <p className="mt-1 text-[15px] text-secondary">{subtitle}</p>
        </div>
      </div>
      <div className="hidden min-w-[560px] grid-cols-[1fr_150px_150px] rounded-[18px] border border-subtle bg-card lg:grid">
        <div className="flex items-center gap-4 p-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-[#f3edff] text-[#7b3cff]">
            <Building2 className="size-6" />
          </div>
          <div>
            <div className="text-lg font-semibold text-foreground">TEST</div>
            <div className="text-sm text-secondary">QNT-01</div>
          </div>
        </div>
        <div className="border-l border-subtle p-4">
          <div className="text-xs text-secondary">Anno tariffario</div>
          <div className="mt-1 text-xl font-semibold">2026</div>
        </div>
        <div className="border-l border-subtle p-4">
          <div className="text-xs text-secondary">Stato</div>
          <span className="mt-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            SAL da creare
          </span>
        </div>
      </div>
    </section>
  );
}

export function SalStepper({ current }: { current: SalCreationStep }) {
  return (
    <nav className="sal-panel grid grid-cols-4 overflow-hidden p-0">
      {steps.map((step) => {
        const done = current > step.id;
        const active = current === step.id;
        return (
          <div
            className={cn(
              "relative flex items-center gap-4 px-7 py-5",
              active && "bg-primary/5",
              step.id < 4 &&
                "after:absolute after:right-0 after:top-1/2 after:size-9 after:-translate-y-1/2 after:translate-x-1/2 after:rotate-45 after:border-r after:border-t after:border-subtle after:bg-inherit",
            )}
            key={step.id}
          >
            <span
              className={cn(
                "z-10 flex size-9 items-center justify-center rounded-full border border-subtle bg-muted text-sm font-semibold text-secondary",
                active && "border-primary bg-primary text-white",
                done && "border-success/20 bg-success/10 text-success",
              )}
            >
              {done ? <Check className="size-5" /> : step.id}
            </span>
            <span className="z-10 min-w-0">
              <span className={cn("block text-sm font-semibold", active && "text-primary")}>
                {step.label}
              </span>
              <span className="mt-1 block truncate text-xs text-secondary">{step.helper}</span>
            </span>
          </div>
        );
      })}
    </nav>
  );
}

export function SalCard({
  children,
  className,
  icon: Icon = FileText,
  title,
}: {
  children: ReactNode;
  className?: string;
  icon?: LucideIcon;
  title: string;
}) {
  return (
    <section className={cn("sal-panel p-4", className)}>
      <div className="mb-4 flex items-center gap-2">
        <Icon className="size-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}
