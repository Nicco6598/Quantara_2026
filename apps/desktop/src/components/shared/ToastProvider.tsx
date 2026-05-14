import { m } from "framer-motion";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { MOTION_DURATION, SPRING_EASE } from "@/components/shared/easings";
import { cn } from "@/lib/utils";

type ToastTone = "info" | "success" | "warning" | "danger";

type ToastInput = {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  title?: string;
  tone?: ToastTone;
};

type QuantaraToastEventDetail = ToastInput;

const QUANTARA_TOAST_EVENT = "quantara-toast";

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
let audioUnlocked = false;

function unlockAudioOnGesture() {
  if (audioUnlocked || typeof window === "undefined") return;
  const handler = async () => {
    if (audioUnlocked) return;
    try {
      if (!audioCtx) {
        audioCtx = new AudioContext();
      }
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      audioUnlocked = true;
    } catch {
      // Gesture unlock failed silently — rely on fallback
    }
  };
  const events = ["click", "touchstart", "keydown"] as const;
  for (const event of events) {
    window.addEventListener(event, handler, { once: true });
  }
}

async function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    try {
      await audioCtx.resume();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

async function playToastSound(tone?: ToastTone) {
  try {
    const ctx = await getAudioContext();
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
    // Fallback: HTMLAudio beep if WebAudio unavailable
    try {
      const audioFallbackCtx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
      if (audioFallbackCtx.state === "suspended") {
        await audioFallbackCtx.resume();
      }
      const osc = audioFallbackCtx.createOscillator();
      const gain = audioFallbackCtx.createGain();
      osc.connect(gain);
      gain.connect(audioFallbackCtx.destination);
      osc.frequency.value = tone === "danger" ? 660 : tone === "warning" ? 520 : 880;
      gain.gain.value = 0.06;
      osc.start();
      osc.stop(audioFallbackCtx.currentTime + 0.12);
    } catch {
      // Audio completely unavailable — silent fallback
    }
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Unlock audio context on first user gesture (macOS/WebView)
  useEffect(() => {
    unlockAudioOnGesture();
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (toast: ToastInput) => {
      void playToastSound(toast.tone);
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
            <m.div
              className={cn(
                "pointer-events-auto rounded-18px bg-[var(--surface-base)] p-3.5 shadow-soft inset-shadow-[0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 backdrop-blur-md",
                toneBorder[toast.tone],
              )}
              initial={{ opacity: 0, y: 20, scale: 0.94 }}
              transition={{ duration: MOTION_DURATION.reveal, ease: SPRING_EASE }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.94 }}
              key={toast.id}
              layout
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                    toneBg[toast.tone],
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  {toast.title ? (
                    <div className="text-13px font-semibold text-[var(--text-primary)]">
                      {toast.title}
                    </div>
                  ) : null}
                  <div className="text-13px leading-5 text-[var(--text-secondary)]">
                    {toast.message}
                  </div>
                  {toast.onAction ? (
                    <button
                      className="mt-2 text-12px font-semibold text-[var(--accent-primary)] hover:underline"
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
                  className="flex size-7 shrink-0 items-center justify-center rounded-10px text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                  onClick={() => dismiss(toast.id)}
                  type="button"
                >
                  <X className="size-4" />
                </button>
              </div>
            </m.div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = use(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
