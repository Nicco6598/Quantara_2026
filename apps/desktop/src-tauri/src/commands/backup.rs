use std::io::{Read, Write};
use std::path::{Path, PathBuf};

use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager};

use crate::infrastructure::local_storage::{
    get_app_data_dir, get_database_path, reopen_connection, DbConnection,
};

fn default_format_version() -> u32 {
    1
}

#[derive(Debug, Serialize, Deserialize)]
struct EncryptionInfo {
    algorithm: String,
    salt: String,
    key_check: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct BackupMetadata {
    #[serde(default = "default_format_version")]
    format_version: u32,
    app_version: String,
    created_at: String,
    schema_version: i32,
    database_size_bytes: u64,
    localstorage_size_bytes: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    database_sha256: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    localstorage_sha256: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    encryption: Option<EncryptionInfo>,
}

fn to_error(msg: impl std::fmt::Display) -> String {
    format!("backup error: {msg}")
}

fn sha256_hex(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher
        .finalize()
        .iter()
        .map(|b| format!("{:02x}", b))
        .collect()
}

/// Open the database, force a full WAL checkpoint, then export a consistent
/// snapshot via VACUUM INTO.
fn create_consistent_snapshot(db_path: &Path, temp_dir: &Path) -> Result<PathBuf, String> {
    let conn =
        Connection::open(db_path).map_err(|e| format!("Failed to open DB: {}", e))?;

    conn.execute_batch("PRAGMA wal_checkpoint(FULL);")
        .map_err(|e| format!("WAL checkpoint failed: {}", e))?;

    let temp_path = temp_dir.join("quantara_snapshot.sqlite3");
    conn.execute(
        "VACUUM INTO ?1",
        [temp_path.to_string_lossy().as_ref()],
    )
    .map_err(|e| format!("VACUUM INTO failed: {}", e))?;

    Ok(temp_path)
}

fn create_temp_dir() -> Result<PathBuf, String> {
    let mut temp = std::env::temp_dir();
    let suffix: u64 = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos() as u64;
    temp.push(format!("quantara_backup_{}", suffix));
    std::fs::create_dir_all(&temp)
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;
    Ok(temp)
}

/// Backup format in .qbk file (v2):
/// [4-byte metadata JSON length (u32 LE)]
/// [metadata JSON  (format_version=2, checksums present)]
/// [4-byte localStorage JSON length (u32 LE)]
/// [localStorage JSON (all Zustand stores)]
/// [SQLite database bytes]
///
/// v1 (legacy) format: same structure but metadata lacks format_version
/// and checksum fields.
#[tauri::command]
pub fn backup_database(
    app: AppHandle,
    destination_path: String,
    localstorage_json: String,
) -> Result<String, String> {
    let db_path = get_database_path(&app).map_err(to_error)?;
    let dest = PathBuf::from(&destination_path);
    let ls_bytes = localstorage_json.as_bytes();

    let temp_dir = create_temp_dir()?;

    let snapshot_path = create_consistent_snapshot(&db_path, &temp_dir)?;

    let db_bytes = std::fs::read(&snapshot_path).map_err(to_error)?;

    let db_sha256 = sha256_hex(&db_bytes);
    let ls_sha256 = sha256_hex(ls_bytes);

    let metadata = BackupMetadata {
        format_version: 2,
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        created_at: chrono_now_iso(),
        schema_version: crate::db::migrations::CURRENT_SCHEMA_VERSION,
        database_size_bytes: db_bytes.len() as u64,
        localstorage_size_bytes: ls_bytes.len() as u64,
        database_sha256: Some(db_sha256),
        localstorage_sha256: Some(ls_sha256),
        encryption: None,
    };
    let metadata_json = serde_json::to_string(&metadata).map_err(to_error)?;
    let meta_len = metadata_json.len() as u32;
    let ls_len = ls_bytes.len() as u32;

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

    let _ = std::fs::remove_file(&snapshot_path);
    let _ = std::fs::remove_dir(&temp_dir);

    Ok(format!(
        "backup creato: {} kB DB + {} kB dati app",
        db_bytes.len() / 1024,
        ls_bytes.len() / 1024,
    ))
}

/// Restore returns the localStorage JSON so the frontend can write it back.
/// The database file is written directly to disk by Rust.
/// Supports both v1 (legacy, no checksums) and v2 (with SHA-256 verification).
#[tauri::command]
pub fn restore_database(app: AppHandle, source_path: String) -> Result<String, String> {
    let _db_path = get_database_path(&app).map_err(to_error)?;
    let source = PathBuf::from(&source_path);

    let mut file =
        std::fs::File::open(&source).map_err(|e| format!("impossibile aprire file: {e}"))?;

    let mut len_buf = [0u8; 4];
    file.read_exact(&mut len_buf)
        .map_err(|e| format!("formato backup non valido: {e}"))?;
    let meta_len = u32::from_le_bytes(len_buf) as usize;

    let mut meta_buf = vec![0u8; meta_len];
    file.read_exact(&mut meta_buf)
        .map_err(|e| format!("formato backup non valido: {e}"))?;
    let metadata: BackupMetadata =
        serde_json::from_slice(&meta_buf).map_err(|e| format!("metadata non validi: {e}"))?;

    file.read_exact(&mut len_buf)
        .map_err(|e| format!("formato backup non valido: {e}"))?;
    let ls_len = u32::from_le_bytes(len_buf) as usize;

    let mut ls_buf = vec![0u8; ls_len];
    file.read_exact(&mut ls_buf)
        .map_err(|e| format!("formato backup non valido: {e}"))?;
    let localstorage_json =
        String::from_utf8(ls_buf).map_err(|e| format!("localstorage non valido: {e}"))?;

    let mut db_bytes = Vec::new();
    file.read_to_end(&mut db_bytes)
        .map_err(|e| format!("errore lettura database: {e}"))?;

    if db_bytes.is_empty() {
        return Err("il file di backup non contiene dati del database".to_string());
    }

    if metadata.format_version >= 2 {
        if let Some(ref expected_db_sha) = metadata.database_sha256 {
            let actual_db_sha = sha256_hex(&db_bytes);
            if &actual_db_sha != expected_db_sha {
                return Err(format!(
                    "checksum database non corrispondente (atteso: {}, reale: {})",
                    expected_db_sha, actual_db_sha
                ));
            }
        }

        if let Some(ref expected_ls_sha) = metadata.localstorage_sha256 {
            let actual_ls_sha = sha256_hex(localstorage_json.as_bytes());
            if &actual_ls_sha != expected_ls_sha {
                return Err(format!(
                    "checksum localStorage non corrispondente (atteso: {}, reale: {})",
                    expected_ls_sha, actual_ls_sha
                ));
            }
        }
    }

    restore_and_reopen(&app, &db_bytes)?;

    Ok(localstorage_json)
}

/// Backup format v3 (encrypted):
/// [4-byte metadata JSON length (u32 LE)]
/// [metadata JSON — includes encryption field]
/// [4-byte encrypted localStorage JSON length (u32 LE)]
/// [encrypted localStorage JSON (nonce + ciphertext)]
/// [encrypted database bytes (nonce + ciphertext)]
#[tauri::command]
pub fn backup_database_encrypted(
    app: AppHandle,
    destination_path: String,
    localstorage_json: String,
    passphrase: String,
) -> Result<String, String> {
    let db_path = get_database_path(&app).map_err(to_error)?;
    let dest = PathBuf::from(&destination_path);
    let ls_bytes = localstorage_json.as_bytes();

    let temp_dir = create_temp_dir()?;
    let snapshot_path = create_consistent_snapshot(&db_path, &temp_dir)?;
    let db_bytes = std::fs::read(&snapshot_path).map_err(to_error)?;

    let salt = crate::infrastructure::encryption::generate_salt();
    let key = crate::infrastructure::encryption::derive_key_from_passphrase(&passphrase, &salt);
    let key_check = crate::infrastructure::encryption::compute_key_check(&key);

    let encrypted_ls = crate::infrastructure::encryption::encrypt_data(&key, ls_bytes)?;
    let encrypted_db = crate::infrastructure::encryption::encrypt_data(&key, &db_bytes)?;

    let db_sha256 = sha256_hex(&db_bytes);
    let ls_sha256 = sha256_hex(ls_bytes);

    let metadata = BackupMetadata {
        format_version: 3,
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        created_at: chrono_now_iso(),
        schema_version: crate::db::migrations::CURRENT_SCHEMA_VERSION,
        database_size_bytes: db_bytes.len() as u64,
        localstorage_size_bytes: ls_bytes.len() as u64,
        database_sha256: Some(db_sha256),
        localstorage_sha256: Some(ls_sha256),
        encryption: Some(EncryptionInfo {
            algorithm: "AES-256-GCM".to_string(),
            salt: hex_encode(&salt),
            key_check,
        }),
    };
    let metadata_json = serde_json::to_string(&metadata).map_err(to_error)?;
    let meta_len = metadata_json.len() as u32;
    let ls_len = encrypted_ls.len() as u32;

    let mut output = std::fs::File::create(&dest).map_err(to_error)?;
    output
        .write_all(&meta_len.to_le_bytes())
        .map_err(to_error)?;
    output
        .write_all(metadata_json.as_bytes())
        .map_err(to_error)?;
    output
        .write_all(&ls_len.to_le_bytes())
        .map_err(to_error)?;
    output.write_all(&encrypted_ls).map_err(to_error)?;
    output.write_all(&encrypted_db).map_err(to_error)?;

    let _ = std::fs::remove_file(&snapshot_path);
    let _ = std::fs::remove_dir(&temp_dir);

    Ok(format!(
        "backup crittografato: {} kB DB + {} kB dati app",
        db_bytes.len() / 1024,
        ls_bytes.len() / 1024,
    ))
}

/// Restore an encrypted backup. Derives key from passphrase, verifies key_check,
/// decrypts database and localStorage, verifies SHA-256 checksums.
#[tauri::command]
pub fn restore_database_encrypted(
    app: AppHandle,
    source_path: String,
    passphrase: String,
) -> Result<String, String> {
    let _db_path = get_database_path(&app).map_err(to_error)?;
    let source = PathBuf::from(&source_path);

    let mut file =
        std::fs::File::open(&source).map_err(|e| format!("impossibile aprire file: {e}"))?;

    let mut len_buf = [0u8; 4];
    file.read_exact(&mut len_buf)
        .map_err(|e| format!("formato backup non valido: {e}"))?;
    let meta_len = u32::from_le_bytes(len_buf) as usize;

    let mut meta_buf = vec![0u8; meta_len];
    file.read_exact(&mut meta_buf)
        .map_err(|e| format!("formato backup non valido: {e}"))?;
    let metadata: BackupMetadata =
        serde_json::from_slice(&meta_buf).map_err(|e| format!("metadata non validi: {e}"))?;

    let enc_info = metadata
        .encryption
        .as_ref()
        .ok_or_else(|| "il backup non è crittografato".to_string())?;

    let salt = hex_decode(&enc_info.salt)?;

    let key = crate::infrastructure::encryption::derive_key_from_passphrase(&passphrase, &salt);
    let expected_check = crate::infrastructure::encryption::compute_key_check(&key);

    if expected_check != enc_info.key_check {
        return Err("passphrase errata: il key_check non corrisponde".to_string());
    }

    file.read_exact(&mut len_buf)
        .map_err(|e| format!("formato backup non valido: {e}"))?;
    let encrypted_ls_len = u32::from_le_bytes(len_buf) as usize;

    let mut encrypted_ls = vec![0u8; encrypted_ls_len];
    file.read_exact(&mut encrypted_ls)
        .map_err(|e| format!("formato backup non valido: {e}"))?;

    let mut encrypted_db = Vec::new();
    file.read_to_end(&mut encrypted_db)
        .map_err(|e| format!("errore lettura database: {e}"))?;

    if encrypted_db.is_empty() {
        return Err("il file di backup non contiene dati del database".to_string());
    }

    let ls_bytes =
        crate::infrastructure::encryption::decrypt_data(&key, &encrypted_ls)
            .map_err(|e| format!("errore decifratura localStorage: {e}"))?;
    let db_bytes =
        crate::infrastructure::encryption::decrypt_data(&key, &encrypted_db)
            .map_err(|e| format!("errore decifratura database: {e}"))?;

    let localstorage_json =
        String::from_utf8(ls_bytes).map_err(|e| format!("localstorage non valido: {e}"))?;

    if metadata.format_version >= 2 {
        if let Some(ref expected_db_sha) = metadata.database_sha256 {
            let actual_db_sha = sha256_hex(&db_bytes);
            if &actual_db_sha != expected_db_sha {
                return Err(format!(
                    "checksum database non corrispondente (atteso: {}, reale: {})",
                    expected_db_sha, actual_db_sha
                ));
            }
        }
        if let Some(ref expected_ls_sha) = metadata.localstorage_sha256 {
            let actual_ls_sha = sha256_hex(localstorage_json.as_bytes());
            if &actual_ls_sha != expected_ls_sha {
                return Err(format!(
                    "checksum localStorage non corrispondente (atteso: {}, reale: {})",
                    expected_ls_sha, actual_ls_sha
                ));
            }
        }
    }

    restore_and_reopen(&app, &db_bytes)?;

    Ok(localstorage_json)
}

/// Close the old connection first (WAL checkpoint on old data), write the
/// restored DB bytes to disk, then open a fresh connection. The ordering
/// prevents stale WAL pages from the old connection corrupting the restored file.
fn restore_and_reopen(app: &AppHandle, db_bytes: &[u8]) -> Result<(), String> {
    let db_path = get_database_path(app).map_err(|e| format!("{e}"))?;

    // 1. Close old connection — WAL checkpoint runs against the OLD file
    let state = app.state::<DbConnection>();
    let old_conn = {
        let mut guard = state.conn.lock().map_err(|e| format!("lock error: {e}"))?;
        std::mem::replace(
            &mut *guard,
            Connection::open_in_memory().map_err(|e| format!("in-memory error: {e}"))?,
        )
    };
    // Drop old connection NOW (outside the mutex) so its WAL checkpoint
    // completes on the OLD database file before we overwrite it.
    drop(old_conn);

    // 2. Write restored bytes
    std::fs::write(&db_path, db_bytes).map_err(|e| format!("write error: {e}"))?;

    // 3. Open fresh connection to the restored database
    let mut guard = state.conn.lock().map_err(|e| format!("lock error: {e}"))?;
    reopen_connection(app, &mut *guard).map_err(|e| e.to_string())
}

/// Check whether a .qbk file is encrypted and what algorithm was used.
#[tauri::command]
pub fn get_backup_encryption_status(
    _app: AppHandle,
    file_path: String,
) -> Result<serde_json::Value, String> {
    let source = PathBuf::from(&file_path);

    let mut file =
        std::fs::File::open(&source).map_err(|e| format!("impossibile aprire file: {e}"))?;

    let mut len_buf = [0u8; 4];
    file.read_exact(&mut len_buf)
        .map_err(|e| format!("formato backup non valido: {e}"))?;
    let meta_len = u32::from_le_bytes(len_buf) as usize;

    let mut meta_buf = vec![0u8; meta_len];
    file.read_exact(&mut meta_buf)
        .map_err(|e| format!("formato backup non valido: {e}"))?;
    let metadata: BackupMetadata =
        serde_json::from_slice(&meta_buf).map_err(|e| format!("metadata non validi: {e}"))?;

    match metadata.encryption {
        Some(ref enc) => Ok(serde_json::json!({
            "encrypted": true,
            "algorithm": enc.algorithm,
        })),
        None => Ok(serde_json::json!({
            "encrypted": false,
            "algorithm": null,
        })),
    }
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

fn hex_decode(hex: &str) -> Result<Vec<u8>, String> {
    if hex.len() % 2 != 0 {
        return Err("hex string must have even length".to_string());
    }
    (0..hex.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&hex[i..i + 2], 16).map_err(|e| format!("hex decode error: {e}")))
        .collect()
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
