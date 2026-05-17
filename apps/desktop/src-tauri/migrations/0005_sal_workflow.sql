CREATE TABLE IF NOT EXISTS sal_workflow_projects (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sal_workflow_documents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  data TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sal_workflow_documents_project_id
  ON sal_workflow_documents(project_id);
