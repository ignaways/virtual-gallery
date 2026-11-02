/*
 * Penyimpanan berbasis file: satu JSON per galeri + satu folder unggahan per galeri.
 * Cukup untuk portofolio atau pameran kecil. Untuk skala lebih besar, ganti modul ini
 * dengan database (PostgreSQL, SQL Server, dll.) — antarmukanya cukup get/put/remove.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export function createStore(dir) {
  const galleriesDir = path.join(dir, "galleries");
  const uploadsDir = path.join(dir, "uploads");
  const file = id => path.join(galleriesDir, id + ".json");

  return {
    uploadsDir,
    uploadDirFor: id => path.join(uploadsDir, id),

    async init() {
      await fs.mkdir(galleriesDir, { recursive: true });
      await fs.mkdir(uploadsDir, { recursive: true });
    },

    async get(id) {
      try {
        return JSON.parse(await fs.readFile(file(id), "utf8"));
      } catch (e) {
        if (e.code === "ENOENT") return null;
        throw e;
      }
    },

    /* Tulis ke file sementara lalu rename, supaya file tidak pernah setengah tertulis */
    async put(record) {
      const tmp = file(record.id) + "." + crypto.randomBytes(4).toString("hex") + ".tmp";
      await fs.writeFile(tmp, JSON.stringify(record));
      await fs.rename(tmp, file(record.id));
    },

    async remove(id) {
      await fs.rm(file(id), { force: true });
      await fs.rm(path.join(uploadsDir, id), { recursive: true, force: true });
    },
  };
}
