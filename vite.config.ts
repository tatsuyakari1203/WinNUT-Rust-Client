import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Ensure Vite binds to all interfaces and uses a fixed port for Tauri
  server: {
    port: 1420,
    strictPort: true,
    host: true,
  },
  clearScreen: false,
  // 1. prevent vite from obscuring rust errors
  // 2. watch_ignored doesn't appear to perform any actions with the current configuration,
  //    but it's good practice to keep it for future-proofing
  envPrefix: ["VITE_", "TAURI_"],
});
