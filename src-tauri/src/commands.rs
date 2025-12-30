use crate::nut::client::NutClient;
use crate::nut::models::{NutConfig, UpsData};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;

// We need a thread-safe wrapper for the client
pub struct NutState(pub Arc<Mutex<Option<NutClient>>>);

/// Creates a simple 32x32 solid color circle icon programmatically
fn create_status_icon(r: u8, g: u8, b: u8) -> tauri::image::Image<'static> {
    let size = 32;
    let mut rgba = vec![0u8; size * size * 4];
    let center = size as f32 / 2.0;
    let radius = size as f32 / 2.0 - 2.0;

    for y in 0..size {
        for x in 0..size {
            let dx = x as f32 - center + 0.5;
            let dy = y as f32 - center + 0.5;
            let dist_sq = dx * dx + dy * dy;

            if dist_sq <= radius * radius {
                let idx = (y * size + x) * 4;
                rgba[idx] = r;
                rgba[idx + 1] = g;
                rgba[idx + 2] = b;
                rgba[idx + 3] = 255; // Alpha
            }
        }
    }
    tauri::image::Image::new_owned(rgba, size as u32, size as u32)
}

#[tauri::command]
pub async fn connect_nut(state: State<'_, NutState>, config: NutConfig) -> Result<String, String> {
    let mut client = NutClient::new(config);
    match client.connect().await {
        Ok(_) => {
            let mut state_val = state.0.lock().await;
            *state_val = Some(client);
            Ok("Connected".to_string())
        }
        Err(e) => Err(format!("Connection failed: {e}")),
    }
}

#[tauri::command]
pub async fn disconnect_nut(state: State<'_, NutState>) -> Result<String, String> {
    let mut state_val = state.0.lock().await;
    if let Some(mut client) = state_val.take() {
        let _ = client.disconnect().await;
    }
    Ok("Disconnected".to_string())
}

#[tauri::command]
pub async fn get_ups_data(state: State<'_, NutState>, ups_name: String) -> Result<UpsData, String> {
    let mut state_val = state.0.lock().await;
    if let Some(client) = state_val.as_mut() {
        match client.get_ups_data(&ups_name).await {
            Ok(data) => Ok(data),
            Err(e) => Err(format!("Failed to get data: {e}")),
        }
    } else {
        Err("Not connected".to_string())
    }
}

#[tauri::command]
pub async fn start_background_polling(
    app: AppHandle,
    state: State<'_, NutState>,
    ups_name: String,
    interval_ms: u64,
) -> Result<(), String> {
    let state_arc = state.0.clone();

    // Spawn a background task
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_millis(interval_ms));
        loop {
            interval.tick().await;

            // Scope for lock
            let data_result = {
                let mut guard = state_arc.lock().await;
                if let Some(client) = guard.as_mut() {
                    client.get_ups_data(&ups_name).await
                } else {
                    Err(crate::nut::client::NutError::ConnectionFailed)
                }
            };

            match data_result {
                Ok(data) => {
                    if let Err(e) = app.emit("ups-update", &data) {
                        eprintln!("Failed to emit ups-update: {e}");
                    }

                    if let Some(tray) = app.tray_by_id("main") {
                        let icon = if data.status.contains("LB") {
                            create_status_icon(239, 68, 68) // Red
                        } else if data.status.contains("OB") {
                            create_status_icon(249, 115, 22) // Orange
                        } else {
                            create_status_icon(34, 197, 94) // Green
                        };
                        let _ = tray.set_icon(Some(icon));
                    }
                }
                Err(_e) => {}
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn trigger_system_stop(action_type: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        let mut cmd = match action_type.as_str() {
            "Shutdown" => {
                let mut c = Command::new("C:\\Windows\\System32\\shutdown.exe");
                c.args(["/s", "/t", "0", "/f"]);
                c
            }
            "Hibernate" => {
                let mut c = Command::new("C:\\Windows\\System32\\shutdown.exe");
                c.arg("/h");
                c
            }
            "Sleep" => {
                let mut c = Command::new("C:\\Windows\\System32\\rundll32.exe");
                c.args(["powrprof.dll,SetSuspendState", "0,1,0"]);
                c
            }
            _ => return Err("Invalid action type".to_string()),
        };

        match cmd.spawn() {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to execute command: {e}")),
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Offline actions only supported on Windows".to_string())
    }
}

#[tauri::command]
pub async fn scan_nut_network(subnet_prefix: String) -> Result<Vec<String>, String> {
    let mut tasks = Vec::new();
    let port = 3493;

    for i in 1..=254 {
        let ip = format!("{}.{}", subnet_prefix, i);
        let addr = format!("{}:{}", ip, port);

        tasks.push(tokio::spawn(async move {
            let timeout = std::time::Duration::from_millis(300);
            match tokio::time::timeout(timeout, tokio::net::TcpStream::connect(&addr)).await {
                Ok(Ok(_)) => Some(ip),
                _ => None,
            }
        }));
    }

    let mut discovered = Vec::new();
    for task in tasks {
        if let Ok(Some(ip)) = task.await {
            discovered.push(ip);
        }
    }

    Ok(discovered)
}

#[tauri::command]
pub async fn list_ups_on_server(host: String, port: u16) -> Result<Vec<String>, String> {
    let mut client = NutClient::new(NutConfig {
        host: host.clone(),
        port,
        username: None,
        password: None,
    });

    match client.connect().await {
        Ok(_) => {
            let result = client.list_ups_names().await;
            let _ = client.disconnect().await;
            match result {
                Ok(names) => Ok(names),
                Err(e) => Err(format!("Failed to list UPS: {e}")),
            }
        }
        Err(e) => Err(format!("Failed to connect to {host}:{port}: {e}")),
    }
}
