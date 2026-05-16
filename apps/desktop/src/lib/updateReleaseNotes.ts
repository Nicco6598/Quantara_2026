import { useCallback, useEffect, useState } from "react";
import { readJsonFromStorage, writeJsonToStorage } from "@/persistence/json-storage";
import { STORAGE_KEYS } from "@/persistence/storage-keys";

const STORAGE_KEY = STORAGE_KEYS.releaseNotesAfterUpdate;

export type PendingReleaseNotes = {
  body: string;
  currentVersion: string;
  installedAt: string;
  version: string;
};

export function storePendingReleaseNotes(notes: PendingReleaseNotes) {
  try {
    writeJsonToStorage(window.localStorage, STORAGE_KEY, notes);
  } catch {
    /* no-op */
  }
}

function clearPendingReleaseNotes() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* no-op */
  }
}

function readPendingReleaseNotes(): PendingReleaseNotes | null {
  try {
    return readJsonFromStorage<PendingReleaseNotes | null>(
      window.localStorage,
      STORAGE_KEY,
      null,
      isPendingReleaseNotes,
    );
  } catch {
    return null;
  }
}

function isPendingReleaseNotes(value: unknown): value is PendingReleaseNotes {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as PendingReleaseNotes).body === "string" &&
    typeof (value as PendingReleaseNotes).currentVersion === "string" &&
    typeof (value as PendingReleaseNotes).installedAt === "string" &&
    typeof (value as PendingReleaseNotes).version === "string"
  );
}

export function usePendingReleaseNotes() {
  const [pendingReleaseNotes, setPendingReleaseNotes] = useState<PendingReleaseNotes | null>(
    readPendingReleaseNotes,
  );

  const refresh = useCallback(() => {
    setPendingReleaseNotes(readPendingReleaseNotes());
  }, []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [refresh]);

  const dismissPendingReleaseNotes = () => {
    clearPendingReleaseNotes();
    setPendingReleaseNotes(null);
  };

  return {
    dismissPendingReleaseNotes,
    pendingReleaseNotes,
    refresh,
  };
}
