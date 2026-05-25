use sha2::{Digest, Sha256};

pub const CURRENT_SCHEMA_VERSION: i32 = 11;

struct Migration {
    version: i32,
    name: &'static str,
    sql: &'static str,
}

const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "initial_schema",
        sql: include_str!("../../migrations/0001_initial.sql"),
    },
    Migration {
        version: 2,
        name: "tariff_voices",
        sql: include_str!("../../migrations/0002_tariff_voices.sql"),
    },
    Migration {
        version: 3,
        name: "materials",
        sql: include_str!("../../migrations/0003_materials.sql"),
    },
    Migration {
        version: 4,
        name: "indexes",
        sql: include_str!("../../migrations/0004_indexes.sql"),
    },
    Migration {
        version: 5,
        name: "sal_workflow",
        sql: include_str!("../../migrations/0005_sal_workflow.sql"),
    },
    Migration {
        version: 6,
        name: "audit_events",
        sql: include_str!("../../migrations/0006_audit_events.sql"),
    },
    Migration {
        version: 7,
        name: "fts_tariff_voices",
        sql: include_str!("../../migrations/0007_fts_tariff_voices.sql"),
    },
    Migration {
        version: 8,
        name: "sal_normalization",
        sql: include_str!("../../migrations/0008_sal_normalization.sql"),
    },
    Migration {
        version: 10,
        name: "sal_versioning",
        sql: include_str!("../../migrations/0010_sal_versioning.sql"),
    },
    Migration {
        version: 11,
        name: "users_rbac",
        sql: include_str!("../../migrations/0011_users_rbac.sql"),
    },
];

fn compute_migration_checksum(sql: &str) -> String {
    let normalized = sql.replace("\r\n", "\n");
    let mut hasher = Sha256::new();
    hasher.update(normalized.as_bytes());
    hex::encode(hasher.finalize())
}

fn ensure_migration_extended_columns(connection: &rusqlite::Connection) -> rusqlite::Result<()> {
    connection.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL DEFAULT '',
            checksum TEXT NOT NULL DEFAULT '',
            applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );",
    )?;

    let columns = {
        let mut stmt = connection.prepare("PRAGMA table_info(schema_migrations)")?;
        stmt.query_map([], |row| row.get::<_, String>(1))?
            .collect::<rusqlite::Result<Vec<_>>>()?
    };

    if !columns.iter().any(|c| c == "name") {
        connection.execute(
            "ALTER TABLE schema_migrations ADD COLUMN name TEXT NOT NULL DEFAULT ''",
            [],
        )?;
    }
    if !columns.iter().any(|c| c == "checksum") {
        connection.execute(
            "ALTER TABLE schema_migrations ADD COLUMN checksum TEXT NOT NULL DEFAULT ''",
            [],
        )?;
    }
    Ok(())
}

pub fn apply_migrations(connection: &rusqlite::Connection) -> rusqlite::Result<()> {
    ensure_migration_extended_columns(connection)?;

    for migration in MIGRATIONS {
        let is_applied: bool = connection
            .query_row(
                "SELECT COUNT(*) > 0 FROM schema_migrations WHERE version = ?1",
                [migration.version],
                |row| row.get(0),
            )
            .unwrap_or(false);

        let checksum = compute_migration_checksum(migration.sql);

        if is_applied {
            let stored_checksum: Option<String> = connection
                .query_row(
                    "SELECT checksum FROM schema_migrations WHERE version = ?1",
                    [migration.version],
                    |row| row.get(0),
                )
                .ok();

            if let Some(stored) = stored_checksum {
                if !stored.is_empty() && stored != checksum {
                    panic!(
                        "Migration {} ({}) checksum mismatch! SQL has been modified since it was applied.\n\
                         Stored: {}\nCurrent: {}\n\
                         This is a safety measure to prevent data corruption.",
                        migration.version, migration.name, stored, checksum
                    );
                }
                if stored.is_empty() {
                    connection.execute(
                        "UPDATE schema_migrations SET checksum = ?1, name = ?2 WHERE version = ?3",
                        rusqlite::params![checksum, migration.name, migration.version],
                    )?;
                }
            }
            continue;
        }

        connection.execute_batch(migration.sql)?;

        connection.execute(
            "INSERT OR REPLACE INTO schema_migrations (version, name, checksum, applied_at)
             VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)",
            rusqlite::params![migration.version, migration.name, checksum],
        )?;
    }

    ensure_tariff_voice_labor_percentage(connection)?;
    ensure_tariff_voice_sal_rule_fields(connection)?;
    ensure_contract_migration(connection)?;
    ensure_contractors_migration(connection)?;
    ensure_fts_triggers(connection)?;
    migrate_sal_json_to_v2(connection)?;

    Ok(())
}

