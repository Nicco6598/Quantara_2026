import { useCallback } from "react";
import { type QuantaraRoute, useAppStore } from "@/store/app-store";

export function useNavigate() {
  const setActiveRoute = useAppStore((state) => state.setActiveRoute);

  return useCallback(
    (route: QuantaraRoute) => {
      setActiveRoute(route);
    },
    [setActiveRoute],
  );
}
