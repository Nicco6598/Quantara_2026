use tauri::AppHandle;

use crate::{
    infrastructure::{
        local_storage::open_app_database,
        tariff_repository::{CreateTariffBookRequest, TariffBookRecord},
    },
    models::app_error::AppError,
};

#[tauri::command]
pub fn list_tariff_books(app: AppHandle) -> Result<Vec<TariffBookRecord>, String> {
    let connection = open_app_database(&app).map_err(to_command_error)?;

    crate::infrastructure::tariff_repository::list_tariff_books(&connection)
        .map_err(to_command_error)
}

#[tauri::command]
pub fn create_tariff_book(
    app: AppHandle,
    request: CreateTariffBookRequest,
) -> Result<TariffBookRecord, String> {
    let connection = open_app_database(&app).map_err(to_command_error)?;

    crate::infrastructure::tariff_repository::create_tariff_book(&connection, request)
        .map_err(to_command_error)
}

fn to_command_error(error: AppError) -> String {
    error.to_string()
}
