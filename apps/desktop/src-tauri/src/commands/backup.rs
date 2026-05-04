use std::io::{Read, Write};

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::infrastructure::local_storage::{get_app_data_dir, get_database_path};

#[derive(Debug, Serialize, Deserialize)]
struct BackupMetadata {
    app_version: String,
    created_at: String,
    schema_version: i32,
    database_size_bytes: u64,
    localstorage_size_bytes: u64,
}

fn to_error(msg: impl std::fmt::Display) -> String {
    format!("backup error: {msg}")
}

/// Backup format in .qbk file:
/// [4-byte metadata JSON length (u32 LE)]
/// [metadata JSON]
/// [4-byte localStorage JSON length (u32 LE)]
/// [localStorage JSON (all Zustand stores)]
/// [SQLite database bytes]

#[tauri::command]
pub fn backup_database(
    app: AppHandle,
    destination_path: String,
    localstorage_json: String,
) -> Result<String, String> {
    let db_path = get_database_path(&app).map_err(to_error)?;
    let dest = std::path::PathBuf::from(&destination_path);

    // Read the database file
    let db_bytes = std::fs::read(&db_path).map_err(to_error)?;
    let ls_bytes = localstorage_json.as_bytes();

    // Build metadata
    let metadata = BackupMetadata {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        created_at: chrono_now_iso(),
        schema_version: crate::db::migrations::CURRENT_SCHEMA_VERSION,
        database_size_bytes: db_bytes.len() as u64,
        localstorage_size_bytes: ls_bytes.len() as u64,
    };
    let metadata_json = serde_json::to_string(&metadata).map_err(to_error)?;
    let meta_len = metadata_json.len() as u32;
    let ls_len = ls_bytes.len() as u32;

    // Write: [metadata_len][metadata][ls_len][localStorage JSON][DB bytes]
    let mut output = std::fs::File::create(&dest).map_err(to_error)?;
    output
        .write_all(&meta_len.to_le_bytes())
        .map_err(to_error)?;
    output
        .write_all(metadata_json.as_bytes())
        .map_err(to_error)?;
    output.write_all(&ls_len.to_le_bytes()).map_err(to_error)?;
    output.write_all(ls_bytes).map_err(to_error)?;
    output.write_all(&db_bytes).map_err(to_error)?;

    Ok(format!(
        "backup creato: {} kB DB + {} kB dati app",
        db_bytes.len() / 1024,
        ls_bytes.len() / 1024,
    ))
}

/// Restore returns the localStorage JSON so the frontend can write it back.
/// The database file is written directly to disk by Rust.
#[tauri::command]
pub fn restore_database(app: AppHandle, source_path: String) -> Result<String, String> {
    let db_path = get_database_path(&app).map_err(to_error)?;
    let source = std::path::PathBuf::from(&source_path);

    let mut file =
        std::fs::File::open(&source).map_err(|e| format!("impossibile aprire file: {e}"))?;

    // Read metadata length
    let mut len_buf = [0u8; 4];
    file.read_exact(&mut len_buf)
        .map_err(|e| format!("formato backup non valido: {e}"))?;
    let meta_len = u32::from_le_bytes(len_buf) as usize;

    // Read metadata JSON
    let mut meta_buf = vec![0u8; meta_len];
    file.read_exact(&mut meta_buf)
        .map_err(|e| format!("formato backup non valido: {e}"))?;
    let _metadata: BackupMetadata =
        serde_json::from_slice(&meta_buf).map_err(|e| format!("metadata non validi: {e}"))?;

    // Read localStorage length
    file.read_exact(&mut len_buf)
        .map_err(|e| format!("formato backup non valido: {e}"))?;
    let ls_len = u32::from_le_bytes(len_buf) as usize;

    // Read localStorage JSON
    let mut ls_buf = vec![0u8; ls_len];
    file.read_exact(&mut ls_buf)
        .map_err(|e| format!("formato backup non valido: {e}"))?;
    let localstorage_json =
        String::from_utf8(ls_buf).map_err(|e| format!("localstorage non valido: {e}"))?;

    // Read remaining DB bytes
    let mut db_bytes = Vec::new();
    file.read_to_end(&mut db_bytes)
        .map_err(|e| format!("errore lettura database: {e}"))?;

    if db_bytes.is_empty() {
        return Err("il file di backup non contiene dati del database".to_string());
    }

    // Write new database file
    std::fs::write(&db_path, &db_bytes).map_err(to_error)?;

    // Return localStorage JSON so the frontend can restore it
    Ok(localstorage_json)
}

fn chrono_now_iso() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    let days = secs / 86400;
    let time_secs = secs % 86400;
    let hours = time_secs / 3600;
    let minutes = (time_secs % 3600) / 60;
    let seconds = time_secs % 60;

    let mut y = 1970i64;
    let mut remaining = days as i64;
    loop {
        let days_in_year = if is_leap_year(y) { 366 } else { 365 };
        if remaining < days_in_year {
            break;
        }
        remaining -= days_in_year;
        y += 1;
    }
    let month_days = if is_leap_year(y) {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    let mut m = 1u32;
    for &md in month_days.iter() {
        if remaining < md as i64 {
            break;
        }
        remaining -= md as i64;
        m += 1;
    }
    let d = (remaining + 1) as u32;

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        y, m, d, hours, minutes, seconds
    )
}

fn is_leap_year(year: i64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

#[tauri::command]
pub fn get_database_info(app: AppHandle) -> Result<DatabaseInfo, String> {
    let db_path = get_database_path(&app).map_err(to_error)?;
    let data_dir = get_app_data_dir(&app).map_err(to_error)?;

    let size = std::fs::metadata(&db_path)
        .ok()
        .map(|m| m.len())
        .unwrap_or(0);

    Ok(DatabaseInfo {
        data_directory: data_dir.to_string_lossy().to_string(),
        database_path: db_path.to_string_lossy().to_string(),
        exists: db_path.exists(),
        size_bytes: size,
    })
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseInfo {
    pub data_directory: String,
    pub database_path: String,
    pub exists: bool,
    pub size_bytes: u64,
}
