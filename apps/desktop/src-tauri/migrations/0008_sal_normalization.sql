CREATE TABLE IF NOT EXISTS sal_documents_v2 (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  date TEXT NOT NULL,
  closed_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  total_cents INTEGER NOT NULL DEFAULT 0,
  gross_amount_cents INTEGER NOT NULL DEFAULT 0,
  discount_amount_cents INTEGER NOT NULL DEFAULT 0,
  lines_count INTEGER NOT NULL DEFAULT 0,
  measurement_rows_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 1,
  source_snapshot TEXT
);

CREATE INDEX IF NOT EXISTS idx_sal_documents_v2_project_id ON sal_documents_v2(project_id);
CREATE INDEX IF NOT EXISTS idx_sal_documents_v2_status ON sal_documents_v2(status);
CREATE INDEX IF NOT EXISTS idx_sal_documents_v2_date ON sal_documents_v2(date);
CREATE INDEX IF NOT EXISTS idx_sal_documents_v2_closed_at ON sal_documents_v2(closed_at);

CREATE TABLE IF NOT EXISTS sal_lines (
  id TEXT PRIMARY KEY,
  sal_id TEXT NOT NULL REFERENCES sal_documents_v2(id) ON DELETE CASCADE,
  voice_id TEXT NOT NULL,
  voice_code TEXT NOT NULL DEFAULT '',
  voice_description TEXT NOT NULL DEFAULT '',
  voice_category TEXT NOT NULL DEFAULT '',
  voice_unit TEXT NOT NULL DEFAULT '',
  voice_unit_price_cents INTEGER NOT NULL DEFAULT 0,
  voice_labor_percentage REAL NOT NULL DEFAULT 0,
  voice_project_year INTEGER NOT NULL DEFAULT 0,
  quantity REAL NOT NULL DEFAULT 0,
  surcharge_kind TEXT NOT NULL DEFAULT 'none',
  surcharge_percent REAL NOT NULL DEFAULT 0,
  gross_amount_cents INTEGER NOT NULL DEFAULT 0,
  discount_amount_cents INTEGER NOT NULL DEFAULT 0,
  total_amount_cents INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sal_lines_sal_id ON sal_lines(sal_id);
CREATE INDEX IF NOT EXISTS idx_sal_lines_voice_id ON sal_lines(voice_id);

CREATE TABLE IF NOT EXISTS sal_measurement_rows (
  id TEXT PRIMARY KEY,
  sal_line_id TEXT NOT NULL REFERENCES sal_lines(id) ON DELETE CASCADE,
  date TEXT,
  station TEXT NOT NULL DEFAULT '',
  section TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  factor1 REAL NOT NULL DEFAULT 0,
  factor2 REAL NOT NULL DEFAULT 1,
  factor3 REAL NOT NULL DEFAULT 1,
  partial_quantity REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sal_measurement_rows_line_id ON sal_measurement_rows(sal_line_id);
CREATE INDEX IF NOT EXISTS idx_sal_measurement_rows_order ON sal_measurement_rows(sal_line_id, order_index);

CREATE TABLE IF NOT EXISTS sal_material_usage (
  id TEXT PRIMARY KEY,
  sal_id TEXT NOT NULL REFERENCES sal_documents_v2(id) ON DELETE CASCADE,
  material_id TEXT NOT NULL,
  material_code TEXT NOT NULL DEFAULT '',
  material_description TEXT NOT NULL DEFAULT '',
  material_unit TEXT NOT NULL DEFAULT '',
  quantity REAL NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sal_material_usage_sal_id ON sal_material_usage(sal_id);
