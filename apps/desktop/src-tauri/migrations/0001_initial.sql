CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  application_contract_code TEXT NOT NULL,
  framework_agreement_code TEXT NOT NULL,
  contractor_id TEXT REFERENCES contractors(id),
  contractual_amount_cents INTEGER NOT NULL,
  tender_discount_percent REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contractors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tariff_books (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tariff_voices (
  id TEXT PRIMARY KEY,
  tariff_book_id TEXT NOT NULL REFERENCES tariff_books(id),
  official_code TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_of_measure TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  UNIQUE(tariff_book_id, official_code)
);

CREATE TABLE IF NOT EXISTS tariff_priorities (
  contract_id TEXT NOT NULL REFERENCES contracts(id),
  tariff_book_id TEXT NOT NULL REFERENCES tariff_books(id),
  priority INTEGER NOT NULL,
  reason TEXT NOT NULL,
  PRIMARY KEY (contract_id, tariff_book_id)
);

CREATE TABLE IF NOT EXISTS sal_documents (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contracts(id),
  sal_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  tender_adjustment_percent REAL NOT NULL DEFAULT 0,
  subcontract_adjustment_percent REAL NOT NULL DEFAULT 0
);
