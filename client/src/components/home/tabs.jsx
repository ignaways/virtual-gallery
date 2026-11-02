import { useState } from "react";
import { FLOORS, INST_COLORS, KINDS, PALETTES, STYLES, WALL_COLORS, WALL_H, clamp, fmt, snap, uid } from "../../lib/constants.js";
import { place } from "../../lib/geometry.js";
import { genArt, genInst, defaultConfig } from "../../lib/model.js";
import { floorThumb, thumbOf } from "../../lib/textures.js";
import { prepareGLB, prepareImage } from "../../lib/files.js";
import { useServer } from "../../context/ServerContext.js";
import { faceLabel, useI18n } from "../../i18n/index.jsx";
import { Icon } from "../ui/Icon.jsx";
import { ColorPicker, ConfirmButton, RangeField, TextField } from "../ui/fields.jsx";

const pickRandom = list => list[Math.floor(Math.random() * list.length)];
const fileTitle = name => name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");

/* ---------- Tab Ruangan ---------- */
export function RoomTab({ cfg, update, setSel, gallery }) {
  const { t, lang } = useI18n();

  const setRoom = (key, v) =>
    update(c => {
      const n = { ...c, [key]: v };
      const fit = it => ({ ...it, x: clamp(it.x, -n.w / 2 + 0.5, n.w / 2 - 0.5), z: clamp(it.z, -n.d / 2 + 0.5, n.d / 2 - 0.5) });
      n.parts = n.parts.map(fit);
      n.installs = n.installs.map(fit);
      n.spawn = { ...n.spawn, x: clamp(n.spawn.x, -n.w / 2 + 0.6, n.w / 2 - 0.6), z: clamp(n.spawn.z, -n.d / 2 + 0.6, n.d / 2 - 0.6) };
      return n;
    });

  const addPart = type => {
    const id = uid();
    const p = type === "wall" ? { id, type, x: 0, z: 0, len: 6, rot: 90 } : { id, type, x: 0, z: 0, rot: 0 };
    update(c => ({ ...c, parts: [...c.parts, p] }));
    setSel({ kind: "part", id });
  };

  return (
    <>
      <div className="section">
        <h3>{t("room.title")}</h3>
        <TextField id="gallery-name" label={t("room.name")} value={cfg.name} onChange={v => update(c => ({ ...c, name: v }))} />
        <RangeField id="room-w" label={t("room.width")} value={cfg.w} min={10} max={40} step={1} unit="m" onChange={v => setRoom("w", v)} />
        <RangeField id="room-d" label={t("room.length")} value={cfg.d} min={10} max={50} step={1} unit="m" onChange={v => setRoom("d", v)} />
        <p className="note">{t("room.note", { h: fmt(WALL_H), area: fmt(cfg.w * cfg.d) })}</p>
      </div>

      <div className="section">
        <h3>{t("room.looks")}</h3>
        <div className="field">
          <span>{t("room.floor")}</span>
          <div className="floors">
            {FLOORS.map(f => (
              <button key={f.id} className="floor-opt" aria-pressed={cfg.floor === f.id} onClick={() => update(c => ({ ...c, floor: f.id }))}>
                <img src={floorThumb(f.id)} alt="" />
                <span>{t("floors." + f.id)}</span>
              </button>
            ))}
          </div>
        </div>
        <ColorPicker id="wall-custom" label={t("room.wallColor")} value={cfg.wallColor} options={WALL_COLORS} group="wallColors" onChange={v => update(c => ({ ...c, wallColor: v }))} />
        <p className="note">{t("room.wallNote")}</p>
      </div>

      <div className="section">
        <h3>{t("room.furniture")}</h3>
        <div className="row">
          <button className="btn" onClick={() => addPart("wall")}>{t("room.addWall")}</button>
          <button className="btn" onClick={() => addPart("bench")}>{t("room.addBench")}</button>
          <button className="btn" onClick={() => setSel({ kind: "spawn", id: "spawn" })}>{t("room.setEntrance")}</button>
        </div>
        <p className="note">{t("room.furnitureNote")}</p>
      </div>

      <div className="section">
        <h3>{t("room.restart")}</h3>
        <div className="row">
          <ConfirmButton confirmText={t("room.restoreConfirm")} onConfirm={() => { update(() => defaultConfig(lang)); setSel(null); }}>{t("room.restore")}</ConfirmButton>
          <ConfirmButton
            confirmText={t("room.clearConfirm")}
            onConfirm={() => { update(c => ({ ...c, parts: [], arts: [], installs: [], spawn: { x: 0, z: c.d / 2 - 3, yaw: 0 } })); setSel(null); }}
          >
            {t("room.clear")}
          </ConfirmButton>
        </div>
        {gallery.online && gallery.id ? (
          <>
            <p className="note">{t("room.savedAs", { id: gallery.id })}</p>
            <div className="row">
              <button className="btn" onClick={() => { gallery.onNew(); setSel(null); }}>{t("room.newGallery")}</button>
              <ConfirmButton confirmText={t("room.deleteServerConfirm")} onConfirm={() => { gallery.onDelete(); setSel(null); }}>{t("room.deleteServer")}</ConfirmButton>
            </div>
            <p className="note">{t("room.newNote")}</p>
          </>
        ) : (
          <p className="note">{gallery.online ? t("room.autoSave") : t("room.offline")}</p>
        )}
      </div>
    </>
  );
}

