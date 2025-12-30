use super::models::NutConfig;
use std::time::Duration;
use thiserror::Error;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
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
    stream: Option<TcpStream>,
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
        self.stream = Some(stream);

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

    pub async fn send_cmd(&mut self, cmd: &str) -> Result<String, NutError> {
        if self.stream.is_none() {
            return Err(NutError::ConnectionFailed);
        }

        let stream = self.stream.as_mut().unwrap();
        let cmd_with_newline = format!("{cmd}\n");
        stream.write_all(cmd_with_newline.as_bytes()).await?;

        // Improved reading logic with timeout and loop
        let mut buffer = [0; 4096];
        let mut response = String::new();

        // We use a simple read loop with timeout to gather data
        // For production, we should parse based on "END LIST" or newline boundaries for single commands
        let timeout_duration = Duration::from_millis(500);

        loop {
            let read_future = stream.read(&mut buffer);
            match tokio::time::timeout(timeout_duration, read_future).await {
                Ok(Ok(0)) => break, // EOF
                Ok(Ok(n)) => {
                    let chunk = String::from_utf8_lossy(&buffer[..n]);
                    response.push_str(&chunk);
                    // simple check to break early if we see end of list or short OK response
                    if response.trim() == "OK" || response.contains("END LIST") {
                        break;
                    }
                }
                Ok(Err(e)) => return Err(NutError::Io(e)),
                Err(_) => break, // Timeout
            }
        }

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
}