fn ensure_tariff_voice_sal_rule_fields(connection: &rusqlite::Connection) -> rusqlite::Result<()> {
    let columns = {
        let mut statement = connection.prepare("PRAGMA table_info(tariff_voices)")?;
        statement
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<rusqlite::Result<Vec<_>>>()?
    };

    if !columns
        .iter()
        .any(|column| column == "linked_maggiorazioni")
    {
        connection.execute(
            "ALTER TABLE tariff_voices ADD COLUMN linked_maggiorazioni TEXT",
            [],
        )?;
    }

    if !columns.iter().any(|column| column == "applicability_rules") {
        connection.execute(
            "ALTER TABLE tariff_voices ADD COLUMN applicability_rules TEXT",
            [],
        )?;
    }

    Ok(())
}

fn migrate_sal_json_to_v2(connection: &rusqlite::Connection) -> rusqlite::Result<()> {
    let source_count: i64 = connection
        .query_row("SELECT COUNT(*) FROM sal_workflow_documents", [], |row| {
            row.get(0)
        })
        .unwrap_or(0);

    if source_count == 0 {
        return Ok(());
    }

    let migrated_count: i64 = connection
        .query_row("SELECT COUNT(*) FROM sal_documents_v2", [], |row| {
            row.get(0)
        })
        .unwrap_or(0);

    if migrated_count >= source_count {
        return Ok(());
    }

    let mut stmt = connection.prepare("SELECT id, project_id, data FROM sal_workflow_documents")?;

    let rows: Vec<(String, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .filter_map(|r| r.ok())
        .collect();

    for (old_id, project_id, json_str) in rows {
        let value: serde_json::Value = match serde_json::from_str(&json_str) {
            Ok(v) => v,
            Err(e) => {
                eprintln!(
                    "Warning: skipping SAL {} due to JSON parse error: {}",
                    old_id, e
                );
                continue;
            }
        };

        let id = value["id"].as_str().unwrap_or(&old_id);
        let title = value["title"].as_str().unwrap_or("");
        let status = value["status"].as_str().unwrap_or("draft");
        let date = value["date"].as_str().unwrap_or("");
        let description = value["description"].as_str().unwrap_or("");
        let closed_at = value["closedAt"].as_str();
        let notes = value["notes"].as_str().unwrap_or("");
        let total_cents = (value["total"].as_f64().unwrap_or(0.0) * 100.0).round() as i64;

        let lines = value["lines"].as_array();
        let lines_count = lines.map(|a| a.len() as i64).unwrap_or(0);
        let measurement_rows_count = lines
            .map(|arr| {
                arr.iter()
                    .map(|l| {
                        l["measurementRows"]
                            .as_array()
                            .map(|m| m.len())
                            .unwrap_or(0)
                    })
                    .sum::<usize>()
            })
            .unwrap_or(0) as i64;

        connection.execute(
            "INSERT OR IGNORE INTO sal_documents_v2 \
             (id, project_id, title, status, date, description, closed_at, notes, \
              total_cents, lines_count, measurement_rows_count, source_snapshot) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            rusqlite::params![
                id,
                project_id,
                title,
                status,
                date,
                description,
                closed_at,
                notes,
                total_cents,
                lines_count,
                measurement_rows_count,
                json_str
            ],
        )?;

        let voices = value["voices"].as_array();

        if let Some(lines_arr) = lines {
            for (li, line) in lines_arr.iter().enumerate() {
                let line_id = line["id"].as_str().unwrap_or("");
                let voice_id = line["voiceId"].as_str().unwrap_or("");
                let quantity = line["quantity"].as_f64().unwrap_or(0.0);
                let surcharge_kind = line["surcharge"]["kind"].as_str().unwrap_or("none");
                let surcharge_percent = line["surcharge"]["percent"].as_f64().unwrap_or(0.0);

                let voice =
                    voices.and_then(|va| va.iter().find(|v| v["id"].as_str() == Some(voice_id)));

                let (code, vdesc, cat, unit, uprice, labor, pyear) = voice.map_or_else(
                    || Default::default(),
                    |v| {
                        (
                            v["code"].as_str().unwrap_or("").to_string(),
                            v["description"].as_str().unwrap_or("").to_string(),
                            v["category"].as_str().unwrap_or("").to_string(),
                            v["unit"].as_str().unwrap_or("").to_string(),
                            (v["unitPrice"].as_f64().unwrap_or(0.0) * 100.0).round() as i64,
                            v["laborPercentage"].as_f64().unwrap_or(0.0),
                            v["projectYear"].as_i64().unwrap_or(0),
                        )
                    },
                );

                let gross_cents = (quantity * uprice as f64).round() as i64;
                let discount_cents =
                    (gross_cents as f64 * surcharge_percent / 100.0).round() as i64;
                let total_cents_line = gross_cents - discount_cents;

                connection.execute(
                    "INSERT OR IGNORE INTO sal_lines \
                     (id, sal_id, voice_id, voice_code, voice_description, voice_category, \
                      voice_unit, voice_unit_price_cents, voice_labor_percentage, voice_project_year, \
                      quantity, surcharge_kind, surcharge_percent, \
                      gross_amount_cents, discount_amount_cents, total_amount_cents, order_index) \
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, \
                             ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
                    rusqlite::params![
                        line_id,
                        id,
                        voice_id,
                        code,
                        vdesc,
                        cat,
                        unit,
                        uprice,
                        labor,
                        pyear,
                        quantity,
                        surcharge_kind,
                        surcharge_percent,
                        gross_cents,
                        discount_cents,
                        total_cents_line,
                        li as i64
                    ],
                )?;

                if let Some(rows) = line["measurementRows"].as_array() {
                    for (ri, mr) in rows.iter().enumerate() {
                        let mr_date = mr["date"].as_str();
                        connection.execute(
                            "INSERT OR IGNORE INTO sal_measurement_rows \
                             (id, sal_line_id, date, station, section, description, \
                              factor1, factor2, factor3, partial_quantity, unit, notes, order_index) \
                             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                            rusqlite::params![
                                mr["id"].as_str().unwrap_or(""),
                                line_id,
                                mr_date,
                                mr["station"].as_str().unwrap_or(""),
                                mr["section"].as_str().unwrap_or(""),
                                mr["description"].as_str().unwrap_or(""),
                                mr["factor1"].as_f64().unwrap_or(0.0),
                                mr["factor2"].as_f64().unwrap_or(1.0),
                                mr["factor3"].as_f64().unwrap_or(1.0),
                                mr["partialQuantity"].as_f64().unwrap_or(0.0),
                                mr["unit"].as_str().unwrap_or(""),
                                mr["notes"].as_str().unwrap_or(""),
                                ri as i64
                            ],
                        )?;
                    }
                }
            }
        }

        if let Some(materials) = value["materialUsage"].as_array() {
            for (mi, mat) in materials.iter().enumerate() {
                let mu_id = format!("mu_{}_{}", id, mi);
                connection.execute(
                    "INSERT OR IGNORE INTO sal_material_usage \
                     (id, sal_id, material_id, material_code, material_description, material_unit, quantity, order_index) \
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                    rusqlite::params![
                        mu_id,
                        id,
                        mat["materialId"].as_str().unwrap_or(""),
                        mat["code"].as_str().unwrap_or(""),
                        mat["description"].as_str().unwrap_or(""),
                        mat["unit"].as_str().unwrap_or(""),
                        mat["quantity"].as_f64().unwrap_or(0.0),
                        mi as i64
                    ],
                )?;
            }
        }
    }

    Ok(())
}

