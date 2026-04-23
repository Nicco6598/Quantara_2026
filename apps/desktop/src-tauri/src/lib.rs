mod application;
mod commands;
mod db;
mod domain;
mod infrastructure;
mod models;
mod updater;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::health::get_health_snapshot,
            commands::accounting::preview_sal_total
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Quantara desktop");
}
