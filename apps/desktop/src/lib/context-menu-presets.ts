import {
  ArrowRight,
  Copy,
  Database,
  Eye,
  FileText,
  Pencil,
  Star,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import {
  type AppContextMenuEntry,
  contextMenuItem,
  contextMenuSeparator,
} from "@/components/shared/AppContextMenu";

export function buildProjectRowContextMenuEntries(actions: {
  onOpen: () => void;
  onEdit: () => void;
  onCreateSal: () => void;
  onDelete: () => void;
}): AppContextMenuEntry[] {
  return [
    contextMenuItem({ id: "open", icon: Eye, label: "Apri dossier", onSelect: actions.onOpen }),
    contextMenuItem({
      id: "new-sal",
      icon: FileText,
      label: "Nuova SAL",
      onSelect: actions.onCreateSal,
    }),
    contextMenuItem({
      id: "edit",
      icon: Pencil,
      label: "Modifica progetto",
      onSelect: actions.onEdit,
    }),
    contextMenuSeparator(),
    contextMenuItem({
      id: "delete",
      icon: Trash2,
      label: "Elimina progetto",
      tone: "danger",
      onSelect: actions.onDelete,
    }),
  ];
}

export function buildContractorContextMenuEntries(actions: {
  onDelete: () => void;
}): AppContextMenuEntry[] {
  return [
    contextMenuItem({
      id: "delete",
      icon: Trash2,
      label: "Elimina appaltatore",
      tone: "danger",
      onSelect: actions.onDelete,
    }),
  ];
}

export function buildMaterialContextMenuEntries(actions: {
  onEdit: () => void;
  onDelete: () => void;
  onCopyCode?: () => void;
}): AppContextMenuEntry[] {
  const entries: AppContextMenuEntry[] = [];
  if (actions.onCopyCode) {
    entries.push(
      contextMenuItem({
        id: "copy-code",
        icon: Copy,
        label: "Copia codice",
        onSelect: actions.onCopyCode,
      }),
    );
  }
  entries.push(
    contextMenuItem({ id: "edit", icon: Pencil, label: "Modifica", onSelect: actions.onEdit }),
    contextMenuSeparator(),
    contextMenuItem({
      id: "delete",
      icon: Trash2,
      label: "Elimina materiale",
      tone: "danger",
      onSelect: actions.onDelete,
    }),
  );
  return entries;
}

export function buildTariffBookContextMenuEntries(actions: {
  onShowDetails: () => void;
  onEdit: () => void;
  onOpenVoices: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  onDelete: () => void;
}): AppContextMenuEntry[] {
  return [
    contextMenuItem({
      id: "details",
      icon: Eye,
      label: "Mostra scheda",
      onSelect: actions.onShowDetails,
    }),
    contextMenuItem({
      id: "favorite",
      icon: Star,
      label: actions.isFavorite ? "Rimuovi preferito" : "Segna preferito",
      onSelect: actions.onToggleFavorite,
    }),
    contextMenuItem({
      id: "edit",
      icon: Pencil,
      label: "Modifica dettagli",
      onSelect: actions.onEdit,
    }),
    contextMenuItem({
      id: "voices",
      icon: Database,
      label: "Modifica voci",
      onSelect: actions.onOpenVoices,
    }),
    contextMenuSeparator(),
    contextMenuItem({
      id: "delete",
      icon: Trash2,
      label: "Elimina tariffario",
      tone: "danger",
      onSelect: actions.onDelete,
    }),
  ];
}

export function buildTariffVoiceContextMenuEntries(actions: {
  onCopyCode: () => void;
  onDelete: () => void;
}): AppContextMenuEntry[] {
  return [
    contextMenuItem({
      id: "copy-code",
      icon: Copy,
      label: "Copia codice voce",
      onSelect: actions.onCopyCode,
    }),
    contextMenuSeparator(),
    contextMenuItem({
      id: "delete",
      icon: Trash2,
      label: "Elimina voce",
      tone: "danger",
      onSelect: actions.onDelete,
    }),
  ];
}

export function buildSalCardContextMenuEntries(actions: {
  isDraft: boolean;
  isReview: boolean;
  onContinue?: () => void;
  onWorkflow: () => void;
  onDelete: () => void;
}): AppContextMenuEntry[] {
  const entries: AppContextMenuEntry[] = [];
  if (actions.isDraft && actions.onContinue) {
    entries.push(
      contextMenuItem({
        id: "continue",
        icon: ArrowRight,
        label: "Continua bozza",
        onSelect: actions.onContinue,
      }),
    );
  }
  if (actions.isDraft || actions.isReview) {
    entries.push(
      contextMenuItem({
        id: "workflow",
        icon: ThumbsUp,
        label: actions.isDraft ? "Invia in revisione" : "Approva",
        onSelect: actions.onWorkflow,
      }),
    );
  }
  entries.push(
    contextMenuSeparator(),
    contextMenuItem({
      id: "delete",
      icon: Trash2,
      label: "Elimina SAL",
      tone: "danger",
      onSelect: actions.onDelete,
    }),
  );
  return entries;
}

export function buildTeamMemberContextMenuEntries(actions: {
  onRemove: () => void;
  onCopyEmail?: () => void;
}): AppContextMenuEntry[] {
  const entries: AppContextMenuEntry[] = [];
  if (actions.onCopyEmail) {
    entries.push(
      contextMenuItem({
        id: "copy-email",
        icon: Copy,
        label: "Copia email",
        onSelect: actions.onCopyEmail,
      }),
      contextMenuSeparator(),
    );
  }
  entries.push(
    contextMenuItem({
      id: "remove",
      icon: Trash2,
      label: "Rimuovi membro",
      tone: "danger",
      onSelect: actions.onRemove,
    }),
  );
  return entries;
}

export function buildAccountingSalContextMenuEntries(actions: {
  onOpenProject?: () => void;
  onCopyTitle?: () => void;
}): AppContextMenuEntry[] {
  const entries: AppContextMenuEntry[] = [];
  if (actions.onCopyTitle) {
    entries.push(
      contextMenuItem({
        id: "copy",
        icon: Copy,
        label: "Copia titolo",
        onSelect: actions.onCopyTitle,
      }),
    );
  }
  if (actions.onOpenProject) {
    entries.push(
      contextMenuItem({
        id: "open",
        icon: Eye,
        label: "Apri progetto",
        onSelect: actions.onOpenProject,
      }),
    );
  }
  return entries;
}

export function buildSalMaterialContextMenuEntries(actions: {
  onCopyCode: () => void;
  onResetUsage: () => void;
}): AppContextMenuEntry[] {
  return [
    contextMenuItem({
      id: "copy-code",
      icon: Copy,
      label: "Copia codice",
      onSelect: actions.onCopyCode,
    }),
    contextMenuItem({
      id: "reset-usage",
      icon: Trash2,
      label: "Azzera quantità usata",
      onSelect: actions.onResetUsage,
    }),
  ];
}

export async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}
