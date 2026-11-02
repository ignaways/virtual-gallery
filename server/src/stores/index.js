import { config } from "../config.js";
import { HttpError } from "../errors.js";
import { createFileStore } from "./fileStore.js";
import { createSqlStore } from "./sqlStore.js";

export function createStore() {
  if (config.databaseUrl) return createSqlStore(config.databaseUrl);
  if (config.onVercel) {
    // Sistem file Vercel hanya-baca; tanpa database server tidak bisa menyimpan apa pun.
    const fail = () => Promise.reject(new HttpError(503, "notConfigured", "DATABASE_URL is not set"));
    return { kind: "none", init: fail, get: fail, put: fail, remove: fail };
  }
  return createFileStore(config.dataDir);
}
