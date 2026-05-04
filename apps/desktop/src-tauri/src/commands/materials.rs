use tauri::State;

use crate::infrastructure::{
    local_storage::{with_db, with_db_mut, DbConnection},
    material_repository::{
        self, CreateMaterialRequest, MaterialRecord, MaterialTransactionRecord,
        UpdateMaterialRequest,
    },
};

#[tauri::command]
pub fn list_materials(state: State<'_, DbConnection>) -> Result<Vec<MaterialRecord>, String> {
    with_db(&state, |conn| material_repository::list_materials(conn))
}

#[tauri::command]
pub fn create_material(
    state: State<'_, DbConnection>,
    request: CreateMaterialRequest,
) -> Result<MaterialRecord, String> {
    with_db_mut(&state, |conn| {
        material_repository::create_material(conn, request)
    })
}

#[tauri::command]
pub fn update_material(
    state: State<'_, DbConnection>,
    material_id: String,
    request: UpdateMaterialRequest,
) -> Result<MaterialRecord, String> {
    with_db(&state, |conn| {
        material_repository::update_material(conn, &material_id, request)
    })
}

#[tauri::command]
pub fn delete_material(
    state: State<'_, DbConnection>,
    material_id: String,
) -> Result<(), String> {
    with_db_mut(&state, |conn| {
        material_repository::delete_material(conn, &material_id)
    })
}

#[tauri::command]
pub fn adjust_material_stock(
    state: State<'_, DbConnection>,
    material_id: String,
    new_quantity: f64,
    description: String,
) -> Result<MaterialRecord, String> {
    with_db_mut(&state, |conn| {
        material_repository::adjust_material_stock(conn, &material_id, new_quantity, &description)
    })
}

#[tauri::command]
pub fn deduct_materials(
    state: State<'_, DbConnection>,
    deductions: Vec<(String, f64, String)>,
) -> Result<Vec<MaterialRecord>, String> {
    with_db_mut(&state, |conn| {
        material_repository::deduct_materials(conn, &deductions)
    })
}

#[tauri::command]
pub fn list_material_transactions(
    state: State<'_, DbConnection>,
    material_id: String,
) -> Result<Vec<MaterialTransactionRecord>, String> {
    with_db(&state, |conn| {
        material_repository::list_material_transactions(conn, &material_id)
    })
}
