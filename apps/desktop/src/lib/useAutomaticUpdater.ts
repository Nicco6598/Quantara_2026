import { useEffect, useRef } from "react";
import { runAppUpdateCheck } from "@/lib/appUpdater";
import { useAppStore } from "@/store/app-store";

export function useAutomaticUpdater() {
  const hasCheckedRef = useRef(false);
  const autoCheckUpdatesOnLaunch = useAppStore((state) => state.autoCheckUpdatesOnLaunch);
  const hasHydratedPreferences = useAppStore((state) => state.hasHydratedPreferences);
  const showReleaseNotesAfterUpdate = useAppStore((state) => state.showReleaseNotesAfterUpdate);

  useEffect(() => {
    if (!import.meta.env.PROD || !hasHydratedPreferences || !autoCheckUpdatesOnLaunch) {
      return;
    }

    if (hasCheckedRef.current) {
      return;
    }

    hasCheckedRef.current = true;

    void runAppUpdateCheck({
      promptForInstall: true,
      showReleaseNotesAfterUpdate,
    }).then((result) => {
      if (result.kind === "error") {
        console.warn("Automatic update check failed.", result.message);
      }
    });
  }, [autoCheckUpdatesOnLaunch, hasHydratedPreferences, showReleaseNotesAfterUpdate]);
}
