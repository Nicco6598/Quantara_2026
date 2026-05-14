import { useEffect, useState } from "react";

export type PendingReleaseNotes = {
  body: string;
  currentVersion: string;
  installedAt: string;
  version: string;
};

async function writeViaTauri(notes: PendingReleaseNotes): Promise<void> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("write_pending_release_notes", { json: JSON.stringify(notes) });
  } catch {
    // Fallback to localStorage
    try {
      window.localStorage.setItem("quantara.pending-release-notes", JSON.stringify(notes));
    } catch {
      /* no-op */
    }
  }
}

async function readViaTauri(): Promise<PendingReleaseNotes | null> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const json = await invoke<string>("read_pending_release_notes");
    return JSON.parse(json) as PendingReleaseNotes;
  } catch {
    // Fallback to localStorage
    try {
      const raw = window.localStorage.getItem("quantara.pending-release-notes");
      return raw ? (JSON.parse(raw) as PendingReleaseNotes) : null;
    } catch {
      return null;
    }
  }
}

async function clearViaTauri(): Promise<void> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("clear_pending_release_notes");
  } catch {
    try {
      window.localStorage.removeItem("quantara.pending-release-notes");
    } catch {
      /* no-op */
    }
  }
}

export function storePendingReleaseNotes(notes: PendingReleaseNotes) {
  void writeViaTauri(notes);
}

function clearPendingReleaseNotes() {
  void clearViaTauri();
}

export function usePendingReleaseNotes() {
  const [pendingReleaseNotes, setPendingReleaseNotes] = useState<PendingReleaseNotes | null>(null);

  useEffect(() => {
    readViaTauri().then(setPendingReleaseNotes);
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
