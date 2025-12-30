// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;
pub mod nut;
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use commands::NutState;
use std::sync::Arc;
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(NutState(Arc::new(Mutex::new(None))))
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::connect_nut,
            commands::disconnect_nut,
            commands::get_ups_data,
            commands::start_background_polling,
            commands::trigger_system_stop
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
