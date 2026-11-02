/* Tekstur prosedural: lantai dan lukisan generatif */
import { hashStr } from "./constants.js";

export function rng(seed) { let s = (seed * 2654435761) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export function grain(g, S, amt) {
  const img = g.getImageData(0, 0, S, S), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
}
export function floorCanvas(id, S) {
  const c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d"), k = S / 1024, r = rng(hashStr(id));
  const wrap = fn => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy); };
  if (id === "kayu") {
    const rows = 16, ph = S / rows;
    for (let i = 0; i < rows; i++) {
      let x = -r() * 300 * k;
      while (x < S) {
        const len = (260 + r() * 240) * k, tone = 120 + r() * 28;
        g.fillStyle = `rgb(${tone + 30},${tone - 2},${tone - 38})`; g.fillRect(x, i * ph, len, ph);
        g.strokeStyle = "rgba(40,24,10,.35)"; g.lineWidth = 2 * k; g.strokeRect(x, i * ph, len, ph);
        for (let q = 0; q < 4; q++) { g.strokeStyle = "rgba(60,36,16,.12)"; g.beginPath(); const yy = i * ph + r() * ph; g.moveTo(x, yy); g.lineTo(x + len, yy + (r() - .5) * 6 * k); g.stroke(); }
        x += len;
      }
    }
  } else if (id === "parket") {
    const n = 4, bs = S / n;
    for (let bi = 0; bi < n; bi++) for (let bj = 0; bj < n; bj++) {
      const hor = (bi + bj) % 2 === 0;
      for (let p = 0; p < 3; p++) {
        const tone = 112 + r() * 34;
        g.fillStyle = `rgb(${tone + 44},${tone + 8},${tone - 34})`;
        const [x, y, w, hh] = hor ? [bi * bs, bj * bs + p * bs / 3, bs, bs / 3] : [bi * bs + p * bs / 3, bj * bs, bs / 3, bs];
        g.fillRect(x, y, w, hh);
        g.strokeStyle = "rgba(70,40,15,.16)"; g.lineWidth = 1.5 * k;
        for (let q = 0; q < 5; q++) { g.beginPath(); if (hor) { const yy = y + r() * hh; g.moveTo(x, yy); g.lineTo(x + w, yy + (r() - .5) * 4 * k); } else { const xx = x + r() * w; g.moveTo(xx, y); g.lineTo(xx + (r() - .5) * 4 * k, y + hh); } g.stroke(); }
        g.strokeStyle = "rgba(40,22,8,.45)"; g.lineWidth = 2 * k; g.strokeRect(x, y, w, hh);
      }
    }
  } else if (id === "teraso") {
    g.fillStyle = "#d8d1c4"; g.fillRect(0, 0, S, S);
    const chips = ["#8c8378", "#b5543a", "#3e4a3d", "#f1ece3", "#5f6b78", "#2b2a28", "#c9a35b", "#a39e95"];
    for (let i = 0; i < 1400; i++) {
      const x = r() * S, y = r() * S, rad = (2 + r() * r() * 16) * k, sides = 5 + Math.floor(r() * 3), rot = r() * 6, col = chips[Math.floor(r() * chips.length)];
      const pts = []; for (let v = 0; v < sides; v++) { const a = rot + v / sides * Math.PI * 2, rr = rad * (0.6 + r() * 0.5); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
      g.fillStyle = col;
      wrap((ox, oy) => { const X = x + ox, Y = y + oy; if (X < -20 * k || X > S + 20 * k || Y < -20 * k || Y > S + 20 * k) return; g.beginPath(); pts.forEach(([px, py], j) => j ? g.lineTo(X + px, Y + py) : g.moveTo(X + px, Y + py)); g.closePath(); g.fill(); });
    }
  } else if (id === "beton") {
    g.fillStyle = "#8f8c86"; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 70; i++) {
      const x = r() * S, y = r() * S, rad = (60 + r() * 200) * k, dark = r() > 0.5, al = 0.05 + r() * 0.08;
      wrap((ox, oy) => {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        gr.addColorStop(0, dark ? `rgba(40,38,35,${al})` : `rgba(230,226,218,${al})`); gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      });
    }
    g.strokeStyle = "rgba(35,33,30,.4)"; g.lineWidth = 3 * k; g.strokeRect(0, 0, S, S);
  } else if (id === "marmer") {
    const ts = S / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const dark = (i + j) % 2 === 1, x = i * ts, y = j * ts;
      g.save(); g.beginPath(); g.rect(x, y, ts, ts); g.clip();
      g.fillStyle = dark ? "#2a2826" : "#e8e4dc"; g.fillRect(x, y, ts, ts);
      for (let v = 0; v < 9; v++) {
        g.strokeStyle = dark ? `rgba(225,215,200,${0.12 + r() * 0.3})` : `rgba(90,88,84,${0.12 + r() * 0.3})`;
        g.lineWidth = (0.6 + r() * r() * 4) * k * 2;
        g.beginPath(); const sx = x + r() * ts, sy = y - 10;
        g.moveTo(sx, sy); g.bezierCurveTo(x + r() * ts, y + r() * ts, x + r() * ts, y + r() * ts, x + r() * ts, y + ts + 10); g.stroke();
      }
      g.restore();
    }
    g.strokeStyle = "rgba(120,115,105,.5)"; g.lineWidth = 2 * k;
    for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * ts, 0); g.lineTo(i * ts, S); g.stroke(); g.beginPath(); g.moveTo(0, i * ts); g.lineTo(S, i * ts); g.stroke(); }
  } else if (id === "tegel") {
    const n = 4, ts = S / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = i * ts, y = j * ts;
      g.save(); g.beginPath(); g.rect(x, y, ts, ts); g.clip();
      g.fillStyle = "#e6dccb"; g.fillRect(x, y, ts, ts);
      g.fillStyle = "#a8553a";
      [[x, y], [x + ts, y], [x, y + ts], [x + ts, y + ts]].forEach(([cx, cy]) => { g.beginPath(); g.arc(cx, cy, ts * 0.36, 0, Math.PI * 2); g.fill(); });
      g.fillStyle = "#e6dccb";
      [[x, y], [x + ts, y], [x, y + ts], [x + ts, y + ts]].forEach(([cx, cy]) => { g.beginPath(); g.arc(cx, cy, ts * 0.2, 0, Math.PI * 2); g.fill(); });
      g.fillStyle = "#3f5a52"; g.beginPath();
      g.moveTo(x + ts / 2, y + ts * 0.26); g.lineTo(x + ts * 0.74, y + ts / 2); g.lineTo(x + ts / 2, y + ts * 0.74); g.lineTo(x + ts * 0.26, y + ts / 2); g.closePath(); g.fill();
      g.fillStyle = "#e6dccb"; g.beginPath(); g.arc(x + ts / 2, y + ts / 2, ts * 0.06, 0, Math.PI * 2); g.fill();
      g.restore();
      g.strokeStyle = "rgba(60,50,40,.4)"; g.lineWidth = 2.5 * k; g.strokeRect(x, y, ts, ts);
    }
  }
  if (S >= 512) grain(g, S, id === "beton" ? 22 : 12);
  return c;
}
export const floorThumbs = {};
export const floorThumb = id => floorThumbs[id] || (floorThumbs[id] = floorCanvas(id, 256).toDataURL("image/jpeg", 0.85));

