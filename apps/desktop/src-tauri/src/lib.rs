mod application;
mod commands;
mod db;
mod domain;
mod infrastructure;
mod models;
mod updater;

pub fn run() {
    #[cfg(all(target_os = "windows", not(debug_assertions)))]
    updater::windows_shell::reconcile();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::health::get_health_snapshot,
            commands::accounting::preview_sal_total,
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
            commands::tariffs::import_tariff_pdf_preview,
            commands::materials::list_materials,
            commands::materials::create_material,
            commands::materials::update_material,
            commands::materials::delete_material,
            commands::materials::adjust_material_stock,
            commands::materials::deduct_materials,
            commands::materials::list_material_transactions,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Quantara desktop");
}
