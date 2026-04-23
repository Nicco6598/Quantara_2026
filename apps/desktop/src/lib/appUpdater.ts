import { confirm } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { storePendingReleaseNotes } from "@/lib/updateReleaseNotes";

export type UpdateCheckResult =
  | {
      checkedAt: string;
      kind: "available";
      notes: string;
      version: string;
    }
  | {
      checkedAt: string;
      kind: "error";
      message: string;
    }
  | {
      checkedAt: string;
      kind: "unsupported";
      message: string;
    }
  | {
      checkedAt: string;
      kind: "up-to-date";
    };

type RunAppUpdateCheckOptions = {
  promptForInstall?: boolean;
  showReleaseNotesAfterUpdate?: boolean;
};

export async function runAppUpdateCheck({
  promptForInstall = true,
  showReleaseNotesAfterUpdate = true,
}: RunAppUpdateCheckOptions = {}): Promise<UpdateCheckResult> {
  const checkedAt = new Date().toISOString();

  if (!import.meta.env.PROD) {
    return {
      checkedAt,
      kind: "unsupported",
      message: "Il controllo update e disponibile nella build desktop di release.",
    };
  }

  try {
    const update = await check();

    if (!update) {
      return {
        checkedAt,
        kind: "up-to-date",
      };
    }

    const result = {
      checkedAt,
      kind: "available" as const,
      notes: update.body?.trim() ?? "",
      version: update.version,
    };

    if (!promptForInstall) {
      return result;
    }

    const confirmed = await confirm(
      `E disponibile una nuova versione di Quantara (${update.version}). Vuoi installarla ora?`,
      {
        cancelLabel: "Dopo",
        kind: "info",
        okLabel: "Installa",
        title: "Aggiornamento Quantara",
      },
    );

    if (!confirmed) {
      return result;
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

    if (showReleaseNotesAfterUpdate) {
      storePendingReleaseNotes({
        body: result.notes,
        currentVersion: update.currentVersion,
        installedAt: new Date().toISOString(),
        version: update.version,
      });
    }

    await relaunch();

    return result;
  } catch (error) {
    return {
      checkedAt,
      kind: "error",
      message:
        error instanceof Error
          ? error.message
          : "Il controllo aggiornamenti non e andato a buon fine.",
    };
  }
}
