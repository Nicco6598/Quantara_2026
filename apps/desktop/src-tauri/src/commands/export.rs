use std::fs;
use std::path::PathBuf;

#[tauri::command]
pub async fn write_export_file(path: String, bytes: Vec<u8>) -> Result<String, String> {
    let path_buf = PathBuf::from(path);
    if let Some(parent) = path_buf.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(&path_buf, bytes).map_err(|error| error.to_string())?;
    Ok(path_buf.to_string_lossy().to_string())
}
