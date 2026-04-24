use tauri::AppHandle;

use crate::{
    infrastructure::{
        contract_repository::{ContractRecord, CreateContractRequest},
        local_storage::open_app_database,
    },
    models::app_error::AppError,
};

#[tauri::command]
pub fn list_contracts(app: AppHandle) -> Result<Vec<ContractRecord>, String> {
    let connection = open_app_database(&app).map_err(to_command_error)?;

    crate::infrastructure::contract_repository::list_contracts(&connection)
        .map_err(to_command_error)
}

#[tauri::command]
pub fn get_contract(app: AppHandle, contract_id: String) -> Result<Option<ContractRecord>, String> {
    let connection = open_app_database(&app).map_err(to_command_error)?;

    crate::infrastructure::contract_repository::get_contract(&connection, &contract_id)
        .map_err(to_command_error)
}

#[tauri::command]
pub fn create_contract(
    app: AppHandle,
    request: CreateContractRequest,
) -> Result<ContractRecord, String> {
    let mut connection = open_app_database(&app).map_err(to_command_error)?;

    crate::infrastructure::contract_repository::create_contract(&mut connection, request)
        .map_err(to_command_error)
}

fn to_command_error(error: AppError) -> String {
    error.to_string()
}
