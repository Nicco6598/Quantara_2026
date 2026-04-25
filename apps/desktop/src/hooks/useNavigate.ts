import { useCallback } from "react";
import { useAppStore, type QuantaraRoute } from "@/store/app-store";

export function useNavigate() {
  const setActiveRoute = useAppStore((state) => state.setActiveRoute);

  return useCallback(
    (route: QuantaraRoute) => {
      setActiveRoute(route);
    },
    [setActiveRoute],
  );
}
