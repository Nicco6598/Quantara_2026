import type { ClipboardEvent as ReactClipboardEvent } from "react";

/** True when the user is copying/cutting selected text inside a field — keep OS clipboard. */
export function shouldUseNativeClipboard(event: ReactClipboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart;
    const end = target.selectionEnd;
    if (start != null && end != null && start !== end) return true;
  }

  if (target.isContentEditable) {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
      return true;
    }
  }

  return false;
}

/** Paste plain text into focused inputs without SAL structured hijack. */
export function shouldUseNativePaste(event: ReactClipboardEvent): boolean {
  if (shouldUseNativeClipboard(event)) return true;
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return document.activeElement === target;
  }
  return false;
}
