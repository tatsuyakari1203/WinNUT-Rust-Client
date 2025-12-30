use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NutConfig {
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpsData {
    pub status: String,
    pub battery_charge: Option<f64>,
    pub battery_runtime: Option<f64>,
    pub battery_voltage: Option<f64>,
    pub input_voltage: Option<f64>,
    pub input_frequency: Option<f64>,
    pub output_voltage: Option<f64>,
    pub output_frequency: Option<f64>,
    pub ups_load: Option<f64>,
    pub ups_realpower_nominal: Option<f64>,
    pub power_watts: Option<f64>,
    pub ups_mfr: Option<String>,
    pub ups_model: Option<String>,
    pub ups_serial: Option<String>,
    pub ups_firmware: Option<String>,
    pub ups_type: Option<String>,
    pub ups_beeper_status: Option<String>,
    pub battery_type: Option<String>,
    pub input_voltage_fault: Option<f64>,
    pub output_voltage_nominal: Option<f64>,
    pub output_frequency_nominal: Option<f64>,
    pub driver_name: Option<String>,
    pub driver_version: Option<String>,

    // Phase 8: Standardization Extensions
    pub ambient_temp: Option<f64>,
    pub output_current: Option<f64>,
    pub battery_current: Option<f64>,
    pub ups_realpower: Option<f64>,
    pub extended_vars: std::collections::HashMap<String, String>,
}

impl UpsData {
    pub fn calculate_power(&mut self) {
        // If we have direct power reporting, use it (parsed elsewhere).
        // If not, calculate from load % and nominal power.
        if self.power_watts.is_none() {
            if let (Some(load), Some(nominal_power)) = (self.ups_load, self.ups_realpower_nominal) {
                let watts = nominal_power * (load / 100.0);
                self.power_watts = Some(watts);
            } else {
                // Fallback: Estimate from VA if we had it, but we only have Real Power Nominal in the logs provided.
                // If the user's UPS provides 'ups.power.nominal' (VA), we could use power factor.
                // For now, if we can't calculate, we leave it None.
            }
        }
    }
}
