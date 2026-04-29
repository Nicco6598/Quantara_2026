import {
  parseQuantaraMigrationWorkbook,
  type QuantaraMigrationWorkbook,
  serializeQuantaraMigrationWorkbook,
  validateQuantaraMigrationWorkbook,
} from "@quantara/excel-import";
import type { MigrationAction } from "@/features/projects/types";
import {
  countValidationIssues,
  downloadWorkbook,
  waitForUiPaint,
} from "@/features/projects/utils/projects-helpers";
import type { DesktopContract } from "@/lib/desktopData";

type CreateState = "idle" | "saving" | "saved" | "error";

type Notify = (toast: {
  message: string;
  title?: string;
  tone?: "danger" | "info" | "success" | "warning";
}) => string;

type UseProjectMigrationOptions = {
  contracts: DesktopContract[];
  notify: Notify;
  setCreateMessage: (message: string) => void;
  setCreateState: (state: CreateState) => void;
  setMigrationAction: (action: MigrationAction) => void;
};

export function useProjectMigration({
  contracts,
  notify,
  setCreateMessage,
  setCreateState,
  setMigrationAction,
}: UseProjectMigrationOptions) {
  async function exportMigrationWorkbook() {
    setMigrationAction("export");
    setCreateState("saving");
    setCreateMessage("Preparazione export Excel...");

    const data: QuantaraMigrationWorkbook = {
      materials: [],
      projects: contracts.map((contract) => ({
        applicationContractCode: contract.applicationContractCode,
        client: "",
        contractualAmount: contract.contractualAmount.amount,
        description: "",
        frameworkAgreementCode: contract.frameworkAgreementCode,
        tariffBookId: contract.tariffPriorities[0]?.tariffBookId ?? "",
        title: contract.title,
        year: new Date().getFullYear(),
      })),
      sal: [],
    };

    try {
      await waitForUiPaint();
      downloadWorkbook(serializeQuantaraMigrationWorkbook(data), "quantara-projects-export.xlsx");
      setCreateState("saved");
      setCreateMessage(
        data.projects.length > 0
          ? `Export Excel completato: ${data.projects.length} progetti inclusi.`
          : "Export Excel scaricato senza progetti locali. Usa il template per una migrazione pulita.",
      );
      notify({
        message:
          data.projects.length > 0
            ? `${data.projects.length} progetti inclusi nell'export.`
            : "Export scaricato senza progetti locali.",
        title: "Export Excel completato",
        tone: "success",
      });
    } catch (error) {
      setCreateState("error");
      setCreateMessage(error instanceof Error ? error.message : String(error));
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Export non riuscito",
        tone: "danger",
      });
    } finally {
      setMigrationAction("idle");
    }
  }

  async function importMigrationFile(file: File) {
    setMigrationAction("import");
    setCreateState("saving");
    setCreateMessage(`Lettura ${file.name}...`);

    try {
      const data = parseQuantaraMigrationWorkbook(await file.arrayBuffer());
      const validation = validateQuantaraMigrationWorkbook(data);

      setCreateState(validation.valid ? "saved" : "error");
      setCreateMessage(
        validation.valid
          ? `${file.name}: ${validation.importableRows} righe pronte per l'import.`
          : `${file.name}: correggi ${countValidationIssues(validation, "error")} errori prima del commit.`,
      );
      notify({
        message: validation.valid
          ? `${validation.importableRows} righe pronte per l'import.`
          : `${countValidationIssues(validation, "error")} errori da correggere prima del commit.`,
        title: file.name,
        tone: validation.valid ? "success" : "warning",
      });
    } catch (error) {
      setCreateState("error");
      setCreateMessage(error instanceof Error ? error.message : String(error));
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Import Excel non riuscito",
        tone: "danger",
      });
    } finally {
      setMigrationAction("idle");
    }
  }

  return { exportMigrationWorkbook, importMigrationFile };
}
