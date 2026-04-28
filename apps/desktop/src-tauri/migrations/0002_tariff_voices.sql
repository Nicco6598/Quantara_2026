CREATE TABLE IF NOT EXISTS tariff_voices (
  id TEXT PRIMARY KEY,
  tariff_book_id TEXT NOT NULL REFERENCES tariff_books(id),
  official_code TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_of_measure TEXT NOT NULL,
  labor_percentage REAL,
  unit_price_cents INTEGER NOT NULL,
  UNIQUE(tariff_book_id, official_code)
);