fn ensure_contractors_migration(connection: &rusqlite::Connection) -> rusqlite::Result<()> {
    connection.execute_batch(
        "CREATE TABLE IF NOT EXISTS contractors (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );",
    )?;

    let columns = {
        let mut statement = connection.prepare("PRAGMA table_info(contracts)")?;
        statement
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<rusqlite::Result<Vec<_>>>()?
    };

    if !columns.iter().any(|column| column == "contractor_id") {
        connection.execute(
            "ALTER TABLE contracts ADD COLUMN contractor_id TEXT REFERENCES contractors(id)",
            [],
        )?;
    }

    Ok(())
}

fn ensure_fts_triggers(connection: &rusqlite::Connection) -> rusqlite::Result<()> {
    // Migration 0007 originally used `content=` + `fts_idx` approach which is not supported
    // by all SQLite versions. Replace the triggers with standalone FTS5 DELETE syntax.
    connection.execute_batch(
        "DROP TRIGGER IF EXISTS tariff_voices_ad;
         DROP TRIGGER IF EXISTS tariff_voices_au;
         CREATE TRIGGER IF NOT EXISTS tariff_voices_ad AFTER DELETE ON tariff_voices BEGIN
           DELETE FROM tariff_voices_fts WHERE rowid = old.rowid;
         END;
         CREATE TRIGGER IF NOT EXISTS tariff_voices_au AFTER UPDATE ON tariff_voices BEGIN
           DELETE FROM tariff_voices_fts WHERE rowid = old.rowid;
           INSERT INTO tariff_voices_fts(rowid, official_code, description, category, unit_of_measure)
           VALUES (new.rowid, new.official_code, new.description, new.category, new.unit_of_measure);
         END;",
    )?;
    Ok(())
}

