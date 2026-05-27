use tauri::State;

use crate::infrastructure::{audit_repository, local_storage::{with_db, DbConnection}};

#[tauri::command]
pub fn list_audit_events(
    state: State<'_, DbConnection>,
    limit: Option<usize>,
) -> Result<Vec<audit_repository::AuditEventRecord>, String> {
    with_db(&state, |conn| audit_repository::list_recent_events(conn, limit.unwrap_or(100)))
}
