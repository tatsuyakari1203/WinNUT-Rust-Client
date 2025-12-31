# WinNUT Rust Client

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Platform](https://img.shields.io/badge/platform-Windows-lightgrey) ![Status](https://img.shields.io/badge/status-stable-green)

A modern, high-performance desktop client for monitoring UPS (Uninterruptible Power Supply) devices via the NUT (Network UPS Tools) protocol. Built with **Tauri v2** and **React**, focusing on aesthetics, performance, and native Windows integration.

![Application Preview](src-tauri/icons/preview.png)

## ✨ Key Features

- **Real-time Monitoring**: Visualize Input/Output voltage, load, battery charge, and runtime with sub-second latency.
- **Auto Update**: Seamless background updates via GitHub Releases. The app automatically checks for newer versions, downloads, and installs them with a single click.
- **Modern UI**: Sleek, dark-themed interface built with Shadcn/UI and TailwindCSS.
- **Native Integration**:
    - **System Tray**: Quick status overview (Online/On Battery/Low Battery) directly from the taskbar.
    - **Native Shutdown**: Leverages Windows' native shutdown scheduler (`shutdown.exe`) for reliable automation.
    - **Notifications**: Toast alerts for critical power events.
- **Network Discovery**: Automatically scans your local subnet to find active NUT servers.
- **Remote Control**: Send commands to the UPS (Test Battery, Toggle Beeper, etc.) directly from the client.
- **Lightweight**: Written in Rust, utilizing a fraction of the memory compared to Electron alternatives.

## 🛠️ Tech Stack

- **Core**: [Tauri v2](https://v2.tauri.app/) (Rust)
- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [TailwindCSS](https://tailwindcss.com/) + [Shadcn/UI](https://ui.shadcn.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Build Tool**: [Vite](https://vitejs.dev/) + [Bun](https://bun.sh/)
- **Auto Update**: [Tauri Plugin Updater](https://v2.tauri.app/plugin/updater/) + GitHub Releases

## 🚀 Installation

### Download Binary
Go to the [Releases](https://github.com/tatsuyakari1203/WinNUT-Rust-Client/releases) page and download the latest `.msi` installer.

### Prerequisites
- A running **NUT (Network UPS Tools)** server (e.g., on a Raspberry Pi, Synology NAS, or Linux server).
- **Windows 10/11** (x64).

## ⚙️ Configuration

1.  **Connection**:
    - Open Settings (Gear icon).
    - Enter your NUT Server IP, Port (default 3493), Username, and Password.
    - Click **"Test & Connect"**.
2.  **Automation (Shutdown)**:
    - Enable "Automation" in Settings.
    - Set thresholds (e.g., Battery < 30% or Runtime < 120s).
    - Choose Action: **Shutdown**, **Hibernate**, or **Sleep**.
    - When triggered, a native Windows notification will appear with a 15s countdown, allowing you to save work.
3.  **Update**:
    - Open Settings -> Update Tab.
    - Inspect current version and check for updates.

## 💻 Development

### Prerequisites
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [Node.js](https://nodejs.org/) or [Bun](https://bun.sh/)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (for Windows development)

### Setup

```bash
# Clone the repository
git clone https://github.com/tatsuyakari1203/WinNUT-Rust-Client.git
cd WinNUT-Rust-Client

# Install dependencies
bun install

# Run in development mode
bun run tauri dev
```

### Build & Release

To build the application manually:
```bash
bun run tauri build
```

To create a new release (Bump Version -> Tag -> Push -> CI Build):
```bash
# Usage: bun run release <version>
bun run release 0.1.5
```
This script will:
1. Update version in `package.json` and `src-tauri/tauri.conf.json`.
2. Commit changes.
3. Create a git tag.
4. Push to specific tag to trigger GitHub Actions workflow.


## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
