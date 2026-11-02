import { forwardRef, useMemo } from "react";
import { DEG } from "../../lib/constants.js";
import { obstaclesOf } from "../../lib/geometry.js";
import { useI18n } from "../../i18n/index.jsx";

const COLORS = { wall: "#a39b8d", bench: "#5b4a3a", inst: "#7c6a48" };

/** Denah kecil di pojok. Penanda pemain (ref) digerakkan langsung oleh mesin 3D tanpa render ulang. */
export const Minimap = forwardRef(function Minimap({ cfg, exhibits }, markerRef) {
  const { t } = useI18n();
  const s = Math.min(110 / cfg.w, 150 / cfg.d), W = cfg.w * s, D = cfg.d * s;
  const X = x => (x + cfg.w / 2) * s, Z = z => (z + cfg.d / 2) * s;
  const obs = useMemo(() => obstaclesOf(cfg), [cfg]);
  return (
    <div className="minimap">
      <span className="label">{t("walk.plan")}</span>
      <svg viewBox={`0 0 ${W} ${D}`} width={W} height={D} aria-label={t("walk.planAria")}>
        <rect x={0.5} y={0.5} width={W - 1} height={D - 1} fill="none" stroke="#a39b8d" />
        {obs.map(o =>
          o.round ? (
            <circle key={o.id} cx={X(o.x)} cy={Z(o.z)} r={o.hx * s} fill={o.hang ? "none" : COLORS.inst} stroke={o.hang ? COLORS.inst : "none"} strokeDasharray={o.hang ? "2 2" : undefined} />
          ) : (
            <rect key={o.id} x={-o.hx * s} y={-o.hz * s} width={Math.max(1, o.hx * 2 * s)} height={Math.max(1, o.hz * 2 * s)} fill={COLORS[o.kind]} transform={`translate(${X(o.x)} ${Z(o.z)}) rotate(${o.a / DEG})`} />
          )
        )}
        {exhibits.filter(e => e.type === "art").map(e => <circle key={e.item.id} cx={X(e.pos.fx)} cy={Z(e.pos.fz)} r={2.2} fill="#c9a35b" />)}
        <g ref={markerRef}>
          <path d="M0,-7 L4.5,4 L0,1.5 L-4.5,4 Z" fill="#ece4d6" />
        </g>
      </svg>
    </div>
  );
});
