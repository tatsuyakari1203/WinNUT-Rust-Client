use crate::nut::client::NutClient;
use crate::nut::models::{NutConfig, UpsData};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;

// We need a thread-safe wrapper for the client
pub struct NutState(pub Arc<Mutex<Option<NutClient>>>);

#[tauri::command]
pub async fn connect_nut(state: State<'_, NutState>, config: NutConfig) -> Result<String, String> {
    let mut client = NutClient::new(config);
    match client.connect().await {
        Ok(_) => {
            let mut state_val = state.0.lock().await;
            *state_val = Some(client);
            Ok("Connected".to_string())
        }
        Err(e) => Err(format!("Connection failed: {}", e)),
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
            Err(e) => Err(format!("Failed to get data: {}", e)),
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
                    // Not connected, maybe break loop or just wait?
                    // For now, we continue waiting for connection
                    Err(crate::nut::client::NutError::ConnectionFailed)
                }
            };

            match data_result {
                Ok(data) => {
                    if let Err(e) = app.emit("ups-update", &data) {
                        eprintln!("Failed to emit ups-update: {}", e);
                    }
                }
                Err(_e) => {
                    // eprintln!("Polling error: {}", e);
                }
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
                let mut c = Command::new("shutdown");
                c.args(&["/s", "/t", "0", "/f"]);
                c
            }
            "Hibernate" => {
                let mut c = Command::new("shutdown");
                c.arg("/h");
                c
            }
            "Sleep" => {
                let mut c = Command::new("rundll32.exe");
                c.args(&["powrprof.dll,SetSuspendState", "0,1,0"]);
                c
            }
            _ => return Err("Invalid action type".to_string()),
        };

        match cmd.spawn() {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to execute command: {}", e)),
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Offline actions only supported on Windows".to_string())
    }
}
