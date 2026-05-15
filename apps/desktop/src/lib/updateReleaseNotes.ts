import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "quantara.pending-release-notes";

export type PendingReleaseNotes = {
  body: string;
  currentVersion: string;
  installedAt: string;
  version: string;
};

export function storePendingReleaseNotes(notes: PendingReleaseNotes) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
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
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingReleaseNotes) : null;
  } catch {
    return null;
  }
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
