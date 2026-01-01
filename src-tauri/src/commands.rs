use crate::nut::client::NutClient;
use crate::nut::models::{NutConfig, UpsData};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;

use log::{error, info, warn};

// We need a thread-safe wrapper for the client
pub struct NutState(pub Arc<Mutex<Option<NutClient>>>);
pub struct DbState(pub Arc<Mutex<Option<crate::db::NutDB>>>);

#[derive(Default)]
pub struct ShutdownTracker {
    pub pending: bool,
    pub countdown_remaining: u64,
    pub action_type: String,
}

pub struct ShutdownState(pub Arc<Mutex<ShutdownTracker>>);

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

#[derive(serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ShutdownConfig {
    pub enabled: bool,
    pub battery_threshold: u32,
    pub runtime_threshold: u32,
    pub stop_type: String,
    #[serde(rename = "delaySeconds")]
    pub timer_sec: u64,
}

#[tauri::command]
pub async fn start_background_polling(
    app: AppHandle,
    state: State<'_, NutState>,
    db_state: State<'_, DbState>,
    shutdown_state: State<'_, ShutdownState>,
    ups_name: String,
    interval_ms: u64,
    shutdown_config: ShutdownConfig,
) -> Result<(), String> {
    let state_arc = state.0.clone();
    let db_arc = db_state.0.clone();
    let shutdown_arc = shutdown_state.0.clone();

    info!(
        "Starting background polling for {} with interval {}ms",
        ups_name, interval_ms
    );
    info!("Shutdown Config: {:?}", shutdown_config);

    // Spawn a background task
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_millis(interval_ms));
        let mut last_log_time = std::time::Instant::now();
        let mut last_logged_data: Option<UpsData> = None;
        let mut first_run = true;

        loop {
            interval.tick().await;

            // Scope for lock with Auto-Reconnect Watchdog & Timeout
            let data_result = {
                let mut guard = state_arc.lock().await;
                if let Some(client) = guard.as_mut() {
                    // Add timeout to prevent locking for too long
                    match tokio::time::timeout(
                        std::time::Duration::from_secs(2),
                        client.get_ups_data(&ups_name),
                    )
                    .await
                    {
                        Ok(inner_result) => match inner_result {
                            Ok(data) => Ok(data),
                            Err(e) => {
                                warn!("Watchdog: Failed to get data: {}", e);
                                // Attempt reconnect logic
                                match client.connect().await {
                                    Ok(_) => {
                                        info!("Watchdog: Reconnected.");
                                        // Retry once
                                        match tokio::time::timeout(
                                            std::time::Duration::from_secs(2),
                                            client.get_ups_data(&ups_name),
                                        )
                                        .await
                                        {
                                            Ok(Ok(data)) => Ok(data),
                                            _ => {
                                                Err(format!("Fetch failed after reconnect: {}", e))
                                            }
                                        }
                                    }
                                    Err(re_err) => {
                                        error!("Watchdog: Reconnect failed: {}", re_err);
                                        Err(format!("Disconnected: {}", e))
                                    }
                                }
                            }
                        },
                        Err(_) => {
                            error!("Watchdog: UPS data fetch timed out (lock held too long?)");
                            // Force disconnect or just error out?
                            // If we time out, the socket might be stuck.
                            // Ideally we should drop the connection.
                            let _ = client.disconnect().await;
                            Err("Timeout".to_string())
                        }
                    }
                } else {
                    Err("Not connected".to_string())
                }
            };

            match data_result {
                Ok(data) => {
                    if let Err(e) = app.emit("ups-update", &data) {
                        error!("Failed to emit ups-update: {e}");
                    }

                    // --- Shutdown Logic ---
                    if shutdown_config.enabled {
                        let mut sd_guard = shutdown_arc.lock().await;

                        let bat_charge = data.battery_charge.unwrap_or(100.0);
                        let bat_critical = bat_charge < shutdown_config.battery_threshold as f64;

                        let runtime_val = data.battery_runtime.unwrap_or(f64::MAX);
                        let runtime_critical =
                            runtime_val < shutdown_config.runtime_threshold as f64;

                        if bat_critical || runtime_critical {
                            if !sd_guard.pending {
                                info!(
                                    "Shutdown Triggered! Battery: {}%, Runtime: {}s",
                                    bat_charge, runtime_val
                                );
                                sd_guard.pending = true;
                                sd_guard.countdown_remaining = shutdown_config.timer_sec;
                                sd_guard.action_type = shutdown_config.stop_type.clone();
                            }

                            // Emit warning
                            let _ = app.emit("shutdown-warning", sd_guard.countdown_remaining);

                            if sd_guard.countdown_remaining == 0 {
                                info!(
                                    "Countdown reached 0. Executing system stop: {}",
                                    sd_guard.action_type
                                );
                                // Execute
                                let action = sd_guard.action_type.clone();
                                tokio::spawn(async move {
                                    if let Err(e) = trigger_system_stop(action, 0).await {
                                        error!("CRITICAL: Failed to execute system stop: {}", e);
                                    }
                                });
                                sd_guard.pending = false;
                            } else {
                                sd_guard.countdown_remaining = sd_guard
                                    .countdown_remaining
                                    .saturating_sub(interval_ms / 1000);
                            }
                        } else {
                            // Conditions met (Power restored or charged enough)
                            if sd_guard.pending {
                                info!("Power conditions restored. Shutdown cancelled.");
                                sd_guard.pending = false;
                                let _ = app.emit("shutdown-cancelled", ());
                            }
                        }
                    }

                    // Log to DB Logic
                    // "The Digital Observer" Strategy:
                    // 1. Status Change: Log always.
                    // 2. Volatility Velocity: Log if input voltage changes fast (> 0.5V/s).
                    // 3. Load/Battery: Log if change > 5% / 2%.
                    // 4. Heartbeat: Log every 10 minutes (600s) to keep the chart alive during stability.

                    let current_status = data.status.clone();
                    let mut significant_event = false;

                    if let Some(last) = last_logged_data.as_ref() {
                        if last.status != current_status {
                            significant_event = true;
                        } else {
                            // Calculate Volatility Velocity
                            // How much did it change per second?
                            let time_delta = last_log_time.elapsed().as_secs_f64().max(1.0);

                            let v_now = data.input_voltage.unwrap_or(0.0);
                            let v_last = last.input_voltage.unwrap_or(0.0);
                            let v_velocity = (v_now - v_last).abs() / time_delta;

                            // 0.5V per second is a "spike" or "sag" even if small amplitude
                            if v_velocity > 0.5 {
                                significant_event = true;
                            }

                            // Load Change > 5% (Significant load switch)
                            let l_diff =
                                (data.ups_load.unwrap_or(0.0) - last.ups_load.unwrap_or(0.0)).abs();
                            if l_diff > 5.0 {
                                significant_event = true;
                            }

                            // Battery Change > 2% (Charging/Discharging)
                            let b_diff = (data.battery_charge.unwrap_or(0.0)
                                - last.battery_charge.unwrap_or(0.0))
                            .abs();
                            if b_diff > 2.0 {
                                significant_event = true;
                            }
                        }
                    } else {
                        significant_event = true; // First run
                    }

                    let should_log =
                        first_run || last_log_time.elapsed().as_secs() >= 600 || significant_event;

                    if should_log {
                        let db_guard = db_arc.lock().await;
                        if let Some(db) = db_guard.as_ref() {
                            let entry = crate::db::HistoryEntry {
                                id: None,
                                timestamp: std::time::SystemTime::now()
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .unwrap()
                                    .as_secs(),
                                input_voltage: data.input_voltage,
                                output_voltage: data.output_voltage,
                                load_percent: data.ups_load,
                                battery_charge: data.battery_charge,
                                status: data.status.clone(),
                            };
                            if let Err(e) = db.insert_entry(&entry) {
                                error!("Failed to log history: {}", e);
                            } else {
                                last_log_time = std::time::Instant::now();
                                last_logged_data = Some(data.clone());

                                // Prune once a day (approx check)
                                if first_run {
                                    if let Err(e) = db.prune_old_data(365) {
                                        error!("Failed to prune old data: {}", e);
                                    }
                                }
                                first_run = false;
                            }
                        }
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
                Err(_e) => {
                    // Update frontend state ?
                }
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
pub async fn abort_system_stop(shutdown_state: State<'_, ShutdownState>) -> Result<(), String> {
    // Logic: Set pending = false
    {
        let mut guard = shutdown_state.0.lock().await;
        if guard.pending {
            info!("User requested shutdown abort.");
            guard.pending = false;
        }
    }

    #[cfg(target_os = "windows")]
    {
        use windows::Win32::System::Shutdown::AbortSystemShutdownW;

        unsafe {
            let _ = AbortSystemShutdownW(None);
        }
    }
    Ok(())
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

#[tauri::command]
pub async fn get_chart_data(
    db_state: State<'_, DbState>,
    time_range: String,
) -> Result<Vec<crate::db::HistoryEntry>, String> {
    let hours = match time_range.as_str() {
        "1y" => 24 * 365,
        "30d" => 24 * 30,
        "7d" => 24 * 7,
        "24h" => 24,
        "12h" => 12,
        "6h" => 6,
        "1h" => 1,
        _ => 24,
    };

    let guard = db_state.0.lock().await;
    if let Some(db) = guard.as_ref() {
        db.get_history(hours).map_err(|e| e.to_string())
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub async fn get_history_stats(
    db_state: State<'_, DbState>,
    time_range: String,
) -> Result<crate::db::HistoryStats, String> {
    let hours = match time_range.as_str() {
        "1y" => 24 * 365,
        "30d" => 24 * 30,
        "7d" => 24 * 7,
        "24h" => 24,
        "12h" => 12,
        "6h" => 6,
        "1h" => 1,
        _ => 24,
    };

    let guard = db_state.0.lock().await;
    if let Some(db) = guard.as_ref() {
        db.get_history_stats(hours).map_err(|e| e.to_string())
    } else {
        Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub async fn clean_history_data(db_state: State<'_, DbState>) -> Result<usize, String> {
    let guard = db_state.0.lock().await;
    if let Some(db) = guard.as_ref() {
        db.cleanup_history().map_err(|e| e.to_string())
    } else {
        Err("Database not initialized".to_string())
    }
}
