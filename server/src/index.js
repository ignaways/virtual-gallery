/* Server lokal: npm run dev / npm start */
import app, { store, uploads } from "./app.js";
import { config } from "./config.js";

try {
  await store.init();
} catch (e) {
  console.error("Database connection failed:", e.message);
  process.exit(1);
}

app.listen(config.port, () => {
  console.log(`Ruang Sunyi API → http://localhost:${config.port}`);
  console.log(`Storage: ${store.kind}${store.kind === "file" ? ` (${config.dataDir})` : ""} · Uploads: ${uploads.mode}`);
});