/* ---------- Tab Lukisan ---------- */
export function ArtsTab({ cfg, update, sel, setSel, setPlacing, fmap }) {
  const { t, errorText } = useI18n();
  const server = useServer();
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const addFiles = async files => {
    const list = Array.from(files || []).filter(f => /^image\//.test(f.type));
    if (!list.length) return;
    setBusy(true);
    setError("");
    const fresh = [];
    for (const f of list) {
      try {
        const r = await prepareImage(f, server);
        const w = r.ratio > 1.2 ? 1.2 : 1.6;
        fresh.push(genArt({ title: fileTitle(f.name), img: r.img, ratio: r.ratio, w, h: Math.min(3.2, Math.round(w * r.ratio * 100) / 100) }));
      } catch (er) {
        setError(errorText(er));
      }
    }
    update(c => ({ ...c, arts: [...c.arts, ...fresh] }));
    setBusy(false);
    if (fresh.length === 1) {
      setSel({ kind: "art", id: fresh[0].id });
      setPlacing(fresh[0].id);
    }
  };

  const addGenerated = () => {
    const a = genArt({ title: t("arts.newTitle"), gen: { style: pickRandom(STYLES), seed: Math.floor(Math.random() * 999), pal: pickRandom(PALETTES) } });
    update(c => ({ ...c, arts: [...c.arts, a] }));
    setSel({ kind: "art", id: a.id });
    setPlacing(a.id);
  };

  return (
    <>
      <div className="section">
        <label
          className={"drop" + (over ? " over" : "")}
          htmlFor="upload-images"
          onDragOver={e => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={e => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); }}
        >
          <strong>{busy ? t(server.online ? "arts.uploading" : "arts.processing") : t("arts.add")}</strong>
          <span>{t("arts.dropHint")}</span>
        </label>
        <input id="upload-images" type="file" accept="image/*" multiple hidden onChange={e => { addFiles(e.target.files); e.target.value = ""; }} />
        {error && <p className="warn">{error}</p>}
        <div className="row">
          <button className="btn" onClick={addGenerated}>{t("arts.addGenerated")}</button>
        </div>
      </div>

      <div className="list">
        {cfg.arts.length === 0 && <p className="note empty">{t("arts.empty")}</p>}
        {cfg.arts.map((a, i) => {
          const p = place(a, fmap);
          return (
            <button key={a.id} className={"item" + (sel?.kind === "art" && sel.id === a.id ? " sel" : "")} onClick={() => setSel({ kind: "art", id: a.id })}>
              <img className="thumb" src={thumbOf(a)} alt="" />
              <span className="item-text">
                <b>{a.title || t("common.untitled")}</b>
                <span>{p ? faceLabel(t, p.f) : t("arts.notHung")}</span>
              </span>
              <span className="num">{String(i + 1).padStart(2, "0")}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ---------- Tab Instalasi ---------- */
export function InstTab({ cfg, update, sel, setSel }) {
  const { t, errorText } = useI18n();
  const server = useServer();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /* Instalasi baru diletakkan 3,5 m di depan titik masuk */
  const spotAhead = () => {
    const y = cfg.spawn.yaw;
    const x = cfg.spawn.x - Math.sin(y) * 3.5, z = cfg.spawn.z - Math.cos(y) * 3.5;
    return { x: snap(clamp(x, -cfg.w / 2 + 1.5, cfg.w / 2 - 1.5), 0.25), z: snap(clamp(z, -cfg.d / 2 + 1.5, cfg.d / 2 - 1.5), 0.25) };
  };
  const add = it => {
    update(c => ({ ...c, installs: [...c.installs, it] }));
    setSel({ kind: "inst", id: it.id });
  };
  const addModel = async file => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const r = await prepareGLB(file, server);
      add(genInst({ kind: "glb", ...spotAhead(), model: r.model, foot: r.foot, title: fileTitle(file.name) }));
    } catch (er) {
      setError(errorText(er));
    }
    setBusy(false);
  };

  return (
    <>
      <div className="section">
        <h4>{t("inst.add")}</h4>
        <div className="kinds">
          {Object.keys(KINDS).filter(k => k !== "glb").map(k => (
            <button key={k} className="kind" onClick={() => add(genInst({ kind: k, ...spotAhead(), color: pickRandom(INST_COLORS).c, title: t("kinds." + k) }))}>
              <Icon name={k} size={28} />
              {t("kinds." + k)}
            </button>
          ))}
        </div>
        <label className="drop" htmlFor="upload-glb" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addModel(e.dataTransfer.files[0]); }}>
          <strong>{busy ? t("inst.processing") : t("inst.uploadModel")}</strong>
          <span>{t("inst.modelHint", { mb: fmt(server.online ? 25 : 2.5) })}</span>
        </label>
        <input id="upload-glb" type="file" accept=".glb,model/gltf-binary" hidden onChange={e => { addModel(e.target.files[0]); e.target.value = ""; }} />
        {error && <p className="warn">{error}</p>}
      </div>

      <div className="list">
        {cfg.installs.length === 0 && <p className="note empty">{t("inst.empty")}</p>}
        {cfg.installs.map((it, i) => (
          <button key={it.id} className={"item" + (sel?.kind === "inst" && sel.id === it.id ? " sel" : "")} onClick={() => setSel({ kind: "inst", id: it.id })}>
            <span className="thumb-icon" style={{ color: it.kind === "glb" ? "var(--fg)" : it.color }}>
              <Icon name={it.kind} size={24} />
            </span>
            <span className="item-text">
              <b>{it.title || t("common.untitled")}</b>
              <span>{t("kinds." + it.kind)} · {fmt(it.size)} m · {it.rot}°</span>
            </span>
            <span className="num">I{i + 1}</span>
          </button>
        ))}
      </div>
    </>
  );
}
