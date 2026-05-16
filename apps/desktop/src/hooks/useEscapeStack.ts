import { useEffect, useRef } from "react";

type EscapeHandler = () => void;

type StackEntry = {
  handler: EscapeHandler;
  id: number;
};

const globalStack: StackEntry[] = [];
let nextId = 0;

function pushEscapeHandler(handler: EscapeHandler): number {
  const id = nextId++;
  globalStack.push({ handler, id });
  return id;
}

function popEscapeHandler(id: number) {
  const index = globalStack.findIndex((entry) => entry.id === id);
  if (index !== -1) {
    globalStack.splice(index, 1);
  }
}

function executeEscape(): boolean {
  const entry = globalStack.pop();
  if (entry) {
    entry.handler();
    return true;
  }
  return false;
}

export function useEscapeStack(handler: EscapeHandler, active: boolean) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const idRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const wrapped = () => handlerRef.current();
    idRef.current = pushEscapeHandler(wrapped);
    return () => {
      if (idRef.current !== null) {
        popEscapeHandler(idRef.current);
      }
    };
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
