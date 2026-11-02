import { facesOf, footOf, place } from "./geometry.js";

/** Semua karya yang dipajang (lukisan terpasang + instalasi), dengan posisi dan nomornya. */
export function buildExhibits(cfg) {
  const fmap = Object.fromEntries(facesOf(cfg).map(f => [f.id, f]));
  const arts = [];
  cfg.arts.forEach((art, i) => {
    const pos = place(art, fmap);
    if (pos) arts.push({ type: "art", item: art, pos, x: pos.x, z: pos.z, reach: 0, num: i + 1 });
  });
  const insts = cfg.installs.map((it, i) => {
    const f = footOf(it);
    return { type: "inst", item: it, x: it.x, z: it.z, reach: Math.max(f.hx, f.hz), num: i + 1 };
  });
  return arts.concat(insts);
}
