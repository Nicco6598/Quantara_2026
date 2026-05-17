export const STORAGE_KEYS = {
  auditLog: "quantara-audit-log-v1",
  contractorMigrationDone: "quantara.contractorsDbMigration.v1",
  contractorRegistry: "quantara.contractorRegistry.v1",
  projectContractors: "quantara.projectContractors.v1",
  projectDraft: "quantara.projectDraft.v2",
  projectAutoDraft: "quantara.projectAutoDraft.v1",
  releaseNotesAfterUpdate: "quantara.pending-release-notes",
  salCreationDraft: "quantara.salCreationDraft.v1",
  salTemplates: "quantara-sal-templates-v1",
  salWorkflow: "quantara-sal-workflow",
  shellPreferences: "quantara-shell-preferences",
  tariffFavoriteBookIds: "quantara.tariffs.favoriteBookIds",
  previewContracts: "quantara.preview.contracts.v1",
  previewMaterials: "quantara.preview.materials.v1",
  filterTemplates: "quantara-filter-templates-v1",
} as const;

export const SESSION_STORAGE_KEYS = {
  editingContractId: "quantara.editingContractId.v1",
  editingProject: "quantara.editingProject.v1",
  salCreated: "quantara.salCreated.v1",
  salResumeDraft: "quantara.salResumeDraft.v1",
  selectedProjectDetail: "quantara.selectedProjectDetail.v1",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
export type SessionStorageKey = (typeof SESSION_STORAGE_KEYS)[keyof typeof SESSION_STORAGE_KEYS];
