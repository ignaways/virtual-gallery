/* Penyimpanan berbasis file JSON — untuk pengembangan lokal tanpa database. */
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export function createFileStore(dir) {
  const galleriesDir = path.join(dir, "galleries");
  const file = id => path.join(galleriesDir, id + ".json");
  let ready;

  return {
    kind: "file",
    init: () => (ready ||= fs.mkdir(galleriesDir, { recursive: true })),

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
    },
  };
}
