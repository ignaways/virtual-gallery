import { useRef, useState } from "react";
import { DEG, FINISHES, INST_COLORS, KINDS, PALETTES, PART_H, STYLES, clamp, fmt, normDeg } from "../../lib/constants.js";
import { place } from "../../lib/geometry.js";
import { thumbOf } from "../../lib/textures.js";
import { prepareGLB, prepareImage } from "../../lib/files.js";
import { useServer } from "../../context/ServerContext.js";
import { faceLabel, useI18n } from "../../i18n/index.jsx";
import { Icon } from "../ui/Icon.jsx";
import { CaptionFields, ColorPicker, ConfirmButton, RangeField, RotateControl } from "../ui/fields.jsx";

const randomPalette = () => PALETTES[Math.floor(Math.random() * PALETTES.length)];

export function ArtEditor({ art, idx, update, setSel, setPlacing, fmap }) {
  const { t, errorText } = useI18n();
  const server = useServer();
  const fileRef = useRef(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = patch => update(c => ({ ...c, arts: c.arts.map(a => (a.id === art.id ? { ...a, ...patch } : a)) }));
  const p = place(art, fmap);

  const replace = async e => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    try {
      const r = await prepareImage(f, server);
      set({ img: r.img, ratio: r.ratio, h: Math.round(art.w * r.ratio * 100) / 100 });
      setErr("");
    } catch (er) {
      setErr(errorText(er));
    }
    setBusy(false);
  };

  return (
    <div className="section">
      <div className="sel-head">
        <h3>{t("editor.painting", { n: idx + 1 })}</h3>
        <span className={"pill" + (p ? "" : " off")}>{p ? faceLabel(t, p.f) : t("arts.notHung")}</span>
      </div>
      <img className="preview" src={thumbOf(art)} alt={t("editor.preview", { title: art.title || t("common.untitled") })} />
      <div className="row">
        <button className="btn" onClick={() => fileRef.current.click()}>
          {busy ? t("editor.uploading") : art.img ? t("editor.replaceImage") : t("editor.uploadImage")}
        </button>
        {art.img && <button className="btn" onClick={() => set({ img: null, ratio: null })}>{t("editor.useGenerated")}</button>}
        <input ref={fileRef} id={"replace-" + art.id} type="file" accept="image/*" hidden onChange={replace} />
      </div>
      {err && <p className="warn">{err}</p>}

      {!art.img && (
        <div className="two">
          <label className="field" htmlFor={"style-" + art.id}>
            <span>{t("editor.pattern")}</span>
            <select id={"style-" + art.id} value={art.gen.style} onChange={e => set({ gen: { ...art.gen, style: e.target.value } })}>
              {STYLES.map(k => <option key={k} value={k}>{t("styles." + k)}</option>)}
            </select>
          </label>
          <div className="field">
            <span>{t("editor.variation")}</span>
            <button className="btn" onClick={() => set({ gen: { ...art.gen, seed: Math.floor(Math.random() * 999), pal: randomPalette() } })}>{t("editor.shuffle")}</button>
          </div>
        </div>
      )}

      <CaptionFields item={art} set={set} />
      <RangeField
        id={"w-" + art.id} label={t("editor.width")} value={art.w} min={0.4} max={4} step={0.05} unit="m"
        onChange={v => set(art.ratio ? { w: v, h: Math.min(3.2, Math.round(v * art.ratio * 100) / 100) } : { w: v })}
      />
      {art.ratio
        ? <p className="note">{t("editor.heightFromRatio", { h: fmt(art.h) })}</p>
        : <RangeField id={"h-" + art.id} label={t("editor.height")} value={art.h} min={0.4} max={3.2} step={0.05} unit="m" onChange={v => set({ h: v })} />}
      {p && !p.fits && <p className="warn">{t("editor.tooWide")}</p>}

      <div className="row">
        <button className="btn" onClick={() => setPlacing(art.id)}>{p ? t("editor.moveWall") : t("editor.hang")}</button>
        {p && <button className="btn" onClick={() => set({ face: null })}>{t("editor.takeDown")}</button>}
        <ConfirmButton confirmText={t("editor.deletePainting")} onConfirm={() => { update(c => ({ ...c, arts: c.arts.filter(a => a.id !== art.id) })); setSel(null); }}>
          {t("common.delete")}
        </ConfirmButton>
      </div>
    </div>
  );
}

