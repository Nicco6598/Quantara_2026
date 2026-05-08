use tauri::{AppHandle, State};

use crate::infrastructure::{
    local_storage::{DbConnection, with_db, with_db_mut},
    tariff_repository::{
        CreateTariffBookRequest, TariffBookRecord, TariffPdfImportPreview, TariffVoiceCountRecord,
        TariffVoiceRecord, UpdateTariffBookRequest,
    },
};

#[tauri::command]
pub fn list_tariff_books(state: State<'_, DbConnection>) -> Result<Vec<TariffBookRecord>, String> {
    with_db(&state, |conn| {
        crate::infrastructure::tariff_repository::list_tariff_books(conn)
    })
}

#[tauri::command]
pub fn create_tariff_book(
    state: State<'_, DbConnection>,
    request: CreateTariffBookRequest,
) -> Result<TariffBookRecord, String> {
    with_db_mut(&state, |conn| {
        crate::infrastructure::tariff_repository::create_tariff_book(conn, request)
    })
}

#[tauri::command]
pub fn update_tariff_book(
    state: State<'_, DbConnection>,
    tariff_book_id: String,
    request: UpdateTariffBookRequest,
) -> Result<TariffBookRecord, String> {
    with_db_mut(&state, |conn| {
        crate::infrastructure::tariff_repository::update_tariff_book(conn, &tariff_book_id, request)
    })
}

#[tauri::command]
pub fn delete_tariff_book(
    state: State<'_, DbConnection>,
    tariff_book_id: String,
) -> Result<(), String> {
    with_db_mut(&state, |conn| {
        crate::infrastructure::tariff_repository::delete_tariff_book(conn, &tariff_book_id)
    })
}

#[tauri::command]
pub fn list_tariff_voices(
    state: State<'_, DbConnection>,
    tariff_book_id: String,
) -> Result<Vec<TariffVoiceRecord>, String> {
    with_db(&state, |conn| {
        crate::infrastructure::tariff_repository::list_tariff_voices(conn, &tariff_book_id)
    })
}

#[tauri::command]
pub fn list_tariff_voice_counts(
    state: State<'_, DbConnection>,
) -> Result<Vec<TariffVoiceCountRecord>, String> {
    with_db(&state, |conn| {
        crate::infrastructure::tariff_repository::list_tariff_voice_counts(conn)
    })
}

#[tauri::command]
pub async fn import_tariff_pdf_preview(
    app: AppHandle,
    path: String,
) -> Result<TariffPdfImportPreview, String> {
    tauri::async_runtime::spawn_blocking(move || {
        crate::infrastructure::tariff_repository::import_tariff_pdf_preview(
            std::path::Path::new(&path),
            Some(&app),
        )
        .map_err(to_command_error)
    })
    .await
    .map_err(|error| format!("Import tariffario interrotto: {error}"))?
}

#[tauri::command]
pub async fn import_tariff_pdf_preview_batch(
    app: AppHandle,
    paths: Vec<String>,
) -> Result<Vec<TariffPdfImportPreview>, String> {
    let max_concurrent = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
        .max(1);

    tauri::async_runtime::spawn_blocking(move || {
        crate::infrastructure::tariff_repository::import_tariff_pdf_preview_batch(
            &paths,
            &app,
            Some(max_concurrent),
        )
        .map_err(|errors| {
            errors
                .iter()
                .map(|(path, msg)| format!("{path}: {msg}"))
                .collect::<Vec<_>>()
                .join("\n")
        })
    })
    .await
    .map_err(|error| format!("Import batch interrotto: {error}"))?
}

fn to_command_error(error: crate::models::app_error::AppError) -> String {
    error.to_string()
}
