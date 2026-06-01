import { m } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ListTree } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { motionVariants } from "@/motion";

export type AppContextMenuEntry =
  | { type: "separator" }
  | {
      type: "item";
      disabled?: boolean;
      hint?: string;
      icon: LucideIcon;
      id: string;
      label: string;
      onSelect: () => void;
      shortcut?: string;
      tone?: "danger" | "neutral";
    };

export function AppContextMenu({
  entries,
  header,
  headerIcon: HeaderIcon = ListTree,
  position,
  onClose,
}: {
  entries: AppContextMenuEntry[];
  header?: { subtitle?: string; title: string };
  headerIcon?: LucideIcon;
  position: { x: number; y: number };
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState(position);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) {
      setCoords(position);
      return;
    }
    const rect = menu.getBoundingClientRect();
    const padding = 12;
    setCoords({
      x: Math.min(Math.max(padding, position.x), window.innerWidth - rect.width - padding),
      y: Math.min(Math.max(padding, position.y), window.innerHeight - rect.height - padding),
    });
  }, [position]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const itemCount = entries.filter((entry) => entry.type === "item").length;
  if (itemCount === 0) return null;

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)]" role="presentation">
      <button
        aria-label="Chiudi menu contestuale"
        className="absolute inset-0 cursor-default bg-[var(--text-primary)]/[0.06] backdrop-blur-[1px]"
        onClick={onClose}
        type="button"
      />
      <m.div
        animate={motionVariants.popover.animate}
        className="pointer-events-auto fixed min-w-[252px] max-w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-xl bg-[var(--surface-base)] p-1.5 shadow-[0_18px_48px_color-mix(in_srgb,var(--text-primary)_14%,transparent)] ring-1 ring-[var(--border-subtle)]/80"
        exit={motionVariants.popover.exit}
        initial={motionVariants.popover.initial}
        ref={menuRef}
        role="menu"
        style={{ left: coords.x, top: coords.y }}
        transition={motionVariants.popover.transition}
      >
        {header ? (
          <div className="mb-1 rounded-lg border border-[var(--border-subtle)]/45 bg-[var(--bg-muted)]/35 px-3 py-2.5">
            <div className="flex items-start gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)]/[0.1] text-[var(--accent-primary)]">
                <HeaderIcon className="size-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-12px font-black tracking-tight text-[var(--text-primary)]">
                  {header.title}
                </p>
                {header.subtitle ? (
                  <p className="mt-0.5 line-clamp-2 text-11px leading-snug text-[var(--text-tertiary)]">
                    {header.subtitle}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="px-1 pb-0.5 pt-0.5">
          <p className="px-2 py-1 text-9px font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            Azioni
          </p>
        </div>

        <div className="flex flex-col gap-0.5">
          {(() => {
            let separatorIndex = 0;
            return entries.map((entry) => {
              if (entry.type === "separator") {
                separatorIndex += 1;
                return (
                  <hr
                    className="my-1 h-px border-0 bg-[var(--border-subtle)]/65"
                    key={`sep-${separatorIndex}`}
                  />
                );
              }

              const Icon = entry.icon;
              const isDanger = entry.tone === "danger";
              return (
                <button
                  className={cn(
                    "group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
                    entry.disabled
                      ? "cursor-not-allowed opacity-45"
                      : isDanger
                        ? "hover:bg-[var(--danger-soft)]/55"
                        : "hover:bg-[var(--accent-primary)]/[0.07] active:bg-[var(--accent-primary)]/[0.11]",
                  )}
                  disabled={entry.disabled}
                  key={entry.id}
                  onClick={() => {
                    if (entry.disabled) return;
                    entry.onSelect();
                    onClose();
                  }}
                  role="menuitem"
                  title={entry.hint}
                  type="button"
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                      entry.disabled
                        ? "bg-[var(--bg-muted)]/50 text-[var(--text-tertiary)]"
                        : isDanger
                          ? "bg-[var(--danger-soft)] text-[var(--danger-base)]"
                          : "bg-[var(--info-soft)]/80 text-[var(--info-base)] group-hover:bg-[var(--accent-primary)]/[0.12] group-hover:text-[var(--accent-primary)]",
                    )}
                  >
                    <Icon className="size-4" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-13px font-semibold",
                        entry.disabled
                          ? "text-[var(--text-tertiary)]"
                          : isDanger
                            ? "text-[var(--danger-base)]"
                            : "text-[var(--text-primary)]",
                      )}
                    >
                      {entry.label}
                    </span>
                    {entry.hint ? (
                      <span className="block truncate text-10px text-[var(--text-tertiary)]">
                        {entry.hint}
                      </span>
                    ) : null}
                  </span>
                  {entry.shortcut ? (
                    <kbd className="shrink-0 rounded-md border border-[var(--border-subtle)]/60 bg-[var(--bg-muted)]/50 px-1.5 py-0.5 font-mono text-10px font-bold text-[var(--text-tertiary)]">
                      {entry.shortcut}
                    </kbd>
                  ) : null}
                </button>
              );
            });
          })()}
        </div>
      </m.div>
    </div>,
    document.body,
  );
}

export function contextMenuSeparator(): AppContextMenuEntry {
  return { type: "separator" };
}

export function contextMenuItem(options: {
  id: string;
  icon: LucideIcon;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  hint?: string;
  shortcut?: string;
  tone?: "danger" | "neutral";
}): AppContextMenuEntry {
  return { type: "item", ...options };
}
