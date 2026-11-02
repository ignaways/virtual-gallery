import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* Baca .env di root proyek bila ada (lokal). Di Vercel, variabel datang dari dashboard. */
for (const file of [path.join(root, "..", ".env"), path.join(root, ".env")]) {
  try { process.loadEnvFile(file); } catch (_) {}
}
const onVercel = !!process.env.VERCEL;

export const config = {
  onVercel,
  port: Number(process.env.PORT) || 3001,
  /* Postgres (Neon atau lokal). Kosong = simpan galeri sebagai file JSON di dataDir. */
  databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || "",
  /* Token Vercel Blob. Kosong = unggahan disimpan di disk (dataDir/uploads). */
  blobToken: process.env.BLOB_READ_WRITE_TOKEN || "",
  dataDir: process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, "data"),
  clientDist: path.resolve(root, "..", "client", "dist"),
  /* Vercel Functions menolak body di atas 4,5 MB */
  maxBody: onVercel ? "4mb" : "12mb",
  maxImage: 8 * 1024 * 1024,
  maxModel: 25 * 1024 * 1024,
};
