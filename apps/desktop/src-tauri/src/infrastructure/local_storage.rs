use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::Connection;
use tauri::{AppHandle, Manager};

use crate::db::migrations;
use crate::models::app_error::AppError;

pub struct DbConnection {
    pub conn: Mutex<Connection>,
}

impl DbConnection {
    pub fn open(app: &AppHandle) -> Result<Self, AppError> {
        let database_path = get_database_path(app)?;
        let conn = Connection::open(&database_path)
            .map_err(|e| AppError::Database(e.to_string()))?;
        migrations::apply_migrations(&conn)?;
        Ok(Self { conn: Mutex::new(conn) })
    }
}

pub fn with_db<F, T>(state: &DbConnection, f: F) -> Result<T, String>
where
    F: FnOnce(&Connection) -> Result<T, AppError>,
{
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    f(&conn).map_err(|e| e.to_string())
}

pub fn with_db_mut<F, T>(state: &DbConnection, f: F) -> Result<T, String>
where
    F: FnOnce(&mut Connection) -> Result<T, AppError>,
{
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    f(&mut conn).map_err(|e| e.to_string())
}

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


