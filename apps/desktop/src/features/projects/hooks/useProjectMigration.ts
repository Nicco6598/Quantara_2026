import type { QuantaraMigrationWorkbook } from "@quantara/excel-import";
import type { MigrationAction } from "@/features/projects/types";
import {
  countValidationIssues,
  downloadWorkbook,
  waitForUiPaint,
} from "@/features/projects/utils/projects-helpers";
import type { DesktopContract } from "@/lib/desktopData";

type Notify = (toast: {
  message: string;
  title?: string;
  tone?: "danger" | "info" | "success" | "warning";
}) => string;

type UseProjectMigrationOptions = {
  contracts: DesktopContract[];
  notify: Notify;
  setMigrationAction: (action: MigrationAction) => void;
};

export function useProjectMigration({
  contracts,
  notify,
  setMigrationAction,
}: UseProjectMigrationOptions) {
  async function exportMigrationWorkbook() {
    setMigrationAction("export");

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
      const { serializeQuantaraMigrationWorkbook } = await import("@quantara/excel-import");

      await waitForUiPaint();
      downloadWorkbook(
        await serializeQuantaraMigrationWorkbook(data),
        "quantara-projects-export.xlsx",
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

    try {
      const { parseQuantaraMigrationWorkbook, validateQuantaraMigrationWorkbook } = await import(
        "@quantara/excel-import"
      );
      const data = await parseQuantaraMigrationWorkbook(await file.arrayBuffer());
      const validation = validateQuantaraMigrationWorkbook(data);

      notify({
        message: validation.valid
          ? `${validation.importableRows} righe pronte per l'import.`
          : `${countValidationIssues(validation, "error")} errori da correggere prima del commit.`,
        title: file.name,
        tone: validation.valid ? "success" : "warning",
      });
    } catch (error) {
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
