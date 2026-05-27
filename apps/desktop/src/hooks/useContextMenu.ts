import { useCallback, useState } from "react";

export type ContextMenuState<TContext> = {
  context: TContext;
  x: number;
  y: number;
} | null;

export function openContextMenuFromEvent<TContext>(
  event: React.MouseEvent,
  context: TContext,
): ContextMenuState<TContext> {
  event.preventDefault();
  event.stopPropagation();
  return { context, x: event.clientX, y: event.clientY };
}

export function useContextMenu<TContext>() {
  const [state, setState] = useState<ContextMenuState<TContext>>(null);

  const open = useCallback((event: React.MouseEvent, context: TContext) => {
    setState(openContextMenuFromEvent(event, context));
  }, []);

  const close = useCallback(() => setState(null), []);

  const bind = useCallback(
    (context: TContext) => ({
      onContextMenu: (event: React.MouseEvent) => open(event, context),
    }),
    [open],
  );

  return { state, open, close, bind, isOpen: state !== null };
}
