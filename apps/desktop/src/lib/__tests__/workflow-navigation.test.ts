import { beforeEach, describe, expect, it } from "vitest";
import { SESSION_STORAGE_KEYS } from "@/persistence/storage-keys";
import { useAppStore } from "@/store/app-store";
import {
  getWorkflowProjectId,
  migrateWorkflowNavigationFromSession,
  selectProjectForWorkflow,
  takeResumeSalDraftId,
} from "../workflow-navigation";

describe("workflow-navigation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useAppStore.setState({
      selectedProjectId: "",
      resumeSalDraftId: "",
      salCreatedRedirectPending: false,
      editingProjectForm: null,
      editingContractId: "",
    });
  });

  it("migrates legacy session keys into the app store", () => {
    sessionStorage.setItem(
      SESSION_STORAGE_KEYS.selectedProjectDetail,
      JSON.stringify({ id: "proj-1" }),
    );
    sessionStorage.setItem(SESSION_STORAGE_KEYS.salResumeDraft, "sal-9");

    migrateWorkflowNavigationFromSession();

    expect(getWorkflowProjectId()).toBe("proj-1");
    expect(takeResumeSalDraftId()).toBe("sal-9");
    expect(sessionStorage.getItem(SESSION_STORAGE_KEYS.selectedProjectDetail)).toBeNull();
  });

  it("selectProjectForWorkflow updates persisted project id", () => {
    selectProjectForWorkflow("proj-42");
    expect(getWorkflowProjectId()).toBe("proj-42");
  });
});
