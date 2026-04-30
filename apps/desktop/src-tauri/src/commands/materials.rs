use tauri::AppHandle;

use crate::{
    infrastructure::{
        local_storage::open_app_database,
        material_repository::{
            self, CreateMaterialRequest, MaterialRecord, MaterialTransactionRecord,
            UpdateMaterialRequest,
        },
    },
    models::app_error::AppError,
};

#[tauri::command]
pub fn list_materials(app: AppHandle) -> Result<Vec<MaterialRecord>, String> {
    let connection = open_app_database(&app).map_err(to_command_error)?;
    material_repository::list_materials(&connection).map_err(to_command_error)
}

#[tauri::command]
pub fn create_material(
    app: AppHandle,
    request: CreateMaterialRequest,
) -> Result<MaterialRecord, String> {
    let mut connection = open_app_database(&app).map_err(to_command_error)?;
    material_repository::create_material(&mut connection, request).map_err(to_command_error)
}

#[tauri::command]
pub fn update_material(
    app: AppHandle,
    material_id: String,
    request: UpdateMaterialRequest,
) -> Result<MaterialRecord, String> {
    let connection = open_app_database(&app).map_err(to_command_error)?;
    material_repository::update_material(&connection, &material_id, request)
        .map_err(to_command_error)
}

#[tauri::command]
pub fn delete_material(app: AppHandle, material_id: String) -> Result<(), String> {
    let mut connection = open_app_database(&app).map_err(to_command_error)?;
    material_repository::delete_material(&mut connection, &material_id).map_err(to_command_error)
}

#[tauri::command]
pub fn adjust_material_stock(
    app: AppHandle,
    material_id: String,
    new_quantity: f64,
    description: String,
) -> Result<MaterialRecord, String> {
    let mut connection = open_app_database(&app).map_err(to_command_error)?;
    material_repository::adjust_material_stock(&mut connection, &material_id, new_quantity, &description)
        .map_err(to_command_error)
}

#[tauri::command]
pub fn deduct_materials(
    app: AppHandle,
    deductions: Vec<(String, f64, String)>,
) -> Result<Vec<MaterialRecord>, String> {
    let mut connection = open_app_database(&app).map_err(to_command_error)?;
    material_repository::deduct_materials(&mut connection, &deductions).map_err(to_command_error)
}

#[tauri::command]
pub fn list_material_transactions(
    app: AppHandle,
    material_id: String,
) -> Result<Vec<MaterialTransactionRecord>, String> {
    let connection = open_app_database(&app).map_err(to_command_error)?;
    material_repository::list_material_transactions(&connection, &material_id)
        .map_err(to_command_error)
}

fn to_command_error(error: AppError) -> String {
    error.to_string()
}
