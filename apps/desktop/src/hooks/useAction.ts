import { useCallback, useEffect, useRef } from "react";
import { type ActionHandler, type AppAction, actionRegistry } from "@/lib/action-registry";

export function useAction() {
  const dispatch = useCallback((action: AppAction) => {
    actionRegistry.dispatch(action);
  }, []);

  const subscribe = useCallback((type: AppAction["type"], handler: ActionHandler) => {
    return actionRegistry.subscribe(type, handler);
  }, []);

  return { dispatch, subscribe };
}

export function useActionHandler(type: AppAction["type"], handler: ActionHandler): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const wrapped: ActionHandler = (action) => handlerRef.current(action);
    return actionRegistry.subscribe(type, wrapped);
  }, [type]);
}
