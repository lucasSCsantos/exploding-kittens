import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist/client",
  },
  server: {
    // Dev only: the client's `io()` still connects same-origin (no hard-coded URL), Vite just
    // forwards that one path to the separate `tsx watch` server process. In production Express
    // serves both the client and Socket.IO from the same origin directly.
    proxy: {
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true,
      },
    },
  },
});