export function InstEditor({ inst, idx, update, setSel }) {
  const { t, errorText } = useI18n();
  const server = useServer();
  const fileRef = useRef(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = patch => update(c => ({ ...c, installs: c.installs.map(i => (i.id === inst.id ? { ...i, ...patch } : i)) }));
  const kind = KINDS[inst.kind];
  const isModel = inst.kind === "glb";

  const replace = async e => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    try {
      const r = await prepareGLB(f, server);
      set({ kind: "glb", model: r.model, foot: r.foot });
      setErr("");
    } catch (er) {
      setErr(errorText(er));
    }
    setBusy(false);
  };

  return (
    <div className="section">
      <div className="sel-head">
        <h3>{t("editor.installation", { n: idx + 1 })}</h3>
        <span className="pill">{t("kinds." + inst.kind)}</span>
      </div>
      <div className="preview-icon" style={{ color: isModel ? "var(--fg)" : inst.color }}>
        <Icon name={inst.kind} size={56} />
      </div>

      {isModel ? (
        <div className="row">
          <button className="btn" onClick={() => fileRef.current.click()}>{busy ? t("editor.processing") : t("editor.replaceModel")}</button>
          <input ref={fileRef} id={"glb-" + inst.id} type="file" accept=".glb,model/gltf-binary" hidden onChange={replace} />
        </div>
      ) : (
        <label className="field" htmlFor={"kind-" + inst.id}>
          <span>{t("editor.shape")}</span>
          <select
            id={"kind-" + inst.id}
            value={inst.kind}
            onChange={e => { const k = e.target.value; set({ kind: k, size: clamp(inst.size, KINDS[k].min, KINDS[k].max) }); }}
          >
            {Object.keys(KINDS).filter(k => k !== "glb").map(k => <option key={k} value={k}>{t("kinds." + k)}</option>)}
          </select>
        </label>
      )}
      {err && <p className="warn">{err}</p>}

      <RangeField
        id={"size-" + inst.id} label={inst.kind === "gantung" ? t("editor.hangLength") : t("editor.height")}
        value={inst.size} min={kind.min} max={kind.max} step={0.05} unit="m" onChange={v => set({ size: v })}
      />
      <RotateControl id={"rot-" + inst.id} value={inst.rot} onChange={v => set({ rot: v })} />

      {isModel ? (
        <p className="note">{t("editor.modelColors")}</p>
      ) : (
        <>
          <ColorPicker id={"icolor-" + inst.id} label={t("editor.color")} value={inst.color} options={INST_COLORS} group="instColors" onChange={v => set({ color: v })} />
          <div className="field">
            <span>{t("editor.finish")}</span>
            <div className="row">
              {FINISHES.map(k => (
                <button key={k} className={"btn" + (inst.finish === k ? " on" : "")} aria-pressed={inst.finish === k} onClick={() => set({ finish: k })}>
                  {t("finishes." + k)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <CaptionFields item={inst} set={set} />
      <p className="note">{inst.kind === "gantung" ? t("editor.hangingNote") : t("editor.solidNote")}</p>
      <div className="row">
        <ConfirmButton confirmText={t("editor.deleteInstallation")} onConfirm={() => { update(c => ({ ...c, installs: c.installs.filter(i => i.id !== inst.id) })); setSel(null); }}>
          {t("common.delete")}
        </ConfirmButton>
      </div>
    </div>
  );
}

export function PartEditor({ part, cfg, update, setSel }) {
  const { t } = useI18n();
  const set = patch => update(c => ({ ...c, parts: c.parts.map(p => (p.id === part.id ? { ...p, ...patch } : p)) }));
  const hung = cfg.arts.filter(a => a.face?.split(":")[0] === part.id).length;
  const isWall = part.type === "wall";
  const idx = cfg.parts.filter(p => p.type === part.type).indexOf(part) + 1;

  const remove = () => {
    update(c => ({
      ...c,
      parts: c.parts.filter(p => p.id !== part.id),
      arts: c.arts.map(a => (a.face?.split(":")[0] === part.id ? { ...a, face: null } : a)),
    }));
    setSel(null);
  };

  return (
    <div className="section">
      <div className="sel-head">
        <h3>{t(isWall ? "editor.partition" : "editor.bench", { n: idx })}</h3>
        {isWall && <span className="pill">{t("editor.hungCount", { n: hung })}</span>}
      </div>
      <RotateControl id={"rot-" + part.id} value={part.rot} onChange={v => set({ rot: v })} />
      {isWall && (
        <RangeField id={"len-" + part.id} label={t("editor.length")} value={part.len} min={1} max={Math.max(cfg.w, cfg.d) - 2} step={0.1} unit="m" onChange={v => set({ len: v })} />
      )}
      <p className="note">
        {t("editor.dragNote")} {isWall ? t("editor.wallNote", { h: fmt(PART_H) }) : t("editor.benchNote")}
      </p>
      <div className="row">
        <ConfirmButton confirmText={hung ? t("editor.deleteWithPaintings", { n: hung }) : t("editor.confirmDelete")} onConfirm={remove}>
          {isWall ? t("editor.deletePartition") : t("editor.deleteBench")}
        </ConfirmButton>
      </div>
    </div>
  );
}

export function SpawnEditor({ cfg, update }) {
  const { t } = useI18n();
  return (
    <div className="section">
      <h3>{t("editor.entrance")}</h3>
      <p className="note">{t("editor.entranceNote")}</p>
      <RotateControl
        id="rot-spawn"
        value={normDeg(-cfg.spawn.yaw / DEG)}
        onChange={v => update(c => ({ ...c, spawn: { ...c.spawn, yaw: -v * DEG } }))}
      />
    </div>
  );
}
