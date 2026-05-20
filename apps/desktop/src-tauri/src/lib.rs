mod commands;
mod db;
mod infrastructure;
mod models;
mod updater;

use infrastructure::local_storage::DbConnection;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
#[cfg(not(debug_assertions))]
use tauri_plugin_dialog::DialogExt;

pub fn run() {
    #[cfg(all(target_os = "windows", not(debug_assertions)))]
    updater::windows_shell::reconcile();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let db = match DbConnection::open(app.handle()) {
                Ok(db) => db,
                Err(e) => {
                    eprintln!("[quantara] FATAL: failed to open database: {e}");
                    #[cfg(not(debug_assertions))]
                    {
                        let _ = app
                            .dialog()
                            .message(&format!(
                                "Impossibile inizializzare il database.\n\n{e}\n\n\
                                 Riavvia l'applicazione. Se il problema persiste, \
                                 reinstalla Quantara."
                            ))
                            .title("Errore database")
                            .kind(tauri_plugin_dialog::MessageDialogKind::Error)
                            .show(|_| {});
                    }
                    return Err(e.into());
                }
            };
            app.manage(db);

            #[cfg(target_os = "macos")]
            {
                WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                    .title("Quantara")
                    .inner_size(1440.0, 900.0)
                    .min_inner_size(1180.0, 720.0)
                    .maximized(true)
                    .decorations(true)
                    .hidden_title(true)
                    .title_bar_style(tauri::TitleBarStyle::Overlay)
                    .build()?;
            }

            #[cfg(not(target_os = "macos"))]
            {
                WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                    .title("Quantara")
                    .inner_size(1440.0, 900.0)
                    .min_inner_size(1180.0, 720.0)
                    .maximized(true)
                    .decorations(false)
                    .build()?;
            }

            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                infrastructure::tariff_repository::shutdown_rfi_parser();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::health::get_health_snapshot,
            commands::contracts::list_contracts,
            commands::contracts::get_contract,
            commands::contracts::create_contract,
            commands::contracts::update_contract,
            commands::contracts::delete_contract,
            commands::tariffs::list_tariff_books,
            commands::tariffs::create_tariff_book,
            commands::tariffs::update_tariff_book,
            commands::tariffs::delete_tariff_book,
            commands::tariffs::list_tariff_voices,
            commands::tariffs::list_tariff_voice_counts,
            commands::tariffs::search_tariff_voices,
            commands::tariffs::import_tariff_pdf_preview,
            commands::tariffs::import_tariff_pdf_preview_batch,
            commands::materials::list_materials,
            commands::materials::create_material,
            commands::materials::update_material,
            commands::materials::delete_material,
            commands::materials::adjust_material_stock,
            commands::materials::deduct_materials,
            commands::materials::list_material_transactions,
            commands::sals::list_sal_projects,
            commands::sals::list_sal_documents,
            commands::sals::save_sal_project,
            commands::sals::save_sal_document,
            commands::sals::update_sal_document,
            commands::sals::delete_sal_document,
            commands::sals::confirm_sal_transaction,
            commands::sals::update_sal_document_with_reason,
            commands::sals::list_sal_versions,
            commands::sals::get_sal_version,
            commands::backup::backup_database,
            commands::backup::restore_database,
            commands::backup::backup_database_encrypted,
            commands::backup::restore_database_encrypted,
            commands::backup::get_backup_encryption_status,
            commands::backup::get_database_info,
            commands::export::write_export_file,
            commands::release_notes::write_pending_release_notes,
            commands::release_notes::read_pending_release_notes,
            commands::release_notes::clear_pending_release_notes,
            commands::workspace::list_members,
            commands::workspace::create_member,
            commands::workspace::update_member,
            commands::workspace::delete_member,
            commands::workspace::list_roles,
            commands::workspace::get_current_member,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Quantara desktop");
}
