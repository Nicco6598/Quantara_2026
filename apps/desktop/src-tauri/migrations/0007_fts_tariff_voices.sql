CREATE VIRTUAL TABLE IF NOT EXISTS tariff_voices_fts USING fts5(
  official_code,
  description,
  category,
  unit_of_measure,
  content='tariff_voices',
  content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS tariff_voices_ai AFTER INSERT ON tariff_voices BEGIN
  INSERT INTO tariff_voices_fts(rowid, official_code, description, category, unit_of_measure)
  VALUES (new.rowid, new.official_code, new.description, new.category, new.unit_of_measure);
END;

CREATE TRIGGER IF NOT EXISTS tariff_voices_ad AFTER DELETE ON tariff_voices BEGIN
  INSERT INTO tariff_voices_fts(fts_idx, rowid, official_code, description, category, unit_of_measure)
  VALUES ('delete', old.rowid, old.official_code, old.description, old.category, old.unit_of_measure);
END;

CREATE TRIGGER IF NOT EXISTS tariff_voices_au AFTER UPDATE ON tariff_voices BEGIN
  INSERT INTO tariff_voices_fts(fts_idx, rowid, official_code, description, category, unit_of_measure)
  VALUES ('delete', old.rowid, old.official_code, old.description, old.category, old.unit_of_measure);
  INSERT INTO tariff_voices_fts(rowid, official_code, description, category, unit_of_measure)
  VALUES (new.rowid, new.official_code, new.description, new.category, new.unit_of_measure);
END;

INSERT INTO tariff_voices_fts(rowid, official_code, description, category, unit_of_measure)
SELECT rowid, official_code, description, category, unit_of_measure FROM tariff_voices;
