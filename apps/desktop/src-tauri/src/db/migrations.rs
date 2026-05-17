pub const CURRENT_SCHEMA_VERSION: i32 = 5;
const INITIAL_SCHEMA: &str = include_str!("../../migrations/0001_initial.sql");

pub fn apply_migrations(connection: &rusqlite::Connection) -> rusqlite::Result<()> {
    connection.execute_batch(INITIAL_SCHEMA)?;
    connection.execute(
        "INSERT OR IGNORE INTO schema_migrations (version) VALUES (?1)",
        [CURRENT_SCHEMA_VERSION],
    )?;

    connection.execute_batch(include_str!("../../migrations/0002_tariff_voices.sql"))?;
    ensure_tariff_voice_labor_percentage(connection)?;
    ensure_contract_migration(connection)?;
    ensure_contractors_migration(connection)?;

    connection.execute_batch(include_str!("../../migrations/0003_materials.sql"))?;
    connection.execute_batch(include_str!("../../migrations/0004_indexes.sql"))?;
    connection.execute_batch(include_str!("../../migrations/0005_sal_workflow.sql"))?;

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

    // Remove legacy safety_costs column if present
    if columns
        .iter()
        .any(|c| c == "safety_costs_not_subject_to_discount_cents")
    {
        connection.execute_batch(
            "ALTER TABLE contracts DROP COLUMN safety_costs_not_subject_to_discount_cents",
        )?;
    }

    // Add tender_discount_percent if missing
    if !columns.iter().any(|c| c == "tender_discount_percent") {
        connection.execute(
            "ALTER TABLE contracts ADD COLUMN tender_discount_percent REAL NOT NULL DEFAULT 0",
            [],
        )?;
    }

    // Add os_excluded_amount_cents if missing
    if !columns.iter().any(|c| c == "os_excluded_amount_cents") {
        connection.execute(
            "ALTER TABLE contracts ADD COLUMN os_excluded_amount_cents INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }

    Ok(())
}
