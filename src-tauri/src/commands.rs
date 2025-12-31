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

#[cfg(target_os = "windows")]
fn acquire_shutdown_privilege() -> Result<(), String> {
    use windows::Win32::Foundation::{FALSE, HANDLE, LUID};
    use windows::Win32::Security::{
        AdjustTokenPrivileges, LookupPrivilegeValueW, LUID_AND_ATTRIBUTES, SE_PRIVILEGE_ENABLED,
        SE_SHUTDOWN_NAME, TOKEN_ADJUST_PRIVILEGES, TOKEN_PRIVILEGES, TOKEN_QUERY,
    };
    use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

    unsafe {
        let mut token: HANDLE = HANDLE::default();
        if OpenProcessToken(
            GetCurrentProcess(),
            TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY,
            &mut token,
        )
        .is_err()
        {
            return Err("Failed to open process token".to_string());
        }

        let mut luid = LUID::default();
        if LookupPrivilegeValueW(None, SE_SHUTDOWN_NAME, &mut luid).is_err() {
            return Err("Failed to lookup privilege".to_string());
        }

        let tp = TOKEN_PRIVILEGES {
            PrivilegeCount: 1,
            Privileges: [LUID_AND_ATTRIBUTES {
                Luid: luid,
                Attributes: SE_PRIVILEGE_ENABLED,
            }],
        };

        if AdjustTokenPrivileges(token, FALSE, Some(&tp), 0, None, None).is_err() {
            return Err("Failed to adjust token privileges".to_string());
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn trigger_system_stop(action_type: String, delay_sec: u64) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use windows::core::{HSTRING, PCWSTR};
        use windows::Win32::Foundation::{BOOLEAN, FALSE, TRUE};
        use windows::Win32::System::Power::SetSuspendState;
        use windows::Win32::System::Shutdown::{
            InitiateSystemShutdownExW, SHTDN_REASON_FLAG_PLANNED, SHTDN_REASON_MAJOR_OTHER,
            SHTDN_REASON_MINOR_OTHER,
        };

        // Try to acquire permissions first
        if let Err(e) = acquire_shutdown_privilege() {
            eprintln!("Warning: Could not acquire shutdown privilege: {}", e);
        }

        match action_type.as_str() {
            "Shutdown" => unsafe {
                let msg = HSTRING::from("UPS Shutdown Triggered");
                let reason =
                    SHTDN_REASON_MAJOR_OTHER | SHTDN_REASON_MINOR_OTHER | SHTDN_REASON_FLAG_PLANNED;

                // InitiateSystemShutdownExW(machine, message, timeout, force_apps, reboot, reason)
                if InitiateSystemShutdownExW(
                    None,
                    PCWSTR::from_raw(msg.as_ptr()),
                    delay_sec as u32,
                    TRUE,  // Force apps closed
                    FALSE, // Reboot? No, Shutdown
                    reason,
                )
                .is_err()
                {
                    return Err("Failed to initiate system shutdown".to_string());
                }
                Ok(())
            },
            "Hibernate" => unsafe {
                // SetSuspendState uses BOOLEAN (u8), not BOOL (i32). TRUE/FALSE are BOOL.
                if SetSuspendState(BOOLEAN(1), BOOLEAN(0), BOOLEAN(0)).as_bool() {
                    Ok(())
                } else {
                    Err("Failed to trigger Hibernate".to_string())
                }
            },
            "Sleep" => unsafe {
                // Hibernate = FALSE means Sleep
                if SetSuspendState(BOOLEAN(0), BOOLEAN(0), BOOLEAN(0)).as_bool() {
                    Ok(())
                } else {
                    Err("Failed to trigger Sleep".to_string())
                }
            },
            _ => Err("Invalid action type".to_string()),
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Offline actions only supported on Windows".to_string())
    }
}

#[tauri::command]
pub async fn abort_system_stop() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::System::Shutdown::AbortSystemShutdownW;

        unsafe {
            if AbortSystemShutdownW(None).is_err() {
                // If no shutdown is in progress, this errors, which is fine to ignore or report
                // But for the user interface, we might want to know.
                // However, standard behavior is usually silent ignore if nothing to abort.
                // Let's check the error code if strictly needed, but roughly:
                return Err("Failed to abort shutdown (maybe none in progress?)".to_string());
            }
        }
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(())
    }
}

#[tauri::command]
pub async fn scan_nut_network(subnet_prefix: String) -> Result<Vec<String>, String> {
    use futures::stream::{self, StreamExt};
    use std::time::Duration;
    use tokio::net::TcpStream;

    let port = 3493;
    // Limit concurrent scans to 20 to avoid firewall/OS resource issues
    const CONCURRENCY_LIMIT: usize = 20;
    const TIMEOUT_MS: u64 = 400; // Slightly increased timeout for reliability

    // Create a stream of IPs from 1 to 254
    let ips = stream::iter(1..=254).map(|i| format!("{}.{}", subnet_prefix, i));

    // Process the stream with bounded concurrency
    let discovered: Vec<String> = ips
        .map(|ip| async move {
            let addr = format!("{}:{}", ip, port);
            match tokio::time::timeout(Duration::from_millis(TIMEOUT_MS), TcpStream::connect(addr))
                .await
            {
                Ok(Ok(_)) => Some(ip),
                _ => None,
            }
        })
        .buffer_unordered(CONCURRENCY_LIMIT)
        .filter_map(|res| async move { res }) // Filter out Nones
        .collect()
        .await;

    // Sort IP addresses for nicer UI display (string sort is okay-ish for IPs, but numeric is better)
    // For simplicity, we just return the vector, React can sort or we sort lexically.
    // Let's do a simple lexical sort here.
    let mut final_list = discovered;
    final_list.sort_by(|a, b| {
        let a_parts: Vec<u8> = a.split('.').filter_map(|s| s.parse().ok()).collect();
        let b_parts: Vec<u8> = b.split('.').filter_map(|s| s.parse().ok()).collect();
        a_parts.cmp(&b_parts)
    });

    Ok(final_list)
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

#[tauri::command]
pub async fn list_ups_commands(
    state: State<'_, NutState>,
    ups_name: String,
) -> Result<Vec<String>, String> {
    let mut state_val = state.0.lock().await;
    if let Some(client) = state_val.as_mut() {
        match client.list_ups_commands(&ups_name).await {
            Ok(cmds) => Ok(cmds),
            Err(e) => Err(format!("Failed to list commands: {e}")),
        }
    } else {
        Err("Not connected".to_string())
    }
}

#[tauri::command]
pub async fn run_ups_command(
    state: State<'_, NutState>,
    ups_name: String,
    command: String,
) -> Result<(), String> {
    let mut state_val = state.0.lock().await;
    if let Some(client) = state_val.as_mut() {
        match client.run_instant_cmd(&ups_name, &command).await {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Command failed: {e}")),
        }
    } else {
        Err("Not connected".to_string())
    }
}
