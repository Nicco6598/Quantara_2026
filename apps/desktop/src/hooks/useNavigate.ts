import { useCallback } from "react";
import { type QuantaraRoute, useNavigationState } from "@/store/app-store";

export function useNavigate() {
  const { setActiveRoute } = useNavigationState();

  return useCallback(
    (route: QuantaraRoute, context?: string, replace?: boolean) => {
      setActiveRoute(route, context, replace);
    },
    [setActiveRoute],
  );
}
