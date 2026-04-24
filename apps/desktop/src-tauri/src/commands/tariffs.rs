use tauri::AppHandle;

use crate::{
    infrastructure::{
        local_storage::open_app_database,
        tariff_repository::{
            CreateTariffBookRequest, TariffBookRecord, TariffPdfImportPreview, TariffVoiceRecord,
            UpdateTariffBookRequest,
        },
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
    let mut connection = open_app_database(&app).map_err(to_command_error)?;

    crate::infrastructure::tariff_repository::create_tariff_book(&mut connection, request)
        .map_err(to_command_error)
}

#[tauri::command]
pub fn update_tariff_book(
    app: AppHandle,
    tariff_book_id: String,
    request: UpdateTariffBookRequest,
) -> Result<TariffBookRecord, String> {
    let connection = open_app_database(&app).map_err(to_command_error)?;

    crate::infrastructure::tariff_repository::update_tariff_book(
        &connection,
        &tariff_book_id,
        request,
    )
    .map_err(to_command_error)
}

#[tauri::command]
pub fn delete_tariff_book(app: AppHandle, tariff_book_id: String) -> Result<(), String> {
    let mut connection = open_app_database(&app).map_err(to_command_error)?;

    crate::infrastructure::tariff_repository::delete_tariff_book(&mut connection, &tariff_book_id)
        .map_err(to_command_error)
}

#[tauri::command]
pub fn list_tariff_voices(
    app: AppHandle,
    tariff_book_id: String,
) -> Result<Vec<TariffVoiceRecord>, String> {
    let connection = open_app_database(&app).map_err(to_command_error)?;

    crate::infrastructure::tariff_repository::list_tariff_voices(&connection, &tariff_book_id)
        .map_err(to_command_error)
}

#[tauri::command]
pub fn import_tariff_pdf_preview(path: String) -> Result<TariffPdfImportPreview, String> {
    crate::infrastructure::tariff_repository::import_tariff_pdf_preview(std::path::Path::new(&path))
        .map_err(to_command_error)
}

fn to_command_error(error: AppError) -> String {
    error.to_string()
}
