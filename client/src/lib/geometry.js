/* Geometri denah: rintangan, bidang dinding, penempatan lukisan */
import { WALL_H, PART_H, PART_T, DEG, clamp } from "./constants.js";

export function footOf(i) {
  const s = i.size;
  switch (i.kind) {
    case "monolit": return { hx: (s * 0.42 + 0.3) / 2, hz: 0.35 };
    case "simpul": { const ph = Math.min(0.9, s * 0.45); return { hx: Math.max(0.45, (s - ph) / 2), hz: Math.max(0.45, (s - ph) / 2) }; }
    case "tumpuk": return { hx: 0.64, hz: 0.64 };
    case "bola": return { hx: 1.1, hz: 1.1, round: true };
    case "spiral": return { hx: 1.05, hz: 1.05, round: true };
    case "gantung": return { hx: 1.2, hz: 1.2, round: true, hang: true };
    case "glb": { const f = i.foot || { w: 0.6, d: 0.6 }; return { hx: Math.max(0.2, f.w * s / 2), hz: Math.max(0.2, f.d * s / 2) }; }
  }
  return { hx: 0.5, hz: 0.5 };
}
/* Semua benda yang tidak bisa ditembus: {x, z, hx, hz, a (rad), round} */
export function obstaclesOf(cfg) {
  const out = [];
  cfg.parts.forEach(p => {
    if (p.type === "wall") out.push({ x: p.x, z: p.z, hx: p.len / 2, hz: PART_T / 2, a: p.rot * DEG, kind: "wall", id: p.id });
    else out.push({ x: p.x, z: p.z, hx: 1.6, hz: 0.4, a: p.rot * DEG, kind: "bench", id: p.id });
  });
  (cfg.installs || []).forEach(i => {
    const f = footOf(i);
    out.push({ x: i.x, z: i.z, hx: f.hx, hz: f.hz, a: i.rot * DEG, round: !!f.round, hang: !!f.hang, kind: "inst", id: i.id });
  });
  return out;
}
export function extOf(o) {
  if (o.round) return { ex: o.hx, ez: o.hx };
  const c = Math.abs(Math.cos(o.a)), s = Math.abs(Math.sin(o.a));
  return { ex: c * o.hx + s * o.hz, ez: s * o.hx + c * o.hz };
}
export function hits(o, x, z, R) {
  const dx = x - o.x, dz = z - o.z;
  if (o.round) return Math.hypot(dx, dz) < o.hx + R;
  const c = Math.cos(o.a), s = Math.sin(o.a);
  const lx = dx * c + dz * s, lz = -dx * s + dz * c;
  return Math.hypot(lx - clamp(lx, -o.hx, o.hx), lz - clamp(lz, -o.hz, o.hz)) < R;
}

/* Bidang dinding: pusat (cx,cz), arah sepanjang (tx,tz), normal menghadap ruang (nx,nz) */
export function facesOf(cfg) {
  const W = cfg.w, D = cfg.d;
  const faces = [
    { id: "N", cx: 0, cz: -D / 2, tx: 1, tz: 0, len: W, nx: 0, nz: 1 },
    { id: "S", cx: 0, cz: D / 2, tx: 1, tz: 0, len: W, nx: 0, nz: -1 },
    { id: "W", cx: -W / 2, cz: 0, tx: 0, tz: 1, len: D, nx: 1, nz: 0 },
    { id: "E", cx: W / 2, cz: 0, tx: 0, tz: 1, len: D, nx: -1, nz: 0 },
  ];
  let n = 0;
  cfg.parts.forEach(p => {
    if (p.type !== "wall") return; n++;
    const a = p.rot * DEG, c = Math.cos(a), s = Math.sin(a), o = PART_T / 2;
    faces.push({ id: p.id + ":a", n, side: "A", cx: p.x + s * o, cz: p.z - c * o, tx: c, tz: s, len: p.len, nx: s, nz: -c, part: true });
    faces.push({ id: p.id + ":b", n, side: "B", cx: p.x - s * o, cz: p.z + c * o, tx: c, tz: s, len: p.len, nx: -s, nz: c, part: true });
  });
  return faces;
}
export function place(art, fmap) {
  const f = art.face && fmap[art.face];
  if (!f) return null;
  const maxT = Math.max(0, f.len / 2 - art.w / 2 - 0.1);
  const t = clamp(art.t, -maxT, maxT);
  const fx = f.cx + f.tx * t, fz = f.cz + f.tz * t;
  const limit = f.part ? PART_H - 0.3 : WALL_H - 0.4;
  const y = clamp(Math.max(1.6, art.h / 2 + 0.55), 0, limit - art.h / 2);
  return { f, t, fx, fz, x: fx + f.nx * 0.06, z: fz + f.nz * 0.06, y, rot: Math.atan2(f.nx, f.nz), fits: art.w + 0.2 <= f.len };
}
export function nearestFace(faces, x, z) {
  let best = null;
  faces.forEach(f => {
    const t = clamp((x - f.cx) * f.tx + (z - f.cz) * f.tz, -f.len / 2, f.len / 2);
    const px = f.cx + f.tx * t, pz = f.cz + f.tz * t;
    const side = (x - px) * f.nx + (z - pz) * f.nz;
    const d = Math.hypot(x - px, z - pz) + (side < -0.05 ? 50 : 0);
    if (!best || d < best.d) best = { d, face: f.id, t };
  });
  return best;
}
