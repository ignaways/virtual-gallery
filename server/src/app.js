/*
 * Aplikasi Express. Diekspor apa adanya untuk Vercel (api/index.js),
 * dan dijalankan dengan app.listen() di src/index.js untuk lokal.
 */
import express from "express";
import multer from "multer";
import path from "node:path";
import { existsSync } from "node:fs";
import { config } from "./config.js";
import { createStore } from "./stores/index.js";
import { createUploads } from "./uploads/index.js";
import { galleryRouter } from "./routes/galleries.js";

export const store = createStore();
export const uploads = createUploads();

const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  next();
});

app.get("/api/health", async (req, res, next) => {
  try {
    await store.init();
    res.set("Cache-Control", "no-store").json({ ok: true, storage: store.kind, uploads: uploads.mode });
  } catch (e) {
    next(e);
  }
});
app.use("/api/galleries", galleryRouter(store, uploads));
app.use("/api", (req, res) => res.status(404).json({ error: "unknownApi", message: "Unknown API route" }));

uploads.mount(app);

/* Lokal/produksi non-Vercel: sajikan hasil build frontend, termasuk rute /g/:id. Di Vercel, ini ditangani CDN. */
if (!config.onVercel && existsSync(config.clientDist)) {
  app.use(express.static(config.clientDist, { index: false, maxAge: "1h" }));
  app.get("*", (req, res) => res.sendFile(path.join(config.clientDist, "index.html")));
}

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const big = err.code === "LIMIT_FILE_SIZE";
    return res.status(big ? 413 : 400).json({ error: big ? "fileTooLarge" : "invalidUpload", message: err.message });
  }
  if (err.type === "entity.too.large") return res.status(413).json({ error: "bodyTooLarge", message: "Request body too large" });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "badJson", message: "Invalid JSON" });
  const status = err.status || err.statusCode;
  if (status && status < 500) return res.status(status).json({ error: err.code || "badRequest", message: err.message, params: err.params });
  if (err.code === "notConfigured") return res.status(503).json({ error: "notConfigured", message: err.message });
  console.error(err);
  res.status(500).json({ error: "server", message: "Internal server error" });
});

export default app;
