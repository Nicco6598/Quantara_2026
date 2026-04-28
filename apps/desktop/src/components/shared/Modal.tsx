import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
};

export function Modal({ children, onClose, open }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="Chiudi"
        className="fixed inset-0 cursor-default border-none bg-black/40"
        onClick={onClose}
        type="button"
      />
      <div className="relative z-10">{children}</div>
    </div>,
    document.body,
  );
}
