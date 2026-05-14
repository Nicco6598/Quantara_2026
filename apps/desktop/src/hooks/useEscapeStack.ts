import { useEffect, useRef } from "react";

type EscapeHandler = () => void;

const globalStack: EscapeHandler[] = [];

function pushEscapeHandler(handler: EscapeHandler) {
  globalStack.push(handler);
}

function popEscapeHandler(handler: EscapeHandler) {
  const index = globalStack.indexOf(handler);
  if (index !== -1) {
    globalStack.splice(index, 1);
  }
}

function executeEscape(): boolean {
  const handler = globalStack.pop();
  if (handler) {
    handler();
    return true;
  }
  return false;
}

export function useEscapeStack(handler: EscapeHandler, active: boolean) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!active) return;
    const wrapped = () => handlerRef.current();
    pushEscapeHandler(wrapped);
    return () => popEscapeHandler(wrapped);
  }, [active]);
}

export function useGlobalEscapeListener() {
  const handlerRef = useRef((event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    const target = event.target as HTMLElement | null;
    const isTyping =
      target?.tagName === "INPUT" ||
      target?.tagName === "TEXTAREA" ||
      target?.isContentEditable === true;

    if (isTyping) return;
    event.preventDefault();
    executeEscape();
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => handlerRef.current(event);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
