import { useEffect, useMemo, useRef, useState } from "react";
import { fmt } from "../../lib/constants.js";
import { buildExhibits } from "../../lib/exhibits.js";
import { createGallery } from "../../engine/gallery.js";
import { Minimap } from "./Minimap.jsx";
import { Plaque } from "./Plaque.jsx";
import { Pad } from "./Pad.jsx";
import { LangSwitch, useI18n } from "../../i18n/index.jsx";

/**
 * Mode jalan di dalam galeri 3D.
 * onBack opsional: tanpa onBack (pengunjung lewat link bagikan) tombol kembali ke denah disembunyikan.
 */
export function Walk({ cfg, onBack }) {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  const engine = useRef(null);
  const markerRef = useRef(null);
  const input = useRef({});
  const [started, setStarted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [near, setNear] = useState(-1);
  const [seen, setSeen] = useState(() => new Set());
  const touch = useMemo(() => window.matchMedia("(pointer: coarse)").matches, []);
  const exhibits = useMemo(() => buildExhibits(cfg), [cfg]);
  const nArt = exhibits.filter(e => e.type === "art").length;
  const nInst = exhibits.length - nArt;

  useEffect(() => {
    document.body.classList.add("walking");
    const s = Math.min(110 / cfg.w, 150 / cfg.d);
    engine.current = createGallery(canvasRef.current, cfg, exhibits, input.current, {
      onNear: i => {
        setNear(i);
        if (i >= 0) setSeen(st => (st.has(i) ? st : new Set(st).add(i)));
      },
      onLock: setLocked,
      onFrame: p => {
        const g = markerRef.current;
        if (!g) return;
        const x = ((p.x + cfg.w / 2) * s).toFixed(1), y = ((p.z + cfg.d / 2) * s).toFixed(1);
        g.setAttribute("transform", `translate(${x},${y}) rotate(${((-p.yaw * 180) / Math.PI).toFixed(1)})`);
      },
    });
    return () => {
      document.body.classList.remove("walking");
      engine.current?.dispose();
    };
  }, [cfg, exhibits]);

  const start = () => {
    setStarted(true);
    if (!touch) engine.current.lock();
    canvasRef.current.focus();
  };
  const back = () => {
    engine.current?.unlock();
    onBack();
  };
  const pad = n => String(n).padStart(2, "0");

  return (
    <div className="app">
      <canvas
        ref={canvasRef}
        className="stage"
        tabIndex={0}
        aria-label={t("walk.canvas")}
        onClick={() => { if (started && !locked && !touch) engine.current.lock(); }}
      />

      <header className="topbar">
        <div className="brand">
          <span className="label">{t("walk.exhibition")}</span>
          <h1>{cfg.name || t("walk.gallery")}</h1>
        </div>
        <div className="top-right">
          <div className="counter">
            <span className="label">{t("walk.seen")}</span>
            <b>{pad(seen.size)} / {pad(exhibits.length)}</b>
          </div>
          <LangSwitch dark />
          {onBack && <button className="back" onClick={back}>{t("walk.back")}</button>}
        </div>
      </header>

      {started && <div className="crosshair" />}
      {started && !locked && !touch && <div className="hint label">{t("walk.hint")}</div>}
      <Plaque exhibit={near >= 0 ? exhibits[near] : null} index={Math.max(0, near)} total={exhibits.length} />
      <Minimap ref={markerRef} cfg={cfg} exhibits={exhibits} />
      {started && touch && <Pad input={input.current} />}

      {!started && (
        <div className="intro">
          <div className="intro-card">
            <span className="label">{t("walk.summary", { a: nArt, b: nInst, w: fmt(cfg.w), d: fmt(cfg.d) })}</span>
            <h2>{t("walk.welcome")} <em>{cfg.name || t("walk.gallery")}</em></h2>
            <p>
              {exhibits.length ? t("walk.intro") : t("walk.empty")}
            </p>
            <div className="keys">
              <span className="kbd">W A S D</span><span>{t("walk.keyWalk")}</span>
              <span className="kbd">Mouse</span><span>{t("walk.keyMouse")}</span>
              <span className="kbd">Shift</span><span>{t("walk.keyShift")}</span>
              <span className="kbd">Esc</span><span>{t("walk.keyEsc")}</span>
            </div>
            <div className="intro-actions">
              <button className="enter" onClick={start} autoFocus>{t("walk.start")}</button>
              {onBack ? <button className="enter ghost" onClick={back}>{t("walk.backToPlan")}</button> : <a className="enter ghost" href="/">{t("walk.createOwn")}</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
