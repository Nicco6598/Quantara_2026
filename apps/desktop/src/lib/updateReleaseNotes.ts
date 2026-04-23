import { useEffect, useState } from "react";

const RELEASE_NOTES_STORAGE_KEY = "quantara.pending-release-notes";

export type PendingReleaseNotes = {
  body: string;
  currentVersion: string;
  installedAt: string;
  version: string;
};

export function loadPendingReleaseNotes(): PendingReleaseNotes | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(RELEASE_NOTES_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PendingReleaseNotes;
  } catch {
    return null;
  }
}

export function storePendingReleaseNotes(notes: PendingReleaseNotes) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(RELEASE_NOTES_STORAGE_KEY, JSON.stringify(notes));
}

export function clearPendingReleaseNotes() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(RELEASE_NOTES_STORAGE_KEY);
}

export function usePendingReleaseNotes() {
  const [pendingReleaseNotes, setPendingReleaseNotes] = useState<PendingReleaseNotes | null>(null);

  useEffect(() => {
    setPendingReleaseNotes(loadPendingReleaseNotes());
  }, []);

  const dismissPendingReleaseNotes = () => {
    clearPendingReleaseNotes();
    setPendingReleaseNotes(null);
  };

  return {
    dismissPendingReleaseNotes,
    pendingReleaseNotes,
  };
}
