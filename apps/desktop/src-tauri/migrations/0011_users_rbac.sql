CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Project Manager',
  status TEXT NOT NULL DEFAULT 'active',
  avatar_initials TEXT NOT NULL DEFAULT '',
  last_access_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_system_role INTEGER NOT NULL DEFAULT 0,
  UNIQUE(workspace_id, name)
);

INSERT OR IGNORE INTO workspaces (id, name) VALUES ('ws_default', 'Default Workspace');
INSERT OR IGNORE INTO members (id, workspace_id, name, email, role, status, avatar_initials)
VALUES ('member_default', 'ws_default', 'Admin', 'admin@quantara.app', 'Super Admin', 'active', 'AD');

INSERT OR IGNORE INTO roles (id, workspace_id, name, description, is_system_role) VALUES
  ('role_super_admin', 'ws_default', 'Super Admin', 'Accesso completo a tutte le funzionalità', 1),
  ('role_pm', 'ws_default', 'Project Manager', 'Gestione progetti e assegnazione ruoli', 1),
  ('role_engineer', 'ws_default', 'Ingegnere', 'Creazione e modifica SAL e tariffari', 1),
  ('role_accountant', 'ws_default', 'Contabile', 'Viste contabili e report', 1),
  ('role_viewer', 'ws_default', 'Viewer', 'Sola lettura', 1);
