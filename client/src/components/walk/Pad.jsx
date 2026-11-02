import { useI18n } from "../../i18n/index.jsx";

/** Tombol arah di layar sentuh; menulis langsung ke objek input yang dibaca mesin 3D tiap frame. */
export function Pad({ input }) {
  const { t } = useI18n();
  const btn = (cls, key, label, name) => (
    <button
      className={cls}
      aria-label={name}
      onPointerDown={e => { e.preventDefault(); input[key] = true; }}
      onPointerUp={() => { input[key] = false; }}
      onPointerLeave={() => { input[key] = false; }}
      onPointerCancel={() => { input[key] = false; }}
    >
      {label}
    </button>
  );
  return (
    <div className="pad">
      {btn("up", "up", "▲", t("walk.forward"))}
      {btn("left", "left", "◀", t("walk.left"))}
      {btn("down", "down", "▼", t("walk.backward"))}
      {btn("right", "right", "▶", t("walk.right"))}
    </div>
  );
}
