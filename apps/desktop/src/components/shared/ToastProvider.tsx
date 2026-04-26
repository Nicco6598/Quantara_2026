import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "info" | "success" | "warning" | "danger";

type ToastInput = {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  title?: string;
  tone?: ToastTone;
};

export type QuantaraToastEventDetail = ToastInput;

export const QUANTARA_TOAST_EVENT = "quantara-toast";

export function emitToast(toast: ToastInput) {
  window.dispatchEvent(
    new CustomEvent<QuantaraToastEventDetail>(QUANTARA_TOAST_EVENT, {
      detail: toast,
    }),
  );
}

type ToastItem = ToastInput & {
  id: string;
  tone: ToastTone;
};

type ToastContextValue = {
  notify: (toast: ToastInput) => string;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneIcons = {
  danger: XCircle,
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (toast: ToastInput) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const nextToast: ToastItem = { ...toast, id, tone: toast.tone ?? "info" };

      setToasts((current) => [nextToast, ...current].slice(0, 4));
      window.setTimeout(() => dismiss(id), 5200);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  useEffect(() => {
    const handleToastEvent = (event: Event) => {
      const customEvent = event as CustomEvent<QuantaraToastEventDetail>;
      notify(customEvent.detail);
    };

    window.addEventListener(QUANTARA_TOAST_EVENT, handleToastEvent);
    return () => window.removeEventListener(QUANTARA_TOAST_EVENT, handleToastEvent);
  }, [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-5 top-20 z-[90] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-3"
      >
        {toasts.map((toast) => {
          const Icon = toneIcons[toast.tone];

          return (
            <div
              className={cn(
                "pointer-events-auto rounded-[18px] border bg-card/96 p-3.5 shadow-panel backdrop-blur",
                toast.tone === "success" && "border-success/25",
                toast.tone === "warning" && "border-warning/30",
                toast.tone === "danger" && "border-danger/30",
                toast.tone === "info" && "border-primary/20",
              )}
              key={toast.id}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[14px]",
                    toast.tone === "success" && "bg-success-soft text-success",
                    toast.tone === "warning" && "bg-warning-soft text-warning",
                    toast.tone === "danger" && "bg-danger-soft text-danger",
                    toast.tone === "info" && "bg-info-soft text-info",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  {toast.title ? (
                    <div className="text-sm font-semibold text-foreground">{toast.title}</div>
                  ) : null}
                  <div className="text-sm leading-5 text-secondary">{toast.message}</div>
                  {toast.onAction ? (
                    <button
                      className="mt-2 text-xs font-semibold text-primary hover:underline"
                      onClick={() => {
                        toast.onAction?.();
                        dismiss(toast.id);
                      }}
                      type="button"
                    >
                      {toast.actionLabel ?? "Annulla"}
                    </button>
                  ) : null}
                </div>
                <button
                  aria-label="Chiudi notifica"
                  className="flex size-7 shrink-0 items-center justify-center rounded-[12px] text-secondary hover:bg-muted hover:text-foreground"
                  onClick={() => dismiss(toast.id)}
                  type="button"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
