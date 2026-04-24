pub const CURRENT_SCHEMA_VERSION: i32 = 1;
const INITIAL_SCHEMA: &str = include_str!("../../migrations/0001_initial.sql");

pub fn apply_migrations(connection: &rusqlite::Connection) -> rusqlite::Result<()> {
    connection.execute_batch(INITIAL_SCHEMA)?;
    connection.execute(
        "INSERT OR IGNORE INTO schema_migrations (version) VALUES (?1)",
        [CURRENT_SCHEMA_VERSION],
    )?;

    connection.execute_batch(include_str!("../../migrations/0002_tariff_voices.sql"))?;

    Ok(())
}
