import { useEffect, useRef } from "react";
import { runAppUpdateCheck } from "@/lib/appUpdater";
import { usePreferenceState } from "@/store/app-store";

export function useAutomaticUpdater() {
  const hasCheckedRef = useRef(false);
  const { autoCheckUpdatesOnLaunch, hasHydratedPreferences, showReleaseNotesAfterUpdate } =
    usePreferenceState();

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
