use serde::Serialize;

use crate::{
    application::accounting_service::AccountingService, db::migrations::CURRENT_SCHEMA_VERSION,
    infrastructure::local_storage::default_database_name, updater::patch_notes::PatchNotes,
};

#[derive(Debug, Serialize)]
pub struct HealthSnapshot {
    pub app_version: &'static str,
    pub database_name: String,
    pub default_module: &'static str,
    pub latest_patch_notes: String,
    pub schema_version: i32,
    pub storage_engine: &'static str,
    pub updater_ready: bool,
}

#[tauri::command]
pub fn get_health_snapshot() -> HealthSnapshot {
    let patch_notes = PatchNotes::foundation();

    HealthSnapshot {
        app_version: env!("CARGO_PKG_VERSION"),
        database_name: default_database_name().to_string_lossy().to_string(),
        default_module: AccountingService::module_name(),
        latest_patch_notes: format!("{}: {}", patch_notes.version, patch_notes.summary),
        schema_version: CURRENT_SCHEMA_VERSION,
        storage_engine: "sqlite",
        updater_ready: true,
    }
}
