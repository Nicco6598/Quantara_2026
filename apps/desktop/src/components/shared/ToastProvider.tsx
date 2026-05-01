import { motion } from "framer-motion";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cn } from "@/lib/utils";

const SPRING_EASE = [0.22, 1, 0.36, 1] as const;

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

const toneBg = {
  danger: "bg-[var(--danger-soft)] text-[var(--danger-base)]",
  info: "bg-[var(--info-soft)] text-[var(--info-base)]",
  success: "bg-[var(--success-soft)] text-[var(--success-base)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
};

const toneBorder = {
  danger: "ring-[color-mix(in_srgb,var(--danger-base)_22%,transparent)]",
  info: "ring-[color-mix(in_srgb,var(--info-base)_20%,transparent)]",
  success: "ring-[color-mix(in_srgb,var(--success-base)_20%,transparent)]",
  warning: "ring-[color-mix(in_srgb,var(--warning-base)_22%,transparent)]",
};

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playToastSound(tone?: ToastTone) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = 0.06;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = tone === "danger" ? 660 : tone === "warning" ? 520 : 880;
    osc.connect(gain);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch {
    // audio fallback silently
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (toast: ToastInput) => {
      playToastSound(toast.tone);
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
        className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col-reverse gap-2"
      >
        {toasts.map((toast) => {
          const Icon = toneIcons[toast.tone];

          return (
            <motion.div
              className={cn(
                "pointer-events-auto rounded-[18px] bg-[var(--surface-base)] p-3.5 shadow-[0_8px_28px_-6px_rgba(0,0,0,0.15),inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 backdrop-blur-md",
                toneBorder[toast.tone],
              )}
              initial={{ opacity: 0, y: 20, scale: 0.94 }}
              transition={{ duration: 0.5, ease: SPRING_EASE }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.94 }}
              key={toast.id}
              layout
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[12px]",
                    toneBg[toast.tone],
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  {toast.title ? (
                    <div className="text-[13px] font-semibold text-[var(--text-primary)]">
                      {toast.title}
                    </div>
                  ) : null}
                  <div className="text-[13px] leading-5 text-[var(--text-secondary)]">
                    {toast.message}
                  </div>
                  {toast.onAction ? (
                    <button
                      className="mt-2 text-[12px] font-semibold text-[var(--accent-primary)] hover:underline"
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
                  className="flex size-7 shrink-0 items-center justify-center rounded-[10px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                  onClick={() => dismiss(toast.id)}
                  type="button"
                >
                  <X className="size-4" />
                </button>
              </div>
            </motion.div>
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
