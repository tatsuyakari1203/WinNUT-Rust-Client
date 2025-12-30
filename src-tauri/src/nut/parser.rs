use crate::nut::models::UpsData;
use std::collections::HashMap;

pub fn parse_list_vars(response: &str) -> UpsData {
    let mut data = UpsData::default();
    let mut vars = HashMap::new();

    for line in response.lines() {
        if line.starts_with("VAR ups ") {
            // Format: VAR ups <key> "<value>"
            // Example: VAR ups battery.charge "100"
            let parts: Vec<&str> = line.splitn(4, ' ').collect();
            if parts.len() >= 4 {
                let key = parts[2];
                let value_raw = parts[3];
                // Remove quotes
                let value = value_raw.trim_matches('"');
                vars.insert(key, value);

                // Map to struct
                match key {
                    "battery.charge" => data.battery_charge = value.parse().ok(),
                    "battery.runtime" => data.battery_runtime = value.parse().ok(),
                    "battery.voltage" => data.battery_voltage = value.parse().ok(),
                    "battery.type" => data.battery_type = Some(value.to_string()),
                    "input.voltage" => data.input_voltage = value.parse().ok(),
                    "input.voltage.fault" => data.input_voltage_fault = value.parse().ok(),
                    "input.frequency" => data.input_frequency = value.parse().ok(),
                    "output.voltage" => data.output_voltage = value.parse().ok(),
                    "output.voltage.nominal" => data.output_voltage_nominal = value.parse().ok(),
                    "output.frequency" => data.output_frequency = value.parse().ok(),
                    "output.frequency.nominal" => {
                        data.output_frequency_nominal = value.parse().ok()
                    }
                    "ups.load" => data.ups_load = value.parse().ok(),
                    "ups.status" => data.status = value.to_string(),
                    "ups.realpower.nominal" => data.ups_realpower_nominal = value.parse().ok(),
                    "ups.mfr" => data.ups_mfr = Some(value.to_string()),
                    "ups.model" => data.ups_model = Some(value.to_string()),
                    "ups.serial" => data.ups_serial = Some(value.to_string()),
                    "ups.firmware" => data.ups_firmware = Some(value.to_string()),
                    "ups.type" => data.ups_type = Some(value.to_string()),
                    "ups.beeper.status" => data.ups_beeper_status = Some(value.to_string()),
                    "driver.name" => data.driver_name = Some(value.to_string()),
                    "driver.version" => data.driver_version = Some(value.to_string()),
                    _ => {}
                }
            }
        }
    }

    // Auto-calculate power if missing
    data.calculate_power();

    data
}
