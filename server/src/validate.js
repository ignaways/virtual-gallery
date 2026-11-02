/*
 * Membersihkan konfigurasi galeri dari klien: hanya field yang dikenal yang disimpan,
 * angka dibatasi ke rentang wajar, dan referensi file harus milik galeri yang sama.
 */
import { HttpError } from "./errors.js";

const FLOORS = ["kayu", "parket", "teraso", "beton", "marmer", "tegel"];
const KINDS = ["monolit", "simpul", "tumpuk", "bola", "gantung", "spiral", "glb"];
const FINISHES = ["doff", "kilap", "logam"];
const STYLES = ["field", "orbits", "grid", "waves", "shards", "truchet"];
const HEX = /^#[0-9a-fA-F]{6}$/;
const MAX_DATA_URL = 4 * 1024 * 1024;

const str = (v, max) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "").slice(0, max);
const num = (v, min, max, def) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def);
const hex = (v, def) => (typeof v === "string" && HEX.test(v) ? v : def);
const oneOf = (v, list, def) => (list.includes(v) ? v : def);
const ident = v => (typeof v === "string" && /^[A-Za-z0-9_-]{1,24}$/.test(v) ? v : null);
const list = (v, max, fn) => {
  if (!Array.isArray(v)) return [];
  if (v.length > max) throw new HttpError(422, "tooManyItems", `Too many items (maximum ${max})`, { max });
  return v.map(fn).filter(Boolean);
};

/* Referensi file harus berupa data URL kecil, atau file milik galeri ini (disk lokal atau Vercel Blob) */
const LOCAL_ASSET = /^\/uploads\/([A-Za-z0-9_-]{10})\/[A-Za-z0-9_-]+\.(jpg|png|webp|glb)$/;
const BLOB_ASSET = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/galleries\/([A-Za-z0-9_-]{10})\/[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp|glb)$/i;

function asset(v, galleryId, type) {
  if (typeof v !== "string") return null;
  if (v.startsWith("data:")) {
    const ok = type === "image" ? /^data:image\/(jpeg|png|webp);base64,/.test(v) : v.startsWith("data:model/gltf-binary;base64,");
    return ok && v.length <= MAX_DATA_URL ? v : null;
  }
  const m = v.match(LOCAL_ASSET) || v.match(BLOB_ASSET);
  if (!m || m[1] !== galleryId) return null;
  return (type === "model") === (m[2].toLowerCase() === "glb") ? v : null;
}

export function sanitizeConfig(c, galleryId = null) {
  if (!c || typeof c !== "object" || Array.isArray(c)) throw new HttpError(422, "invalidConfig", "Invalid gallery data");
  const w = num(c.w, 10, 40, 24), d = num(c.d, 10, 50, 36);
  const spawn = c.spawn || {};
  return {
    name: str(c.name, 80),
    w, d,
    floor: oneOf(c.floor, FLOORS, "kayu"),
    wallColor: hex(c.wallColor, "#e9e4da"),
    spawn: { x: num(spawn.x, -w / 2, w / 2, 0), z: num(spawn.z, -d / 2, d / 2, 0), yaw: num(spawn.yaw, -100, 100, 0) },
    parts: list(c.parts, 80, p => {
      const id = ident(p && p.id);
      if (!id || !["wall", "bench"].includes(p.type)) return null;
      return { id, type: p.type, x: num(p.x, -w, w, 0), z: num(p.z, -d, d, 0), len: num(p.len, 1, 60, 6), rot: num(p.rot, -360, 360, 0) };
    }),
    installs: list(c.installs, 80, i => {
      const id = ident(i && i.id);
      if (!id) return null;
      const kind = oneOf(i.kind, KINDS, "monolit");
      const foot = i.foot && typeof i.foot === "object" ? { w: num(i.foot.w, 0.01, 100, 0.6), d: num(i.foot.d, 0.01, 100, 0.6) } : null;
      return {
        id, kind, x: num(i.x, -w, w, 0), z: num(i.z, -d, d, 0), rot: num(i.rot, -360, 360, 0), size: num(i.size, 0.2, 5, 1.8),
        color: hex(i.color, "#e9e4dc"), finish: oneOf(i.finish, FINISHES, "doff"),
        title: str(i.title, 120), artist: str(i.artist, 120), year: str(i.year, 12), medium: str(i.medium, 160), desc: str(i.desc, 1200),
        model: kind === "glb" ? asset(i.model, galleryId, "model") : null, foot,
      };
    }),
    arts: list(c.arts, 250, a => {
      const id = ident(a && a.id);
      if (!id) return null;
      const g = a.gen || {};
      const pal = Array.isArray(g.pal) ? g.pal.filter(x => HEX.test(x)).slice(0, 8) : [];
      return {
        id, title: str(a.title, 120), artist: str(a.artist, 120), year: str(a.year, 12), medium: str(a.medium, 160), desc: str(a.desc, 1200),
        w: num(a.w, 0.2, 6, 1.6), h: num(a.h, 0.2, 6, 1.2),
        img: asset(a.img, galleryId, "image"), ratio: a.ratio == null ? null : num(a.ratio, 0.05, 20, 1),
        gen: { style: oneOf(g.style, STYLES, "orbits"), seed: num(g.seed, 0, 1e6, 1), pal: pal.length >= 2 ? pal : ["#e8e0cf", "#1f3b57", "#d1683a"] },
        face: typeof a.face === "string" ? a.face.slice(0, 40) : null,
        t: num(a.t, -100, 100, 0),
      };
    }),
  };
}
