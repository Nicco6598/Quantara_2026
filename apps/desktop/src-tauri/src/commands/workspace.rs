use serde_json::Value;
use tauri::State;

use crate::infrastructure::local_storage::{with_db, with_db_mut, DbConnection};
use crate::infrastructure::{audit_repository, workspace_repository};
use crate::models::app_error::AppError;

#[tauri::command]
pub fn list_members(
    state: State<'_, DbConnection>,
) -> Result<Vec<workspace_repository::MemberRecord>, String> {
    with_db(&state, |conn| workspace_repository::list_members(conn))
}

#[tauri::command]
pub fn create_member(
    state: State<'_, DbConnection>,
    name: String,
    email: String,
    role: String,
) -> Result<workspace_repository::MemberRecord, String> {
    with_db_mut(&state, |conn| {
        let member = workspace_repository::create_member(conn, &name, &email, &role)?;
        audit_repository::append_event(conn, "member", &member.id, "create", None, None)?;
        Ok(member)
    })
}

#[tauri::command]
pub fn update_member(
    state: State<'_, DbConnection>,
    id: String,
    name: String,
    email: String,
    role: String,
) -> Result<(), String> {
    with_db_mut(&state, |conn| {
        workspace_repository::update_member(conn, &id, &name, &email, &role)?;
        audit_repository::append_event(conn, "member", &id, "update", None, None)?;
        Ok(())
    })
}

#[tauri::command]
pub fn delete_member(
    state: State<'_, DbConnection>,
    id: String,
) -> Result<(), String> {
    with_db_mut(&state, |conn| {
        let _member = workspace_repository::get_member_by_id(conn, &id)?
            .ok_or_else(|| AppError::NotFound(format!("Member {} not found", id)))?;
        workspace_repository::delete_member(conn, &id)?;
        audit_repository::append_event(conn, "member", &id, "delete", None, None)?;
        Ok(())
    })
}

#[tauri::command]
pub fn list_roles(state: State<'_, DbConnection>) -> Result<Vec<Value>, String> {
    with_db(&state, |conn| workspace_repository::list_roles(conn))
}

#[tauri::command]
pub fn get_current_member(
    state: State<'_, DbConnection>,
) -> Result<Option<workspace_repository::MemberRecord>, String> {
    with_db(&state, |conn| {
        workspace_repository::get_member_by_id(conn, "member_default")
    })
}
