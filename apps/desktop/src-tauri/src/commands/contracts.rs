use crate::infrastructure::audit_repository;
use tauri::State;

use crate::infrastructure::{
    contract_repository::{ContractRecord, CreateContractRequest, UpdateContractRequest},
    local_storage::{DbConnection, with_db, with_db_mut},
};

#[tauri::command]
pub fn list_contracts(state: State<'_, DbConnection>) -> Result<Vec<ContractRecord>, String> {
    with_db(&state, |conn| {
        crate::infrastructure::contract_repository::list_contracts(conn)
    })
}

#[tauri::command]
pub fn get_contract(
    state: State<'_, DbConnection>,
    contract_id: String,
) -> Result<Option<ContractRecord>, String> {
    with_db(&state, |conn| {
        crate::infrastructure::contract_repository::get_contract(conn, &contract_id)
    })
}

#[tauri::command]
pub fn create_contract(
    state: State<'_, DbConnection>,
    request: CreateContractRequest,
) -> Result<ContractRecord, String> {
    with_db_mut(&state, |conn| {
        let record = crate::infrastructure::contract_repository::create_contract(conn, request)?;
        audit_repository::append_event(conn, "contract", &record.id, "create", None, None)?;
        Ok(record)
    })
}

#[tauri::command]
pub fn update_contract(
    state: State<'_, DbConnection>,
    contract_id: String,
    request: UpdateContractRequest,
) -> Result<ContractRecord, String> {
    with_db_mut(&state, |conn| {
        let record = crate::infrastructure::contract_repository::update_contract(conn, &contract_id, request)?;
        audit_repository::append_event(conn, "contract", &contract_id, "update", None, None)?;
        Ok(record)
    })
}

#[tauri::command]
pub fn delete_contract(state: State<'_, DbConnection>, contract_id: String) -> Result<(), String> {
    with_db_mut(&state, |conn| {
        crate::infrastructure::contract_repository::delete_contract(conn, &contract_id)?;
        audit_repository::append_event(conn, "contract", &contract_id, "delete", None, None)?;
        Ok(())
    })
}
