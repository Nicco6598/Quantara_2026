use serde_json::Value;
use tauri::State;

use crate::infrastructure::{
    local_storage::{DbConnection, with_db, with_db_mut},
    sal_repository,
};

#[tauri::command]
pub fn list_sal_projects(state: State<'_, DbConnection>) -> Result<Vec<sal_repository::SalBackednProject>, String> {
    with_db(&state, |conn| sal_repository::list_sal_projects(conn))
}

#[tauri::command]
pub fn list_sal_documents(
    state: State<'_, DbConnection>,
    project_id: Option<String>,
) -> Result<Vec<Value>, String> {
    with_db(&state, |conn| sal_repository::list_sal_documents(conn, project_id.as_deref()))
}

#[tauri::command]
pub fn save_sal_project(
    state: State<'_, DbConnection>,
    project: sal_repository::SalBackednProject,
) -> Result<(), String> {
    with_db_mut(&state, |conn| sal_repository::upsert_sal_project(conn, &project))
}

#[tauri::command]
pub fn save_sal_document(
    state: State<'_, DbConnection>,
    project_id: String,
    data: Value,
) -> Result<(), String> {
    with_db_mut(&state, |conn| sal_repository::create_sal_document(conn, &project_id, &data))
}

#[tauri::command]
pub fn update_sal_document(
    state: State<'_, DbConnection>,
    id: String,
    data: Value,
) -> Result<(), String> {
    with_db_mut(&state, |conn| sal_repository::update_sal_document(conn, &id, &data))
}

#[tauri::command]
pub fn delete_sal_document(
    state: State<'_, DbConnection>,
    id: String,
) -> Result<(), String> {
    with_db_mut(&state, |conn| sal_repository::delete_sal_document(conn, &id))
}
