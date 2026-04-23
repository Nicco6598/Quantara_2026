import { useEffect, useRef } from "react";
import { confirm } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { storePendingReleaseNotes } from "@/lib/updateReleaseNotes";

export function useAutomaticUpdater() {
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!import.meta.env.PROD) {
      return;
    }

    if (hasCheckedRef.current) {
      return;
    }

    hasCheckedRef.current = true;

    let cancelled = false;

    const runUpdateCheck = async () => {
      try {
        const update = await check();

        if (!update || cancelled) {
          return;
        }

        const confirmed = await confirm(
          `A new Quantara version (${update.version}) is available. Install it now?`,
          {
            title: "Quantara update",
            kind: "info",
            okLabel: "Install",
            cancelLabel: "Later",
          },
        );

        if (!confirmed || cancelled) {
          return;
        }

        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case "Started":
              console.info(`Update download started: ${event.data.contentLength} bytes.`);
              break;
            case "Progress":
              console.info(`Update download progress: ${event.data.chunkLength} bytes received.`);
              break;
            case "Finished":
              console.info("Update download finished.");
              break;
          }
        });

        if (!cancelled) {
          storePendingReleaseNotes({
            body: update.body?.trim() ?? "",
            currentVersion: update.currentVersion,
            installedAt: new Date().toISOString(),
            version: update.version,
          });
          await relaunch();
        }
      } catch (error) {
        console.warn("Automatic update check failed.", error);
      }
    };

    void runUpdateCheck();

    return () => {
      cancelled = true;
    };
  }, []);
}
