use std::{fs, path::PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::{
    infrastructure::local_storage::get_app_data_dir,
    models::app_error::AppError,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportDraftSummaryDto {
    pub id: String,
    pub name: String,
    pub saved_at: String,
    pub file_count: usize,
    pub reviewed_count: usize,
    pub total_voices: usize,
}

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImportDraftIndexFile {
    entries: Vec<ImportDraftSummaryDto>,
}

fn import_drafts_dir(app: &AppHandle) -> Result<PathBuf, AppError> {
    let dir = get_app_data_dir(app)?.join("import-drafts");
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn draft_index_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    Ok(import_drafts_dir(app)?.join("index.json"))
}

fn sanitize_draft_filename(draft_id: &str) -> String {
    let safe: String = draft_id
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '_'
            }
        })
        .collect();
    let trimmed = safe.trim_matches('_');
    if trimmed.is_empty() {
        "import_draft".to_string()
    } else {
        trimmed.chars().take(180).collect()
    }
}

fn draft_file_path(app: &AppHandle, draft_id: &str) -> Result<PathBuf, AppError> {
    Ok(import_drafts_dir(app)?.join(format!("{}.json", sanitize_draft_filename(draft_id))))
}

fn read_draft_index(app: &AppHandle) -> Result<ImportDraftIndexFile, AppError> {
    let path = draft_index_path(app)?;
    if !path.is_file() {
        return Ok(ImportDraftIndexFile::default());
    }
    let raw = fs::read_to_string(path)?;
    serde_json::from_str(&raw).map_err(|error| AppError::Backup(error.to_string()))
}

fn write_draft_index(app: &AppHandle, index: &ImportDraftIndexFile) -> Result<(), AppError> {
    let path = draft_index_path(app)?;
    let payload = serde_json::to_string(index).map_err(|error| AppError::Backup(error.to_string()))?;
    fs::write(path, payload.as_bytes())?;
    Ok(())
}

pub fn upsert_draft_index_entry(app: &AppHandle, summary: ImportDraftSummaryDto) -> Result<(), AppError> {
    let mut index = read_draft_index(app)?;
    index.entries.retain(|entry| entry.id != summary.id);
    index.entries.insert(0, summary);
    index.entries.truncate(12);
    write_draft_index(app, &index)
}

pub fn remove_draft_index_entry(app: &AppHandle, draft_id: &str) -> Result<(), AppError> {
    let mut index = read_draft_index(app)?;
    let before = index.entries.len();
    index.entries.retain(|entry| entry.id != draft_id);
    if index.entries.len() != before {
        write_draft_index(app, &index)?;
    }
    Ok(())
}

pub fn save_import_draft_file(
    app: &AppHandle,
    draft_id: &str,
    payload: &str,
    summary: ImportDraftSummaryDto,
) -> Result<(), AppError> {
    let path = draft_file_path(app, draft_id)?;
    fs::write(&path, payload.as_bytes())?;
    upsert_draft_index_entry(app, summary)
}

pub fn load_import_draft_file(app: &AppHandle, draft_id: &str) -> Result<Option<String>, AppError> {
    let path = draft_file_path(app, draft_id)?;
    if !path.is_file() {
        return Ok(None);
    }
    let payload = fs::read_to_string(&path)?;
    Ok(Some(payload))
}

pub fn delete_import_draft_file(app: &AppHandle, draft_id: &str) -> Result<(), AppError> {
    let path = draft_file_path(app, draft_id)?;
    if path.is_file() {
        fs::remove_file(path)?;
    }
    remove_draft_index_entry(app, draft_id)
}

#[derive(Deserialize)]
struct DraftFileIndexRebuild {
    id: String,
    name: String,
    #[serde(rename = "savedAt")]
    saved_at: String,
    metadatas: Vec<serde_json::Value>,
    #[serde(rename = "reviewedFiles", default)]
    reviewed_files: Vec<usize>,
    #[serde(rename = "editableVoicesList", default)]
    editable_voices_list: Vec<Vec<serde_json::Value>>,
}

fn rebuild_index_from_draft_files(app: &AppHandle) -> Result<Vec<ImportDraftSummaryDto>, AppError> {
    let dir = import_drafts_dir(app)?;
    let mut summaries = Vec::new();

    for entry in fs::read_dir(dir).into_iter().flatten().flatten() {
        let path = entry.path();
        let file_name = path.file_name().and_then(|name| name.to_str()).unwrap_or("");
        if file_name == "index.json" || path.extension().and_then(|ext| ext.to_str()) != Some("json") {
            continue;
        }
        let payload = match fs::read_to_string(&path) {
            Ok(payload) => payload,
            Err(_) => continue,
        };
        let head: DraftFileIndexRebuild = match serde_json::from_str(&payload) {
            Ok(head) => head,
            Err(_) => continue,
        };
        let total_voices = head
            .editable_voices_list
            .iter()
            .map(|voices| voices.len())
            .sum();
        summaries.push(ImportDraftSummaryDto {
            id: head.id,
            name: head.name,
            saved_at: head.saved_at,
            file_count: head.metadatas.len(),
            reviewed_count: head.reviewed_files.len(),
            total_voices,
        });
    }

    summaries.sort_by(|left, right| right.saved_at.cmp(&left.saved_at));
    summaries.truncate(12);
    Ok(summaries)
}

pub fn list_import_draft_summaries(app: &AppHandle) -> Result<Vec<ImportDraftSummaryDto>, AppError> {
    let index = read_draft_index(app)?;
    if !index.entries.is_empty() {
        return Ok(index.entries);
    }

    let rebuilt = rebuild_index_from_draft_files(app)?;
    if !rebuilt.is_empty() {
        write_draft_index(app, &ImportDraftIndexFile { entries: rebuilt.clone() })?;
    }
    Ok(rebuilt)
}
