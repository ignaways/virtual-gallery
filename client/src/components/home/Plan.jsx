import { useMemo, useRef } from "react";
import { DEG, FLOORS, clamp, fmt, snap } from "../../lib/constants.js";
import { extOf, facesOf, footOf, nearestFace, obstaclesOf, place } from "../../lib/geometry.js";
import { ICONS } from "../../lib/icons.js";
import { floorThumb } from "../../lib/textures.js";
import { useI18n } from "../../i18n/index.jsx";

const PAD = 2.2; // ruang di sekitar denah untuk label ukuran, dalam meter
const textStyle = { fontFamily: "var(--f-mono)", fontSize: 0.62, fill: "var(--muted)" };

/**
 * Denah lantai interaktif. Satuan SVG = meter, dengan (0,0) di tengah ruangan,
 * x ke timur dan z ke selatan (sama dengan sumbu dunia 3D).
 */
export function Plan({ cfg, update, sel, setSel, placing, setPlacing, rotateSel }) {
  const { t } = useI18n();
  const svgRef = useRef(null);
  const drag = useRef(null);
  const W = cfg.w, D = cfg.d;
  const faces = useMemo(() => facesOf(cfg), [cfg]);
  const fmap = useMemo(() => Object.fromEntries(faces.map(f => [f.id, f])), [faces]);
  const obs = useMemo(() => obstaclesOf(cfg), [cfg]);
  const fdef = FLOORS.find(f => f.id === cfg.floor) || FLOORS[0];
  const isSel = (kind, id) => sel?.kind === kind && sel.id === id;
  const cursor = placing ? "crosshair" : "move";

  const toMeters = e => {
    const svg = svgRef.current, pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: p.x, z: p.y };
  };

  const startDrag = (e, kind, id, ox, oz) => {
    if (placing) return;
    e.stopPropagation();
    setSel({ kind, id });
    const m = toMeters(e);
    drag.current = { kind, id, ox: m.x - ox, oz: m.z - oz };
    try { svgRef.current.setPointerCapture(e.pointerId); } catch (_) {}
  };

  const onPointerDown = e => {
    if (!placing) return setSel(null);
    const m = toMeters(e), nf = nearestFace(faces, m.x, m.z);
    update(c => ({ ...c, arts: c.arts.map(a => (a.id === placing ? { ...a, face: nf.face, t: nf.t } : a)) }));
    setSel({ kind: "art", id: placing });
    setPlacing(null);
  };

  const onPointerMove = e => {
    const d = drag.current;
    if (!d) return;
    const m = toMeters(e);
    if (d.kind === "art") {
      const nf = nearestFace(faces, m.x, m.z);
      update(c => ({ ...c, arts: c.arts.map(a => (a.id === d.id ? { ...a, face: nf.face, t: snap(nf.t, 0.05) } : a)) }));
    } else if (d.kind === "part" || d.kind === "inst") {
      const o = obs.find(q => q.id === d.id);
      if (!o) return;
      const { ex, ez } = extOf(o);
      const x = clamp(snap(m.x - d.ox, 0.25), -W / 2 + ex, W / 2 - ex);
      const z = clamp(snap(m.z - d.oz, 0.25), -D / 2 + ez, D / 2 - ez);
      const key = d.kind === "part" ? "parts" : "installs";
      update(c => ({ ...c, [key]: c[key].map(p => (p.id === d.id ? { ...p, x, z } : p)) }));
    } else if (d.kind === "spawn") {
      const x = clamp(snap(m.x - d.ox, 0.25), -W / 2 + 0.6, W / 2 - 0.6);
      const z = clamp(snap(m.z - d.oz, 0.25), -D / 2 + 0.6, D / 2 - 0.6);
      update(c => ({ ...c, spawn: { ...c.spawn, x, z } }));
    }
  };
  const endDrag = () => { drag.current = null; };

  const grid = [];
  for (let x = Math.ceil(-W / 2); x <= W / 2; x++) grid.push(<line key={"x" + x} x1={x} y1={-D / 2} x2={x} y2={D / 2} stroke="var(--grid)" strokeWidth={x % 5 === 0 ? 0.06 : 0.03} />);
  for (let z = Math.ceil(-D / 2); z <= D / 2; z++) grid.push(<line key={"z" + z} x1={-W / 2} y1={z} x2={W / 2} y2={z} stroke="var(--grid)" strokeWidth={z % 5 === 0 ? 0.06 : 0.03} />);

  return (
    <svg
      ref={svgRef}
      viewBox={`${-W / 2 - PAD} ${-D / 2 - PAD} ${W + PAD * 2} ${D + PAD * 2}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{ cursor: placing ? "crosshair" : "default" }}
      role="application"
      aria-label={t("plan.aria")}
    >
      <defs>
        <pattern id="floorpat" patternUnits="userSpaceOnUse" x={-W / 2} y={-D / 2} width={fdef.rep} height={fdef.rep}>
          <image href={floorThumb(fdef.id)} width={fdef.rep} height={fdef.rep} preserveAspectRatio="none" />
        </pattern>
      </defs>
      <rect x={-W / 2} y={-D / 2} width={W} height={D} fill="url(#floorpat)" opacity={0.38} />
      {grid}
      <rect x={-W / 2} y={-D / 2} width={W} height={D} fill="none" stroke="var(--wall)" strokeWidth={0.3} />
      <rect x={-W / 2 + 0.22} y={-D / 2 + 0.22} width={W - 0.44} height={D - 0.44} fill="none" stroke={cfg.wallColor} strokeWidth={0.14} />

      <text x={0} y={-D / 2 - 0.75} textAnchor="middle" style={textStyle}>{fmt(W)} m</text>
      <text x={-W / 2 - 0.75} y={0} textAnchor="middle" transform={`rotate(-90 ${-W / 2 - 0.75} 0)`} style={textStyle}>{fmt(D)} m</text>
      <g transform={`translate(${W / 2 + 1.1} ${-D / 2 - 1.1})`}>
        <path d="M0,-0.7 L0.4,0.5 L0,0.25 L-0.4,0.5 Z" fill="var(--fg)" />
        <text x={0} y={1.3} textAnchor="middle" style={{ ...textStyle, fill: "var(--fg)" }}>{t("plan.north")}</text>
      </g>
      <g transform={`translate(${-W / 2} ${D / 2 + 1})`}>
        <line x1={0} y1={0} x2={5} y2={0} stroke="var(--fg)" strokeWidth={0.08} />
        <line x1={0} y1={-0.2} x2={0} y2={0.2} stroke="var(--fg)" strokeWidth={0.08} />
        <line x1={5} y1={-0.2} x2={5} y2={0.2} stroke="var(--fg)" strokeWidth={0.08} />
        <text x={5.4} y={0.22} style={textStyle}>5 m</text>
      </g>

      {/* sekat & bangku */}
      {cfg.parts.map(p => {
        const o = obs.find(q => q.id === p.id);
        return (
          <rect
            key={p.id}
            x={-o.hx} y={-o.hz} width={o.hx * 2} height={o.hz * 2}
            transform={`translate(${p.x} ${p.z}) rotate(${p.rot})`}
            fill={p.type === "wall" ? "var(--wall)" : "var(--bench)"}
            stroke={isSel("part", p.id) ? "var(--accent)" : "none"}
            strokeWidth={0.18}
            style={{ cursor }}
            onPointerDown={e => startDrag(e, "part", p.id, p.x, p.z)}
          />
        );
      })}

      {/* instalasi */}
      {cfg.installs.map((it, i) => {
        const f = footOf(it), s = isSel("inst", it.id), stroke = s ? "var(--fg)" : "var(--accent)";
        return (
          <g key={it.id} style={{ cursor }} onPointerDown={e => startDrag(e, "inst", it.id, it.x, it.z)}>
            <g transform={`translate(${it.x} ${it.z}) rotate(${it.rot})`}>
              {f.round
                ? <circle r={f.hx} fill="var(--accent)" fillOpacity={f.hang ? 0.08 : 0.2} stroke={stroke} strokeWidth={s ? 0.16 : 0.1} strokeDasharray={f.hang ? "0.35 0.25" : undefined} />
                : <rect x={-f.hx} y={-f.hz} width={f.hx * 2} height={f.hz * 2} fill="var(--accent)" fillOpacity={0.2} stroke={stroke} strokeWidth={s ? 0.16 : 0.1} />}
              <path d={`M-0.28 ${f.hz + 0.12} L0.28 ${f.hz + 0.12} L0 ${f.hz + 0.5} Z`} fill={stroke} />
            </g>
            <text x={it.x} y={it.z + 0.22} textAnchor="middle" style={{ fontFamily: "var(--f-mono)", fontSize: 0.56, fill: "var(--fg)", pointerEvents: "none", fontWeight: 500 }}>
              I{i + 1}
            </text>
          </g>
        );
      })}

      {/* lukisan */}
      {cfg.arts.map((a, i) => {
        const p = place(a, fmap);
        if (!p) return null;
        const f = p.f, s = isSel("art", a.id);
        const cx = p.fx + f.nx * 0.32, cz = p.fz + f.nz * 0.32;
        const x1 = cx - (f.tx * a.w) / 2, z1 = cz - (f.tz * a.w) / 2, x2 = cx + (f.tx * a.w) / 2, z2 = cz + (f.tz * a.w) / 2;
        const lx = p.fx + f.nx * 1.05, lz = p.fz + f.nz * 1.05;
        return (
          <g key={a.id} style={{ cursor: placing ? "crosshair" : "grab" }} onPointerDown={e => startDrag(e, "art", a.id, p.fx, p.fz)}>
            <line x1={x1} y1={z1} x2={x2} y2={z2} stroke="transparent" strokeWidth={1.1} />
            <line x1={x1} y1={z1} x2={x2} y2={z2} stroke={p.fits ? (s ? "var(--fg)" : "var(--accent)") : "var(--danger)"} strokeWidth={s ? 0.34 : 0.24} />
            <circle cx={lx} cy={lz} r={0.42} fill={s ? "var(--fg)" : "var(--plan)"} stroke={s ? "var(--fg)" : "var(--accent)"} strokeWidth={0.06} />
            <text x={lx} y={lz + 0.2} textAnchor="middle" style={{ fontFamily: "var(--f-mono)", fontSize: 0.5, fill: s ? "var(--plan)" : "var(--fg)", pointerEvents: "none" }}>{i + 1}</text>
          </g>
        );
      })}

      {/* titik masuk */}
      <g transform={`translate(${cfg.spawn.x} ${cfg.spawn.z})`} style={{ cursor }} onPointerDown={e => startDrag(e, "spawn", "spawn", cfg.spawn.x, cfg.spawn.z)}>
        <circle r={0.9} fill="transparent" />
        <circle r={0.55} fill={isSel("spawn", "spawn") ? "var(--accent)" : "var(--fg)"} />
        <path d="M0,-1.25 L0.42,-0.55 L-0.42,-0.55 Z" fill={isSel("spawn", "spawn") ? "var(--accent)" : "var(--fg)"} transform={`rotate(${-cfg.spawn.yaw / DEG})`} />
        <text y={1.35} textAnchor="middle" style={{ ...textStyle, fontSize: 0.5, pointerEvents: "none" }}>{t("plan.entrance")}</text>
      </g>

      <RotateHandles cfg={cfg} obs={obs} sel={placing ? null : sel} rotateSel={rotateSel} />
    </svg>
  );
}

/** Dua tombol putar mengambang di atas benda terpilih. */
function RotateHandles({ cfg, obs, sel, rotateSel }) {
  const { t } = useI18n();
  if (!sel || !["part", "inst", "spawn"].includes(sel.kind)) return null;
  let cx, cz, r;
  if (sel.kind === "spawn") {
    cx = cfg.spawn.x; cz = cfg.spawn.z; r = 1.3;
  } else {
    const o = obs.find(q => q.id === sel.id);
    if (!o) return null;
    cx = o.x; cz = o.z; r = extOf(o).ez;
  }
  let hz = cz - r - 1.1;
  if (hz < -cfg.d / 2 - PAD + 0.8) hz = cz + r + 1.1;

  const handle = (dx, icon, delta, label) => (
    <g
      className="handle"
      transform={`translate(${cx + dx} ${hz})`}
      role="button"
      aria-label={label}
      onPointerDown={e => { e.stopPropagation(); e.preventDefault(); rotateSel(delta); }}
    >
      <circle r={0.72} fill="var(--fg)" />
      <g transform="scale(0.05) translate(-12 -12)" fill="none" stroke="var(--bg)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: "none" }}>
        {ICONS[icon].map((d, i) => <path key={i} d={d} />)}
      </g>
    </g>
  );
  return (
    <g>
      {handle(-0.85, "ccw", -15, t("plan.rotateLeft"))}
      {handle(0.85, "cw", 15, t("plan.rotateRight"))}
    </g>
  );
}
