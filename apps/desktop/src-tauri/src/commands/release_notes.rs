use std::fs;
use std::path::PathBuf;

use tauri::AppHandle;

use crate::infrastructure::local_storage::get_app_data_dir;

fn notes_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut dir = get_app_data_dir(app).map_err(|e| format!("{e}"))?;
    dir.push("pending_release_notes.json");
    Ok(dir)
}

#[tauri::command]
pub fn write_pending_release_notes(app: AppHandle, json: String) -> Result<(), String> {
    let path = notes_file_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("impossibile creare directory: {e}"))?;
    }
    fs::write(&path, &json).map_err(|e| format!("impossibile scrivere note: {e}"))
}

#[tauri::command]
pub fn read_pending_release_notes(app: AppHandle) -> Result<String, String> {
    let path = notes_file_path(&app)?;
    if !path.exists() {
        return Err("nessuna nota in sospeso".to_string());
    }
    fs::read_to_string(&path).map_err(|e| format!("impossibile leggere note: {e}"))
}

#[tauri::command]
pub fn clear_pending_release_notes(app: AppHandle) -> Result<(), String> {
    let path = notes_file_path(&app)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("impossibile rimuovere note: {e}"))?;
    }
    Ok(())
}
