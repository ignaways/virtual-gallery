/* Unggahan ke disk lokal (multer) — dipakai saat BLOB_READ_WRITE_TOKEN tidak di-set. */
import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import { config } from "../config.js";
import { HttpError } from "../errors.js";
import { sniff } from "./sniff.js";

async function readHead(file) {
  const fh = await fs.open(file, "r");
  try {
    const b = Buffer.alloc(12);
    await fh.read(b, 0, 12, 0);
    return b;
  } finally {
    await fh.close();
  }
}

export function createLocalUploads(dataDir) {
  const uploadsDir = path.join(dataDir, "uploads");
  const multerUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const dir = path.join(uploadsDir, req.gallery.id);
        fs.mkdir(dir, { recursive: true }).then(() => cb(null, dir), cb);
      },
      filename: (req, file, cb) => cb(null, crypto.randomBytes(9).toString("base64url") + ".tmp"),
    }),
    limits: { fileSize: config.maxModel, files: 1, fields: 4 },
  });

  return {
    mode: "local",

    mount(app) {
      app.use("/uploads", express.static(uploadsDir, {
        maxAge: "30d",
        immutable: true,
        fallthrough: false,
        setHeaders: (res, file) => { if (file.endsWith(".glb")) res.set("Content-Type", "model/gltf-binary"); },
      }));
    },

    routes(router, { load, auth }) {
      router.post("/:id/uploads", load, auth, multerUpload.single("file"), async (req, res, next) => {
        const f = req.file;
        try {
          if (!f) throw new HttpError(400, "noFile", "No file was sent");
          const kind = sniff(await readHead(f.path));
          if (!kind) throw new HttpError(415, "unsupportedFile", "Unsupported file type");
          if (kind !== "glb" && f.size > config.maxImage) throw new HttpError(413, "imageTooLarge", "Image is larger than 8 MB");
          const name = path.basename(f.filename, ".tmp") + "." + kind;
          await fs.rename(f.path, path.join(path.dirname(f.path), name));
          res.status(201).json({ url: `/uploads/${req.gallery.id}/${name}`, kind, size: f.size });
        } catch (e) {
          if (f) fs.rm(f.path, { force: true }).catch(() => {});
          next(e);
        }
      });
    },

    removeAll: id => fs.rm(path.join(uploadsDir, id), { recursive: true, force: true }),
  };
}
