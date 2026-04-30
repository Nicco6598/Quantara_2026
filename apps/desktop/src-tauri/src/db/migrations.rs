pub const CURRENT_SCHEMA_VERSION: i32 = 1;
const INITIAL_SCHEMA: &str = include_str!("../../migrations/0001_initial.sql");

pub fn apply_migrations(connection: &rusqlite::Connection) -> rusqlite::Result<()> {
    connection.execute_batch(INITIAL_SCHEMA)?;
    connection.execute(
        "INSERT OR IGNORE INTO schema_migrations (version) VALUES (?1)",
        [CURRENT_SCHEMA_VERSION],
    )?;

    connection.execute_batch(include_str!("../../migrations/0002_tariff_voices.sql"))?;
    ensure_tariff_voice_labor_percentage(connection)?;
    ensure_contract_safety_cost_column(connection)?;

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

fn ensure_contract_safety_cost_column(connection: &rusqlite::Connection) -> rusqlite::Result<()> {
    let has_column = {
        let mut statement = connection.prepare("PRAGMA table_info(contracts)")?;
        let columns = statement
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<rusqlite::Result<Vec<_>>>()?;

        columns
            .iter()
            .any(|column| column == "safety_costs_not_subject_to_discount_cents")
    };

    if !has_column {
        connection.execute(
            "ALTER TABLE contracts ADD COLUMN safety_costs_not_subject_to_discount_cents INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }

    Ok(())
}