fn ensure_tariff_voice_labor_percentage(connection: &rusqlite::Connection) -> rusqlite::Result<()> {
    let has_column = {
        let mut statement = connection.prepare("PRAGMA table_info(tariff_voices)")?;
        let columns = statement
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<rusqlite::Result<Vec<_>>>()?;

        columns.iter().any(|column| column == "labor_percentage")
    };

    if !has_column {
        connection.execute(
            "ALTER TABLE tariff_voices ADD COLUMN labor_percentage REAL",
            [],
        )?;
    }

    Ok(())
}

fn ensure_contract_migration(connection: &rusqlite::Connection) -> rusqlite::Result<()> {
    let columns = {
        let mut statement = connection.prepare("PRAGMA table_info(contracts)")?;
        let col_names: Vec<String> = statement
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        col_names
    };

    if columns
        .iter()
        .any(|c| c == "safety_costs_not_subject_to_discount_cents")
    {
        connection.execute_batch(
            "ALTER TABLE contracts DROP COLUMN safety_costs_not_subject_to_discount_cents",
        )?;
    }

    if !columns.iter().any(|c| c == "tender_discount_percent") {
        connection.execute(
            "ALTER TABLE contracts ADD COLUMN tender_discount_percent REAL NOT NULL DEFAULT 0",
            [],
        )?;
    }

    if !columns.iter().any(|c| c == "os_excluded_amount_cents") {
        connection.execute(
            "ALTER TABLE contracts ADD COLUMN os_excluded_amount_cents INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_in_memory_db() -> Connection {
        let conn = Connection::open_in_memory().expect("Failed to create in-memory DB");
        conn.execute_batch("PRAGMA journal_mode=WAL;").ok();
        conn.execute_batch("PRAGMA busy_timeout=5000;").ok();
        conn
    }

    #[test]
    fn test_apply_migrations_creates_tables() {
        let conn = setup_in_memory_db();
        apply_migrations(&conn).expect("migrations should apply");

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM schema_migrations", [], |row| {
                row.get(0)
            })
            .expect("schema_migrations should exist");
        assert!(count > 0, "at least some migrations should be recorded");

        let tables: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            .expect("prepare")
            .query_map([], |row| row.get(0))
            .expect("query")
            .filter_map(|r| r.ok())
            .collect();

        assert!(tables.contains(&"schema_migrations".to_string()));
        assert!(tables.contains(&"contracts".to_string()));
        assert!(tables.contains(&"tariff_books".to_string()));
        assert!(tables.contains(&"tariff_voices".to_string()));
        assert!(tables.contains(&"materials".to_string()));
        assert!(tables.contains(&"sal_workflow_projects".to_string()));
        assert!(tables.contains(&"sal_workflow_documents".to_string()));
        assert!(tables.contains(&"audit_events".to_string()));
        assert!(tables.contains(&"sal_documents_v2".to_string()));
        assert!(tables.contains(&"sal_lines".to_string()));
        assert!(tables.contains(&"sal_measurement_rows".to_string()));
        assert!(tables.contains(&"sal_material_usage".to_string()));
        assert!(tables.contains(&"tariff_voices_fts".to_string()));
    }

    #[test]
    fn test_apply_migrations_idempotent() {
        let conn = setup_in_memory_db();
        apply_migrations(&conn).expect("first application should succeed");
        apply_migrations(&conn).expect("second application should succeed (idempotent)");
    }

    #[test]
    fn test_schema_migrations_has_checksum_column() {
        let conn = setup_in_memory_db();
        apply_migrations(&conn).expect("migrations should apply");

        let has_checksum: bool = {
            let mut stmt = conn
                .prepare("PRAGMA table_info(schema_migrations)")
                .unwrap();
            let columns: Vec<String> = stmt
                .query_map([], |row| row.get(1))
                .unwrap()
                .filter_map(|r| r.ok())
                .collect();
            columns.contains(&"checksum".to_string())
        };
        assert!(
            has_checksum,
            "schema_migrations should have checksum column"
        );
    }

    #[test]
    fn test_migration_checksums_are_stored() {
        let conn = setup_in_memory_db();
        apply_migrations(&conn).expect("migrations should apply");

        let checksums: Vec<(i32, String)> = conn
            .prepare("SELECT version, checksum FROM schema_migrations ORDER BY version")
            .expect("prepare")
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .expect("query")
            .filter_map(|r| r.ok())
            .collect();

        assert!(!checksums.is_empty(), "checksums should be stored");
        for (version, checksum) in &checksums {
            assert!(
                !checksum.is_empty(),
                "checksum for migration {version} should not be empty"
            );
        }
    }
}
