import { listDesktopSalDocuments, listDesktopSalProjects } from "@/lib/sal-data";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";

/** Reload SAL workflow cache from SQLite (or browser fallback). */
export async function syncSalWorkflowFromBackend(projectId?: string | null): Promise<void> {
  const [docsResult, projsResult] = await Promise.all([
    listDesktopSalDocuments(projectId ?? null),
    listDesktopSalProjects(),
  ]);
  const store = useSalWorkflowStore.getState();

  if (projectId) {
    store.patchProjectSalFromBackend(
      projectId,
      docsResult.data,
      projsResult.data.filter((project) => project.id === projectId),
    );
    return;
  }

  store.replaceFromBackend(docsResult.data, projsResult.data);
}