export function paint(a, size) {
  const W = size, H = Math.max(8, Math.round(size * a.h / a.w)), k = W / 1024;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d"), r = rng(a.gen.seed), P = a.gen.pal, pick = () => P[1 + Math.floor(r() * (P.length - 1))];
  g.fillStyle = P[0]; g.fillRect(0, 0, W, H);
  const st = a.gen.style;
  if (st === "field") {
    const bands = 3, m = W * 0.07; let y = m;
    const hh = (H - m * 2 - m * 0.5 * (bands - 1)) / bands;
    for (let i = 0; i < bands; i++) {
      g.save(); g.filter = "blur(" + Math.max(1, 10 * k) + "px)"; g.globalAlpha = 0.92;
      g.fillStyle = P[1 + (i % (P.length - 1))]; g.fillRect(m, y, W - m * 2, hh * (0.8 + r() * 0.4));
      g.restore(); y += hh + m * 0.5;
    }
  } else if (st === "orbits") {
    for (let i = 0; i < 9; i++) {
      const cx = W * (0.3 + r() * 0.4), cy = H * (0.3 + r() * 0.4), rad = W * (0.08 + r() * 0.32);
      g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2);
      if (r() > 0.5) { g.fillStyle = pick(); g.globalAlpha = 0.75; g.fill(); }
      else { g.strokeStyle = pick(); g.globalAlpha = 1; g.lineWidth = (6 + r() * 18) * k; g.stroke(); }
    }
    g.globalAlpha = 1;
  } else if (st === "grid") {
    const cols = 6 + Math.floor(r() * 4), cs = W / cols, rows = Math.ceil(H / cs), pad = cs * 0.08;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      if (r() < 0.18) continue;
      g.fillStyle = pick();
      if (r() < 0.6) g.fillRect(i * cs + pad, j * cs + pad, cs - pad * 2, cs - pad * 2);
      else { g.beginPath(); g.arc(i * cs + cs / 2, j * cs + cs / 2, cs / 2 - pad, 0, Math.PI * 2); g.fill(); }
    }
  } else if (st === "waves") {
    const lines = 70, f1 = 2 + r() * 4, f2 = 6 + r() * 6, ph = r() * 6;
    for (let i = 0; i < lines; i++) {
      const y0 = H * 0.06 + (H * 0.88) * i / lines;
      g.strokeStyle = i % 9 === 0 ? P[2] : P[1]; g.lineWidth = (i % 9 === 0 ? 3 : 1.6) * Math.max(k, 0.4);
      g.beginPath();
      for (let x = 0; x <= W; x += Math.max(2, 8 * k)) {
        const t = x / W, amp = 22 * k * Math.sin(Math.PI * t) * (0.4 + Math.sin(i * 0.15 + ph) * 0.6);
        const y = y0 + amp * Math.sin(t * f1 * Math.PI + i * 0.12) + 6 * k * Math.sin(t * f2 * Math.PI + ph);
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    }
  } else if (st === "shards") {
    for (let i = 0; i < 26; i++) {
      g.fillStyle = pick(); g.globalAlpha = 0.85; g.beginPath();
      const cx = r() * W, cy = r() * H, s = W * (0.12 + r() * 0.3);
      g.moveTo(cx, cy); g.lineTo(cx + (r() - 0.5) * s * 2, cy + (r() - 0.5) * s * 2); g.lineTo(cx + (r() - 0.5) * s * 2, cy + (r() - 0.5) * s * 2);
      g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
  } else if (st === "truchet") {
    const n = 8, cs = W / n, rows = Math.ceil(H / cs);
    g.lineWidth = cs * 0.22;
    for (let i = 0; i < n; i++) for (let j = 0; j < rows; j++) {
      const x = i * cs, y = j * cs;
      g.strokeStyle = (i + j) % 3 === 0 ? P[2] : P[1]; g.beginPath();
      if (r() > 0.5) { g.arc(x, y, cs / 2, 0, Math.PI / 2); g.moveTo(x + cs, y + cs / 2); g.arc(x + cs, y + cs, cs / 2, -Math.PI / 2, Math.PI, true); }
      else { g.arc(x + cs, y, cs / 2, Math.PI / 2, Math.PI); g.moveTo(x + cs / 2, y + cs); g.arc(x, y + cs, cs / 2, 0, -Math.PI / 2, true); }
      g.stroke();
    }
  }
  if (size >= 512) {
    const img = g.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const nn = (Math.random() - 0.5) * 14; d[i] += nn; d[i + 1] += nn; d[i + 2] += nn; }
    g.putImageData(img, 0, 0);
  }
  return c;
}
export const thumbCache = new Map();
export function thumbOf(a) {
  if (a.img) return a.img;
  const key = a.gen.style + a.gen.seed + a.gen.pal.join() + a.w + "x" + a.h;
  if (!thumbCache.has(key)) thumbCache.set(key, paint(a, 240).toDataURL());
  return thumbCache.get(key);
}
