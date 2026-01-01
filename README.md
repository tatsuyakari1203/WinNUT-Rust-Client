<div align="center">
  <img src="assets/dashboard-v0.1.5.png" alt="WinNUT Client Dashboard" width="100%" />

  <h1 align="center">WinNUT Rust Client</h1>

  <p align="center">
    <strong>A modern, high-performance desktop client for monitoring UPS devices via NUT.</strong>
  </p>

  <p align="center">
    <a href="https://github.com/tatsuyakari1203/WinNUT-Rust-Client/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
    </a>
    <img src="https://img.shields.io/badge/platform-Windows-lightgrey" alt="Platform" />
    <img src="https://img.shields.io/badge/status-stable-green" alt="Status" />
  </p>

  <p align="center">
    Built with <b>Tauri v2</b> and <b>React</b>, focusing on aesthetics, performance, and native Windows integration.<br>
    Say goodbye to clunky, outdated monitoring tools.
  </p>
</div>

<br />

## ✨ Features at a Glance

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>📈 Advanced Analytics</h3>
      <p>Track your power metrics with precision. Visualize Input/Output voltage, load, battery charge, and runtime with sub-second latency.</p>
      <p>Interactive, zoomable charts let you analyze historical trends to understand your power usage patterns over time.</p>
    </td>
    <td width="50%">
      <img src="assets/history-v0.1.5.png" alt="Historical Data Graph" width="100%" />
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="assets/settings-themes-v0.1.5.png" alt="Theme Selection" width="100%" />
    </td>
    <td width="50%" valign="top">
      <h3>🎨 Beautiful Theming</h3>
      <p>Personalize your experience with a rich collection of themes. Whether you prefer the icy cool of <b>Nord</b>, the vibrancy of <b>Dracula</b>, or the classic <b>Catppuccin</b>, we have your style covered.</p>
      <ul>
        <li><b>Catppuccin</b> 🐱</li>
        <li><b>Dracula</b> 🧛</li>
        <li><b>Nord</b> ❄️</li>
        <li><b>Monokai</b> 🎨</li>
        <li><b>GitHub Dark</b> 🐙</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>⚡ Powerful Control & Native Integration</h3>
      <p>More than just a monitor.</p>
      <ul>
        <li><b>Remote Control</b>: Send commands (Test Battery, Toggle Beeper) directly to your UPS.</li>
        <li><b>Native Shutdown</b>: Safely shuts down your Windows PC using native schedulers when battery is critical.</li>
        <li><b>System Tray</b>: Quick status at a glance.</li>
      </ul>
    </td>
    <td width="50%">
      <img src="assets/remote-control-v0.1.5.png" alt="Remote Control Panel" width="100%" />
    </td>
  </tr>
</table>

<br />

## 🚀 Installation

### Download Binary
Go to the [Releases](https://github.com/tatsuyakari1203/WinNUT-Rust-Client/releases) page and download the latest `.msi` installer.

### Prerequisites
- A running **NUT (Network UPS Tools)** server (e.g., on a Raspberry Pi, Synology NAS, or Linux server).
- **Windows 10/11** (x64).

---

## ⚙️ Configuration Guide

<details>
<summary><strong>Click to expand configuration steps</strong></summary>

1.  **Connection**:
    - Open Settings (Gear icon).
    - Enter your NUT Server IP, Port (default 3493), Username, and Password.
    - Click **"Test & Connect"**.
2.  **Automation (Shutdown)**:
    - Enable "Automation" in Settings.
    - Set thresholds (e.g., Battery < 30% or Runtime < 120s).
    - Choose Action: **Shutdown**, **Hibernate**, or **Sleep**.
    - When triggered, a native Windows notification will appear with a 15s countdown.
3.  **Update**:
    - Open Settings -> Update Tab to check for the latest features.

</details>

<br />

## 🛠️ Tech Stack

<div align="center">
  <img src="https://img.shields.io/badge/Tauri-2.0-FEC00F?style=for-the-badge&logo=tauri&logoColor=black" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
</div>

<br />

## 💻 Development

If you want to build from source or contribute:

```bash
# Clone
git clone https://github.com/tatsuyakari1203/WinNUT-Rust-Client.git
cd WinNUT-Rust-Client

# Install
bun install

# Run Dev
bun run tauri dev
```

## 🤝 Contributing & License

Contributions are welcome! Please submit a Pull Request.
Distributed under the **MIT License**.
