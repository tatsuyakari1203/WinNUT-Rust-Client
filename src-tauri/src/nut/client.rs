use super::models::NutConfig;

use thiserror::Error;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;

#[derive(Error, Debug)]
pub enum NutError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Connection failed")]
    ConnectionFailed,
    #[error("Authentication failed")]
    AuthFailed,
    #[error("Command failed: {0}")]
    CommandFailed(String),
}

pub struct NutClient {
    config: NutConfig,
    stream: Option<BufReader<TcpStream>>,
}

impl NutClient {
    pub fn new(config: NutConfig) -> Self {
        Self {
            config,
            stream: None,
        }
    }

    pub async fn connect(&mut self) -> Result<(), NutError> {
        let addr = format!("{}:{}", self.config.host, self.config.port);
        let stream = TcpStream::connect(&addr).await?;
        // Wrap the stream in a buffered reader for efficient line-by-line reading
        self.stream = Some(BufReader::new(stream));

        if let Some(username) = &self.config.username {
            self.send_cmd(&format!("USERNAME {username}")).await?;
            if let Some(password) = &self.config.password {
                self.send_cmd(&format!("PASSWORD {password}")).await?;
            }
        }

        Ok(())
    }

    pub async fn disconnect(&mut self) -> Result<(), NutError> {
        if let Some(mut stream) = self.stream.take() {
            let _ = stream.write_all(b"LOGOUT\n").await;
            let _ = stream.shutdown().await;
        }
        Ok(())
    }

    /// Sends a command to the NUT server and reads the response.
    /// This function acts intelligently based on the command content.
    /// If the response implies a list (e.g. `BEGIN LIST`), it reads until `END LIST`.
    pub async fn send_cmd(&mut self, cmd: &str) -> Result<String, NutError> {
        if self.stream.is_none() {
            return Err(NutError::ConnectionFailed);
        }

        let reader = self.stream.as_mut().unwrap();
        let cmd_with_newline = format!("{cmd}\n");
        reader.write_all(cmd_with_newline.as_bytes()).await?;
        reader.flush().await?;

        let mut response = String::new();
        let mut line = String::new();

        // 1. Read the first line to determine response type
        let bytes_read = reader.read_line(&mut line).await?;
        if bytes_read == 0 {
            return Err(NutError::ConnectionFailed); // EOF
        }

        response.push_str(&line);

        // 2. Check if this is a multi-line list response
        // NUT protocol lists start with "BEGIN LIST ..."
        if line.starts_with("BEGIN LIST") {
            loop {
                line.clear();
                let n = reader.read_line(&mut line).await?;
                if n == 0 {
                    break; // Unexpected EOF inside list
                }
                response.push_str(&line);
                if line.starts_with("END LIST") {
                    break;
                }
            }
        }
        // Note: Some errors might be multi-line in rare cases, but standard NUT is mostly single line
        // or strictly enveloped lists. We stick to this robust envelope check.

        Ok(response)
    }

    pub async fn get_ups_data(
        &mut self,
        ups_name: &str,
    ) -> Result<super::models::UpsData, NutError> {
        let cmd = format!("LIST VAR {ups_name}");
        let response = self.send_cmd(&cmd).await?;
        Ok(super::parser::parse_list_vars(&response))
    }

    pub async fn list_ups_names(&mut self) -> Result<Vec<String>, NutError> {
        let response = self.send_cmd("LIST UPS").await?;
        let mut names = Vec::new();
        for line in response.lines() {
            if line.starts_with("UPS ") {
                // Format: UPS <name> "<description>"
                let parts: Vec<&str> = line.splitn(3, ' ').collect();
                if parts.len() >= 2 {
                    names.push(parts[1].to_string());
                }
            }
        }
        Ok(names)
    }

    pub async fn list_ups_commands(&mut self, ups_name: &str) -> Result<Vec<String>, NutError> {
        let response = self.send_cmd(&format!("LIST CMD {ups_name}")).await?;
        let mut cmds = Vec::new();
        for line in response.lines() {
            if line.starts_with("CMD ") {
                // Format: CMD <ups> <command>
                let parts: Vec<&str> = line.splitn(3, ' ').collect();
                if parts.len() >= 3 {
                    cmds.push(parts[2].to_string());
                }
            }
        }
        Ok(cmds)
    }

    pub async fn run_instant_cmd(&mut self, ups_name: &str, cmd: &str) -> Result<(), NutError> {
        let resp = self.send_cmd(&format!("INSTCMD {ups_name} {cmd}")).await?;
        if resp.trim() == "OK" {
            Ok(())
        } else {
            Err(NutError::CommandFailed(resp))
        }
    }
}
