use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
// use ups_client_lib::nut::{client::NutClient, models::NutConfig};

// We'll reimplement a simple client here to have full control over reading for debugging
struct DebugClient {
    stream: TcpStream,
}

impl DebugClient {
    async fn connect(host: &str, port: u16) -> Result<Self, Box<dyn std::error::Error>> {
        let addr = format!("{host}:{port}");
        let stream = TcpStream::connect(&addr).await?;
        Ok(Self { stream })
    }

    async fn send_cmd(&mut self, cmd: &str) -> Result<String, Box<dyn std::error::Error>> {
        let cmd_with_newline = format!("{cmd}\n");
        self.stream.write_all(cmd_with_newline.as_bytes()).await?;

        // Read with a timeout loop
        let mut buffer = [0; 1024];
        let mut response = String::new();

        loop {
            let read_future = self.stream.read(&mut buffer);
            match tokio::time::timeout(Duration::from_millis(500), read_future).await {
                Ok(Ok(0)) => break, // EOF
                Ok(Ok(n)) => {
                    let chunk = String::from_utf8_lossy(&buffer[..n]);
                    response.push_str(&chunk);
                    // If we see "END LIST" or an error, we might be done.
                    // But for simple "OK" responses, it's harder to know.
                    // For this debug script, 500ms silence is a good enough delimiter.
                }
                Ok(Err(e)) => return Err(Box::new(e)),
                Err(_) => break, // Timeout means we probably got everything
            }
        }

        Ok(response)
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Connecting to 192.168.1.105:3493...");
    let mut client = DebugClient::connect("192.168.1.105", 3493).await?;
    println!("Connected!");

    // Login
    println!("\n--- Login ---");
    println!(
        "Login response: {}",
        client.send_cmd("USERNAME monuser").await?
    );
    println!(
        "Password response: {}",
        client.send_cmd("PASSWORD secret").await?
    );

    // List UPS
    println!("\n--- LIST UPS ---");
    let ups_list = client.send_cmd("LIST UPS").await?;
    println!("{ups_list}");

    // List Vars
    println!("\n--- LIST VAR ups ---");
    let vars = client.send_cmd("LIST VAR ups").await?;
    println!("{vars}");

    Ok(())
}
