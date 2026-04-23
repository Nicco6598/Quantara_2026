use std::path::PathBuf;

pub fn default_database_name() -> PathBuf {
    PathBuf::from("quantara.sqlite3")
}
