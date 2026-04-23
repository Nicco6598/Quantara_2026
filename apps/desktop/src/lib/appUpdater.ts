import { relaunch } from "@tauri-apps/plugin-process";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { storePendingReleaseNotes } from "@/lib/updateReleaseNotes";

export const APP_UPDATE_AVAILABLE_EVENT = "quantara:update-available";

let pendingUpdate: Update | null = null;

export type AvailableAppUpdate = {
  checkedAt: string;
  currentVersion: string;
  notes: string;
  version: string;
};

export type UpdateCheckResult =
  | ({ kind: "available" } & AvailableAppUpdate)
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

export type UpdateInstallState =
  | {
      downloadedBytes: number;
      phase: "downloading";
      totalBytes: number | null;
    }
  | {
      phase: "installing";
    };

export async function runAppUpdateCheck({
  promptForInstall = true,
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

    pendingUpdate = update;

    const result: UpdateCheckResult = {
      checkedAt,
      currentVersion: update.currentVersion,
      kind: "available",
      notes: update.body?.trim() ?? "",
      version: update.version,
    };

    if (promptForInstall && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<AvailableAppUpdate>(APP_UPDATE_AVAILABLE_EVENT, {
          detail: {
            checkedAt,
            currentVersion: update.currentVersion,
            notes: update.body?.trim() ?? "",
            version: update.version,
          },
        }),
      );
    }

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

export async function installPendingAppUpdate({
  onStateChange,
  showReleaseNotesAfterUpdate = true,
}: {
  onStateChange?: (state: UpdateInstallState) => void;
  showReleaseNotesAfterUpdate?: boolean;
} = {}) {
  if (!pendingUpdate) {
    throw new Error("Nessun aggiornamento pronto per l'installazione.");
  }

  const update = pendingUpdate;
  let totalBytes: number | null = null;
  let downloadedBytes = 0;

  await update.downloadAndInstall((event: DownloadEvent) => {
    switch (event.event) {
      case "Started":
        totalBytes = event.data.contentLength ?? null;
        downloadedBytes = 0;
        onStateChange?.({
          downloadedBytes,
          phase: "downloading",
          totalBytes,
        });
        break;
      case "Progress":
        downloadedBytes += event.data.chunkLength;
        onStateChange?.({
          downloadedBytes,
          phase: "downloading",
          totalBytes,
        });
        break;
      case "Finished":
        onStateChange?.({
          phase: "installing",
        });
        break;
    }
  });

  if (showReleaseNotesAfterUpdate) {
    storePendingReleaseNotes({
      body: update.body?.trim() ?? "",
      currentVersion: update.currentVersion,
      installedAt: new Date().toISOString(),
      version: update.version,
    });
  }

  pendingUpdate = null;
  await relaunch();
}

export function dismissPendingAppUpdate() {
  pendingUpdate = null;
}
