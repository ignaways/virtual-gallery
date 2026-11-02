import { Fragment } from "react";
import { fmt } from "../../lib/constants.js";
import { useI18n } from "../../i18n/index.jsx";

/** Label karya ala museum yang muncul saat pengunjung mendekat. */
export function Plaque({ exhibit, index, total }) {
  const { t } = useI18n();
  const it = exhibit?.item || { title: "" };
  let meta = [];
  if (exhibit?.type === "art") meta = [it.medium, `${fmt(it.w * 100)} × ${fmt(it.h * 100)} cm`];
  if (exhibit?.type === "inst") meta = [it.medium, t(it.kind === "gantung" ? "plaque.hanging" : "plaque.height", { cm: fmt(it.size * 100) })];
  meta = meta.filter(Boolean);
  const pad = n => String(n).padStart(2, "0");
  const label = exhibit ? t(exhibit.type === "art" ? "plaque.painting" : "plaque.installation", { n: exhibit.type === "art" ? pad(exhibit.num) : exhibit.num }) : "";

  return (
    <div className={"plaque" + (exhibit ? " show" : "")} aria-live="polite">
      <span className="no">{exhibit ? `${label.toUpperCase()} · ${pad(index + 1)}/${pad(total)}` : ""}</span>
      <h2>{it.title || t("common.untitled")}</h2>
      {exhibit && (it.artist || it.year) && <span className="by">{[it.artist, it.year].filter(Boolean).join(", ")}</span>}
      <span className="meta">{meta.map((m, i) => <Fragment key={i}>{i > 0 && <br />}{m}</Fragment>)}</span>
      {exhibit && it.desc && <p>{it.desc}</p>}
    </div>
  );
}
