import { useEffect, useState } from "react";
import { fmt, normDeg } from "../../lib/constants.js";
import { useI18n } from "../../i18n/index.jsx";
import { Icon } from "./Icon.jsx";

/** Tombol hapus dua langkah: klik pertama meminta konfirmasi, klik kedua menjalankan. */
export function ConfirmButton({ children, confirmText, onConfirm }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button className={"btn danger" + (armed ? " armed" : "")} onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}>
      {armed ? confirmText : children}
    </button>
  );
}

export function RotateControl({ id, value, onChange }) {
  const { t } = useI18n();
  const [txt, setTxt] = useState(String(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => setTxt(String(value)), [value]);

  const step = d => {
    const label = t(d < 0 ? "fields.rotateLeft" : "fields.rotateRight", { deg: Math.abs(d) });
    return (
      <button className="btn" onClick={() => onChange(normDeg(value + d))} title={label + "°"} aria-label={label + " " + t("fields.degrees")}>
        <Icon name={d < 0 ? "ccw" : "cw"} />
        {Math.abs(d)}°
      </button>
    );
  };
  const commit = () => {
    setFocus(false);
    const n = parseInt(txt, 10);
    if (!isNaN(n)) onChange(normDeg(n));
    else setTxt(String(value));
  };

  return (
    <div className="field">
      <span>{t("fields.rotation")}</span>
      <div className="rot">
        {step(-90)}
        {step(-15)}
        <input
          id={id}
          type="text"
          inputMode="numeric"
          aria-label={t("fields.angleAria")}
          value={focus ? txt : value + "°"}
          onFocus={e => { setFocus(true); setTxt(String(value)); const el = e.target; requestAnimationFrame(() => el.select()); }}
          onChange={e => setTxt(e.target.value.replace(/[^\d-]/g, ""))}
          onBlur={commit}
          onKeyDown={e => e.key === "Enter" && e.target.blur()}
        />
        {step(15)}
        {step(90)}
      </div>
    </div>
  );
}

/** options: [{ id, c }]; nama warna diambil dari kamus `group` (wallColors / instColors) */
export function ColorPicker({ id, label, value, options, group, onChange }) {
  const { t } = useI18n();
  const match = options.find(o => o.c.toLowerCase() === value.toLowerCase());
  return (
    <div className="field">
      <span>{label}</span>
      <div className="colors">
        {options.map(o => {
          const name = t(`${group}.${o.id}`);
          return <button key={o.c} className="dot" style={{ background: o.c }} title={name} aria-label={name} aria-pressed={match?.c === o.c} onClick={() => onChange(o.c)} />;
        })}
        <label className="custom-color" htmlFor={id} title={t("fields.otherColor")}>
          <input id={id} type="color" value={value} onChange={e => onChange(e.target.value)} />
          {t("fields.custom")}
        </label>
      </div>
      <span className="color-name">{(match ? t(`${group}.${match.id}`) : t("fields.customColor")) + " · " + value.toUpperCase()}</span>
    </div>
  );
}

export function RangeField({ id, label, value, min, max, step, unit, onChange }) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <div className="range">
        <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} />
        <output htmlFor={id}>{fmt(value)} {unit}</output>
      </div>
    </label>
  );
}

export function TextField({ id, label, value, onChange, area }) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      {area
        ? <textarea id={id} value={value} rows={3} onChange={e => onChange(e.target.value)} />
        : <input id={id} type="text" value={value} onChange={e => onChange(e.target.value)} />}
    </label>
  );
}

/** Judul, perupa, tahun, medium, deskripsi — dipakai lukisan dan instalasi. */
export function CaptionFields({ item, set }) {
  const { t } = useI18n();
  return (
    <>
      <TextField id={"title-" + item.id} label={t("fields.title")} value={item.title} onChange={v => set({ title: v })} />
      <div className="two">
        <TextField id={"artist-" + item.id} label={t("fields.artist")} value={item.artist} onChange={v => set({ artist: v })} />
        <TextField id={"year-" + item.id} label={t("fields.year")} value={String(item.year || "")} onChange={v => set({ year: v })} />
      </div>
      <TextField id={"medium-" + item.id} label={t("fields.medium")} value={item.medium} onChange={v => set({ medium: v })} />
      <TextField id={"desc-" + item.id} label={t("fields.description")} value={item.desc} area onChange={v => set({ desc: v })} />
    </>
  );
}
