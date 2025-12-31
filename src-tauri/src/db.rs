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
}
