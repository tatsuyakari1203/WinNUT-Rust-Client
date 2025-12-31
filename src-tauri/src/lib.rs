// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;
pub mod db;
pub mod nut;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}! You've been greeted from Rust!")
}

use commands::NutState;
use std::sync::Arc;
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_log::Builder::default().build())
        .manage(NutState(Arc::new(Mutex::new(None))))
        .manage(commands::ShutdownState(Arc::new(Mutex::new(
            commands::ShutdownTracker::default(),
        ))))
        .setup(|app| {
            // Initialize Database
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir)?;
            let db = crate::db::NutDB::new(&app_data_dir);
            if let Err(e) = db.init() {
                eprintln!("Failed to init DB: {}", e);
            }
            app.manage(commands::DbState(Arc::new(Mutex::new(Some(db)))));

            let tray_menu = Menu::with_items(
                app,
                &[
                    &MenuItem::with_id(app, "show", "Show Main Window", true, None::<&str>)?,
                    &MenuItem::with_id(app, "hide", "Hide to Tray", true, None::<&str>)?,
                    &MenuItem::with_id(app, "quit", "Exit Application", true, None::<&str>)?,
                ],
            )?;

            let _tray = TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&tray_menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::connect_nut,
            commands::disconnect_nut,
            commands::get_ups_data,
            commands::start_background_polling,
            commands::trigger_system_stop,
            commands::abort_system_stop,
            commands::scan_nut_network,
            commands::list_ups_on_server,
            commands::list_ups_commands,
            commands::run_ups_command,
            commands::get_chart_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
