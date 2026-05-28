import type { ClipboardEvent as ReactClipboardEvent } from "react";
import { describe, expect, it } from "vitest";
import { shouldUseNativeClipboard, shouldUseNativePaste } from "../sal-clipboard-events";

function clipboardEvent(
  target: EventTarget,
  partial?: Partial<ReactClipboardEvent>,
): ReactClipboardEvent {
  return {
    target,
    clipboardData: null,
    preventDefault: () => {},
    ...partial,
  } as ReactClipboardEvent;
}

describe("sal-clipboard-events", () => {
  it("allows native copy when input has a text selection", () => {
    const input = document.createElement("input");
    input.value = "Stazione A";
    document.body.append(input);
    input.setSelectionRange(0, 5);

    expect(shouldUseNativeClipboard(clipboardEvent(input))).toBe(true);
    input.remove();
  });

  it("blocks structured copy hijack for plain input focus without selection", () => {
    const input = document.createElement("input");
    input.value = "1,25";
    document.body.append(input);
    input.setSelectionRange(3, 3);

    expect(shouldUseNativeClipboard(clipboardEvent(input))).toBe(false);
    input.remove();
  });

  it("allows native paste on focused input", () => {
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();

    expect(shouldUseNativePaste(clipboardEvent(input))).toBe(true);
    input.remove();
  });
});
