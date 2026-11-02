import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API = process.env.API_URL || "http://localhost:3001";

export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
    // permintaan ke /api dan /uploads diteruskan ke backend Express
    proxy: { "/api": API, "/uploads": API },
  },
  build: { chunkSizeWarningLimit: 1000 },
});
