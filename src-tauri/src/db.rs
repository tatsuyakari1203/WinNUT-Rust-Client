use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: Option<u64>,
    pub timestamp: u64,
    pub input_voltage: Option<f64>,
    pub output_voltage: Option<f64>,
    pub load_percent: Option<f64>,
    pub battery_charge: Option<f64>,
    pub status: String,
}

pub struct NutDB {
    path: String,
}

impl NutDB {
    pub fn new<P: AsRef<Path>>(app_data_dir: P) -> Self {
        let path = app_data_dir.as_ref().join("history.db");
        Self {
            path: path.to_string_lossy().to_string(),
        }
    }

    pub fn init(&self) -> Result<()> {
        let conn = Connection::open(&self.path)?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY,
                timestamp INTEGER NOT NULL,
                input_voltage REAL,
                output_voltage REAL,
                load_percent REAL,
                battery_charge REAL,
                status TEXT
            )",
            [],
        )?;
        Ok(())
    }

    pub fn insert_entry(&self, entry: &HistoryEntry) -> Result<()> {
        let conn = Connection::open(&self.path)?;
        conn.execute(
            "INSERT INTO history (timestamp, input_voltage, output_voltage, load_percent, battery_charge, status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                entry.timestamp,
                entry.input_voltage,
                entry.output_voltage,
                entry.load_percent,
                entry.battery_charge,
                entry.status
            ],
        )?;
        Ok(())
    }

    pub fn get_history(&self, time_range_hours: u64) -> Result<Vec<HistoryEntry>> {
        let conn = Connection::open(&self.path)?;
        let start_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
            - (time_range_hours * 3600);

        let mut stmt = conn.prepare(
            "SELECT id, timestamp, input_voltage, output_voltage, load_percent, battery_charge, status
             FROM history
             WHERE timestamp >= ?1
             ORDER BY timestamp ASC",
        )?;

        let entry_iter = stmt.query_map(params![start_time], |row| {
            Ok(HistoryEntry {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                input_voltage: row.get(2)?,
                output_voltage: row.get(3)?,
                load_percent: row.get(4)?,
                battery_charge: row.get(5)?,
                status: row.get(6)?,
            })
        })?;

        let mut entries = Vec::new();
        for entry in entry_iter {
            entries.push(entry?);
        }
        Ok(entries)
    }

    pub fn prune_old_data(&self, days_to_keep: u64) -> Result<()> {
        let conn = Connection::open(&self.path)?;
        let cutoff = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
            - (days_to_keep * 24 * 3600);

        conn.execute("DELETE FROM history WHERE timestamp < ?1", params![cutoff])?;
        Ok(())
    }

    pub fn get_history_stats(&self, time_range_hours: u64) -> Result<HistoryStats> {
        let conn = Connection::open(&self.path)?;
        let start_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
            - (time_range_hours * 3600);

        // Min, Max, Avg for Voltage, Load, Battery
        // COALESCE(..., 0.0) is not ideal if it's NULL, but we want to ignore NULLs in agg functions anyway.
        // SQLite's AVG/MIN/MAX ignore NULLs automatically.
        let mut stmt = conn.prepare(
            "SELECT
                MIN(input_voltage), MAX(input_voltage), AVG(input_voltage),
                MIN(output_voltage), MAX(output_voltage), AVG(output_voltage),
                MAX(load_percent), AVG(load_percent),
                MIN(battery_charge), AVG(battery_charge),
                COUNT(*)
             FROM history
             WHERE timestamp >= ?1",
        )?;

        let stats_row = stmt.query_row(params![start_time], |row| {
            // We need to handle potential NULLs if no data
            let min_in: Option<f64> = row.get(0)?;
            let max_in: Option<f64> = row.get(1)?;
            let avg_in: Option<f64> = row.get(2)?;
            let min_out: Option<f64> = row.get(3)?;
            let max_out: Option<f64> = row.get(4)?;
            let avg_out: Option<f64> = row.get(5)?;
            let max_load: Option<f64> = row.get(6)?;
            let avg_load: Option<f64> = row.get(7)?;
            let min_bat: Option<f64> = row.get(8)?;
            let avg_bat: Option<f64> = row.get(9)?;
            let count: i64 = row.get(10)?;

            Ok(HistoryStats {
                min_input_voltage: min_in.unwrap_or(0.0),
                max_input_voltage: max_in.unwrap_or(0.0),
                avg_input_voltage: avg_in.unwrap_or(0.0),
                min_output_voltage: min_out.unwrap_or(0.0),
                max_output_voltage: max_out.unwrap_or(0.0),
                avg_output_voltage: avg_out.unwrap_or(0.0),
                max_load: max_load.unwrap_or(0.0),
                avg_load: avg_load.unwrap_or(0.0),
                min_battery: min_bat.unwrap_or(0.0),
                avg_battery: avg_bat.unwrap_or(0.0),
                data_points: count,
                outages: 0, // Calculated separately
            })
        })?;

        // Count outages (status doesn't contain OL or contains OB)
        let mut count_stmt = conn.prepare(
            "SELECT COUNT(*) FROM history
             WHERE timestamp >= ?1
             AND (status NOT LIKE '%OL%' OR status LIKE '%OB%')",
        )?;
        let outages: i64 = count_stmt
            .query_row(params![start_time], |row| row.get(0))
            .unwrap_or(0);

        let mut final_stats = stats_row;
        final_stats.outages = outages;

        Ok(final_stats)
    }

    pub fn cleanup_history(&self) -> Result<usize> {
        let conn = Connection::open(&self.path)?;

        // CLEANUP STRATEGY:
        // 1. Retroactively enforce "Smart Logging" (5-minute heartbeat).
        //    We keep only ONE 'OL' (Normal) record for every 5-minute window (300s).
        //    This effectively reduces high-frequency logs (e.g. 1s or 1min) to 5min.
        //    We NEVER delete non-OL records (warnings, outages, etc).

        let deleted = conn.execute(
            "DELETE FROM history
             WHERE status LIKE '%OL%'
             AND id NOT IN (
                SELECT MIN(id)
                FROM history
                WHERE status LIKE '%OL%'
                GROUP BY timestamp / 300
             )",
            [],
        )?;

        Ok(deleted)
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HistoryStats {
    pub min_input_voltage: f64,
    pub max_input_voltage: f64,
    pub avg_input_voltage: f64,
    pub min_output_voltage: f64,
    pub max_output_voltage: f64,
    pub avg_output_voltage: f64,
    pub max_load: f64,
    pub avg_load: f64,
    pub min_battery: f64,
    pub avg_battery: f64,
    pub data_points: i64,
    pub outages: i64,
}
