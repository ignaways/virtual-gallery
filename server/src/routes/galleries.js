import { Router, json } from "express";
import crypto from "node:crypto";
import { config } from "../config.js";
import { HttpError } from "../errors.js";
import { sanitizeConfig } from "../validate.js";

const ID_RE = /^[A-Za-z0-9_-]{10}$/;
const newId = () => crypto.randomBytes(8).toString("base64url").slice(0, 10);
const newKey = () => crypto.randomBytes(24).toString("base64url");
const hashKey = key => crypto.createHash("sha256").update(String(key)).digest();
const keyMatches = (key, keyHash) => !!key && crypto.timingSafeEqual(hashKey(key), Buffer.from(keyHash, "hex"));
const publicView = rec => ({ id: rec.id, updatedAt: rec.updatedAt, config: rec.config });

export function galleryRouter(store, uploads) {
  const r = Router();
  const body = json({ limit: config.maxBody });
  const findGallery = id => (ID_RE.test(id) ? store.get(id) : Promise.resolve(null));

  /* Muat galeri dari :id ke req.gallery */
  const load = async (req, res, next) => {
    try {
      const rec = await findGallery(req.params.id);
      if (!rec) throw new HttpError(404, "notFound", "Gallery not found");
      req.gallery = rec;
      next();
    } catch (e) {
      next(e);
    }
  };

  /* Hanya pemegang kunci edit (header X-Edit-Key) yang boleh mengubah galeri */
  const auth = (req, res, next) =>
    next(keyMatches(req.get("X-Edit-Key"), req.gallery.keyHash) ? undefined : new HttpError(403, "badKey", "Edit key does not match"));

  r.post("/", body, async (req, res, next) => {
    try {
      const cfg = sanitizeConfig(req.body?.config);
      let id;
      do id = newId(); while (await store.get(id));
      const key = newKey(), now = new Date().toISOString();
      await store.put({ id, keyHash: hashKey(key).toString("hex"), createdAt: now, updatedAt: now, config: cfg });
      res.status(201).json({ id, editKey: key, updatedAt: now });
    } catch (e) {
      next(e);
    }
  });

  r.get("/:id", load, (req, res) => {
    res.set("Cache-Control", "no-store").json(publicView(req.gallery));
  });

  r.put("/:id", body, load, auth, async (req, res, next) => {
    try {
      const rec = { ...req.gallery, config: sanitizeConfig(req.body?.config, req.gallery.id), updatedAt: new Date().toISOString() };
      await store.put(rec);
      res.json({ id: rec.id, updatedAt: rec.updatedAt });
    } catch (e) {
      next(e);
    }
  });

  r.delete("/:id", load, auth, async (req, res, next) => {
    try {
      await store.remove(req.gallery.id);
      await uploads.removeAll(req.gallery.id);
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

  uploads.routes(r, { body, load, auth, findGallery, keyMatches });
  return r;
}
