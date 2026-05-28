import type { ProjectsReportProject, QuantaraMigrationWorkbook } from "@quantara/excel-import";
import type { MigrationAction } from "@/features/projects/types";
import {
  countValidationIssues,
  saveWorkbookAs,
  waitForUiPaint,
} from "@/features/projects/utils/projects-helpers";
import { buildSalDocumentView } from "@/features/sal/domain/sal-workflow";
import type { SalDocument, SalTariffVoice } from "@/features/sal/types";
import type { DesktopContract } from "@/lib/desktopData";

type Notify = (toast: {
  message: string;
  title?: string;
  tone?: "danger" | "info" | "success" | "warning";
}) => string;

type UseProjectMigrationOptions = {
  contracts: DesktopContract[];
  notify: Notify;
  projects: ProjectsReportProject[];
  salDocuments: SalDocument[];
  setMigrationAction: (action: MigrationAction) => void;
  tariffVoices: SalTariffVoice[];
};

export function useProjectMigration({
  contracts,
  notify,
  projects,
  salDocuments,
  setMigrationAction,
  tariffVoices,
}: UseProjectMigrationOptions) {
  async function exportProjectsReportWorkbook(
    projectsForExport: ProjectsReportProject[] = projects,
  ) {
    setMigrationAction("export");

    try {
      const { serializeProjectsReportWorkbook } = await import("@quantara/excel-import");
      const projectIds = new Set(projectsForExport.map((project) => project.id));
      const salViews = salDocuments
        .filter((document) => projectIds.has(document.projectId))
        .map((document) => buildSalDocumentView(document, tariffVoices));
      const fileName = createReportFileName(projectsForExport);

      await waitForUiPaint();
      const savedPath = await saveWorkbookAs(
        await serializeProjectsReportWorkbook({
          contracts: contracts.filter((contract) => projectIds.has(contract.id)),
          projects: projectsForExport,
          salDocuments: salViews,
        }),
        fileName,
      );
      if (!savedPath) {
        notify({
          message: "Export annullato.",
          title: "Export Excel",
          tone: "info",
        });
        return;
      }
      notify({
        message:
          projectsForExport.length > 0
            ? `${projectsForExport.length} progetti inclusi nel report.`
            : "Report esportato senza progetti locali.",
        title: "Report Excel completato",
        tone: "success",
      });
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Report Excel non riuscito",
        tone: "danger",
      });
    } finally {
      setMigrationAction("idle");
    }
  }

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
      const savedPath = await saveWorkbookAs(
        await serializeQuantaraMigrationWorkbook(data),
        "quantara-projects-export.xlsx",
      );
      if (!savedPath) {
        notify({
          message: "Export annullato.",
          title: "Export Excel",
          tone: "info",
        });
        return;
      }
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

  return { exportMigrationWorkbook, exportProjectsReportWorkbook, importMigrationFile };
}

function createReportFileName(projects: ProjectsReportProject[]): string {
  const date = new Date().toISOString().slice(0, 10);
  if (projects.length === 1) {
    return `quantara-report-${slugify(projects[0]?.title ?? "progetto")}-${date}.xlsx`;
  }
  return `quantara-report-progetti-${date}.xlsx`;
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "progetto"
  );
}
