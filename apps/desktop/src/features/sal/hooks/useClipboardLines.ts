import { useCallback } from "react";
import { useToast } from "@/components/shared/ToastProvider";
import type { SalLineDraft } from "@/features/sal/types";

type ClipboardLine = {
  code: string;
  description: string;
  quantity: number;
  surchargePercent: number;
};

export function useClipboardLines() {
  const { notify } = useToast();

  const copyLines = useCallback(
    (lines: SalLineDraft[]) => {
      const data: ClipboardLine[] = lines.map((l) => ({
        code: l.voice.code,
        description: l.voice.description,
        quantity: l.quantity,
        surchargePercent: l.surchargePercent,
      }));

      const json = JSON.stringify({ version: 1, lines: data });
      navigator.clipboard.write([
        new ClipboardItem({
          "application/x-quantara-sal-lines": new Blob([json], { type: "application/json" }),
          "text/plain": new Blob(
            [data.map((l) => `${l.code}\t${l.description}\t${l.quantity}`).join("\n")],
            { type: "text/plain" },
          ),
        }),
      ]);

      notify({
        message: `${data.length} voci copiate negli appunti.`,
        title: "Copiato",
        tone: "success",
      });
    },
    [notify],
  );

  const pasteLines = useCallback(async (): Promise<ClipboardLine[] | null> => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes("application/x-quantara-sal-lines")) {
          const blob = await item.getType("application/x-quantara-sal-lines");
          const text = await blob.text();
          const parsed = JSON.parse(text) as { version: number; lines: ClipboardLine[] };
          if (Array.isArray(parsed.lines) && parsed.version === 1) {
            notify({
              message: `${parsed.lines.length} voci incollate.`,
              title: "Incollato",
              tone: "success",
            });
            return parsed.lines;
          }
        }
      }

      notify({
        message: "Nessun dato SAL valido trovato negli appunti.",
        title: "Incolla",
        tone: "warning",
      });
      return null;
    } catch {
      notify({
        message: "Impossibile leggere gli appunti.",
        title: "Errore",
        tone: "danger",
      });
      return null;
    }
  }, [notify]);

  return { copyLines, pasteLines };
}
