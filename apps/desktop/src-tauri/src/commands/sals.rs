use rusqlite::params;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

use crate::infrastructure::{
    audit_repository, local_storage::{DbConnection, with_db, with_db_mut},
    material_repository, sal_document_repository_v2, sal_repository,
};
use crate::infrastructure::to_database_error;
use crate::models::app_error::AppError;

#[tauri::command]
pub fn list_sal_projects(state: State<'_, DbConnection>) -> Result<Vec<sal_repository::SalBackednProject>, String> {
    with_db(&state, |conn| sal_repository::list_sal_projects(conn))
}

#[tauri::command]
pub fn list_sal_documents(
    state: State<'_, DbConnection>,
    project_id: Option<String>,
) -> Result<Vec<Value>, String> {
    with_db(&state, |conn| {
        sal_document_repository_v2::list_sal_documents_v2(conn, project_id.as_deref())
    })
}

#[tauri::command]
pub fn save_sal_project(
    state: State<'_, DbConnection>,
    project: sal_repository::SalBackednProject,
) -> Result<(), String> {
    with_db_mut(&state, |conn| {
        sal_repository::upsert_sal_project(conn, &project)?;
        audit_repository::append_event(conn, "project", &project.id, "save", None, None)?;
        Ok(())
    })
}

#[tauri::command]
pub fn save_sal_document(
    state: State<'_, DbConnection>,
    project_id: String,
    data: Value,
) -> Result<(), String> {
    with_db_mut(&state, |conn| {
        let sal_id = data
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");
        sal_document_repository_v2::create_sal_document_v2(conn, &project_id, &data)?;
        audit_repository::append_event(conn, "sal", sal_id, "create", None, Some(&data))?;
        Ok(())
    })
}

#[tauri::command]
pub fn update_sal_document(
    state: State<'_, DbConnection>,
    id: String,
    data: Value,
) -> Result<(), String> {
    with_db_mut(&state, |conn| {
        let project_id = data
            .get("projectId")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::Validation("SalDocument missing projectId".into()))?;
        let _ = conn.execute(
            "DELETE FROM sal_documents_v2 WHERE id = ?1",
            params![id],
        );
        sal_document_repository_v2::create_sal_document_v2(conn, project_id, &data)?;
        audit_repository::append_event(conn, "sal", &id, "update", None, Some(&data))?;
        Ok(())
    })
}

#[tauri::command]
pub fn update_sal_document_with_reason(
    state: State<'_, DbConnection>,
    id: String,
    data: Value,
    change_reason: String,
) -> Result<(), String> {
    with_db_mut(&state, |conn| {
        let project_id = data
            .get("projectId")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::Validation("SalDocument missing projectId".into()))?
            .to_string();

        sal_document_repository_v2::save_version_snapshot(conn, &id, &change_reason, None)?;

        let current_version: i64 = conn
            .query_row(
                "SELECT version FROM sal_documents_v2 WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let mut updated_data = data.clone();
        if let Some(obj) = updated_data.as_object_mut() {
            obj.insert(
                "version".to_string(),
                Value::Number((current_version + 1).into()),
            );
            obj.insert(
                "changeReason".to_string(),
                Value::String(change_reason.clone()),
            );
        }

        let _ = conn.execute("DELETE FROM sal_documents_v2 WHERE id = ?1", params![id]);
        sal_document_repository_v2::create_sal_document_v2(conn, &project_id, &updated_data)?;

        audit_repository::append_event(
            conn,
            "sal",
            &id,
            "update_with_reason",
            None,
            Some(&updated_data),
        )?;

        Ok(())
    })
}

#[tauri::command]
pub fn list_sal_versions(
    state: State<'_, DbConnection>,
    sal_id: String,
) -> Result<Vec<Value>, String> {
    with_db(&state, |conn| {
        sal_document_repository_v2::list_versions(conn, &sal_id)
    })
}

#[tauri::command]
pub fn get_sal_version(
    state: State<'_, DbConnection>,
    version_id: String,
) -> Result<Value, String> {
    with_db(&state, |conn| {
        sal_document_repository_v2::get_version(conn, &version_id)?
            .ok_or_else(|| AppError::NotFound(format!("Version {} not found", version_id)))
    })
}

#[tauri::command]
pub fn delete_sal_document(
    state: State<'_, DbConnection>,
    id: String,
) -> Result<(), String> {
    with_db_mut(&state, |conn| {
        sal_document_repository_v2::delete_sal_document_v2(conn, &id)?;
        audit_repository::append_event(conn, "sal", &id, "delete", None, None)?;
        Ok(())
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterialDeductionInput {
    pub material_id: String,
    pub quantity: f64,
    pub description: Option<String>,
}

#[tauri::command]
pub fn confirm_sal_transaction(
    state: State<'_, DbConnection>,
    project_id: String,
    sal_data: Value,
    material_deductions: Vec<MaterialDeductionInput>,
) -> Result<Value, String> {
    with_db_mut(&state, |conn| {
        let tx = conn.transaction().map_err(to_database_error)?;

        // 1. Upsert SAL document (v2 normalized)
        sal_document_repository_v2::create_sal_document_v2(&*tx, &project_id, &sal_data)?;

        // 2. Deduct materials
        let sal_id = sal_data
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");
        let deductions: Vec<(String, f64, String)> = material_deductions
            .iter()
            .map(|d| (d.material_id.clone(), d.quantity, sal_id.to_string()))
            .collect();
        if !deductions.is_empty() {
            material_repository::deduct_materials_tx(&*tx, &deductions)?;
        }

        // 3. Append audit event
        audit_repository::append_event(
            &*tx,
            "sal",
            sal_id,
            "confirm",
            None::<&str>,
            Some(&sal_data),
        )?;

        tx.commit().map_err(to_database_error)?;
        Ok(sal_data)
    })
}
