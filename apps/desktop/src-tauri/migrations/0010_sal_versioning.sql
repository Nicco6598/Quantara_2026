ALTER TABLE sal_documents_v2 ADD COLUMN change_reason TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS sal_document_versions (
  id TEXT PRIMARY KEY,
  sal_id TEXT NOT NULL REFERENCES sal_documents_v2(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  change_reason TEXT NOT NULL DEFAULT '',
  snapshot_json TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sal_doc_versions_sal_id ON sal_document_versions(sal_id);
CREATE INDEX IF NOT EXISTS idx_sal_doc_versions_version ON sal_document_versions(sal_id, version);
