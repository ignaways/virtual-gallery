/* Konstanta, katalog lantai/warna/instalasi, dan helper kecil */

export const STORE_KEY = "ruang-sunyi:v2";
export const LANG_KEY = "ruang-sunyi:lang";
export const EYE = 1.65, RADIUS = 0.4, WALL_H = 5, PART_H = 3.6, PART_T = 0.3;
export const DEG = Math.PI / 180;
export const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/* Nama yang tampil di layar ada di i18n/en.js dan i18n/id.js, dengan kunci = id di bawah */
export const STYLES = ["field", "orbits", "grid", "waves", "shards", "truchet"];
export const PALETTES = [
  ["#2c1d24", "#b8452f", "#e0913b", "#5d2a33"], ["#e8e0cf", "#1f3b57", "#d1683a", "#7aa39b"],
  ["#ede6d6", "#3d5a3a", "#c8a24a", "#8a3b2b", "#2a2a28"], ["#0f2a33", "#5fa3a8", "#e6dcc4"],
  ["#1c1c22", "#d9c9a3", "#7a2f3b", "#3f6e8c", "#e9ab4f"], ["#e7dcc5", "#283f5e", "#b6542f"],
  ["#cfd5d0", "#5c6f72", "#a9b8b1", "#2f3a3c"], ["#151515", "#c9a35b", "#e8e0cf", "#6a2c2c"],
];
export const FLOORS = [
  { id: "kayu", rep: 4, rough: 0.55 },
  { id: "parket", rep: 2.4, rough: 0.5 },
  { id: "teraso", rep: 3, rough: 0.35 },
  { id: "beton", rep: 4, rough: 0.7 },
  { id: "marmer", rep: 1.6, rough: 0.22 },
  { id: "tegel", rep: 1.6, rough: 0.5 },
];
export const WALL_COLORS = [
  { id: "gallery", c: "#e9e4da" }, { id: "stone", c: "#a9a59d" }, { id: "moss", c: "#5f6a52" },
  { id: "midnight", c: "#2f3b4c" }, { id: "brick", c: "#9a5338" }, { id: "wine", c: "#5e2a2e" },
  { id: "charcoal", c: "#2b2927" },
];
export const INST_COLORS = [
  { id: "ivory", c: "#e9e4dc" }, { id: "stone", c: "#7d7a74" }, { id: "charcoal", c: "#2b2927" }, { id: "brass", c: "#c9a35b" },
  { id: "terracotta", c: "#a5583c" }, { id: "midnight", c: "#2f3b4c" }, { id: "moss", c: "#5f6a52" }, { id: "red", c: "#b8452f" },
];
export const FINISHES = ["doff", "kilap", "logam"];
export const KINDS = {
  monolit: { size: 2.6, min: 1, max: 4 },
  simpul: { size: 1.9, min: 1.2, max: 3.5 },
  tumpuk: { size: 2.4, min: 0.8, max: 4.2 },
  bola: { size: 1.2, min: 0.5, max: 2.4 },
  gantung: { size: 1.8, min: 0.6, max: 2.6 },
  spiral: { size: 2.4, min: 0.8, max: 4.2 },
  glb: { size: 1.8, min: 0.3, max: 4.5 },
};
export const MAX_GLB = 2.5 * 1024 * 1024;

export const uid = () => Math.random().toString(36).slice(2, 9);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const snap = (v, s) => Math.round(v / s) * s;
let numberLocale = "en-US";
export const setNumberLocale = locale => { numberLocale = locale; };
export const fmt = v => (Math.round(v * 10) / 10).toLocaleString(numberLocale);
export const normDeg = d => ((Math.round(d) % 360) + 360) % 360;
export const hashStr = s => { let x = 7; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return Math.abs(x) + 1; };
export const SESSION_KEY = "ruang-sunyi:session";
export const MAX_GLB_SERVER = 25 * 1024 * 1024;
