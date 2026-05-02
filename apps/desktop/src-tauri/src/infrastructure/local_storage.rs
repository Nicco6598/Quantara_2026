use std::path::PathBuf;

use rusqlite::Connection;
use tauri::{AppHandle, Manager};

use crate::models::app_error::AppError;

pub fn default_database_name() -> PathBuf {
    PathBuf::from("quantara.sqlite3")
}

pub fn get_app_data_dir(app: &AppHandle) -> Result<PathBuf, AppError> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Database(e.to_string()))?;
    std::fs::create_dir_all(&path)?;
    Ok(path)
}

pub fn get_database_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    let dir = get_app_data_dir(app)?;
    Ok(dir.join(default_database_name()))
}

pub fn open_app_database(app: &AppHandle) -> Result<Connection, AppError> {
    let database_path = get_database_path(app)?;
    Connection::open(database_path).map_err(|e| AppError::Database(e.to_string()))
}
