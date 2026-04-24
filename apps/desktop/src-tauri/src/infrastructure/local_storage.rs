use std::path::PathBuf;

use rusqlite::Connection;
use tauri::{AppHandle, Manager};

use crate::models::app_error::AppError;

pub fn default_database_name() -> PathBuf {
    PathBuf::from("quantara.sqlite3")
}

pub fn open_app_database(app: &AppHandle) -> Result<Connection, AppError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| AppError::Database(error.to_string()))?;

    std::fs::create_dir_all(&app_data_dir)
        .map_err(|error| AppError::Database(error.to_string()))?;

    let database_path = app_data_dir.join(default_database_name());
    Connection::open(database_path).map_err(|error| AppError::Database(error.to_string()))
}
