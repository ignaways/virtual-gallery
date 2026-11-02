import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEG, normDeg } from "../../lib/constants.js";
import { facesOf, place } from "../../lib/geometry.js";
import { LangSwitch, useI18n } from "../../i18n/index.jsx";
import { Plan } from "./Plan.jsx";
import { ArtEditor, InstEditor, PartEditor, SpawnEditor } from "./editors.jsx";
import { ArtsTab, InstTab, RoomTab } from "./tabs.jsx";

/** Halaman beranda: denah di kiri, panel pengaturan di kanan. */
export function Home({ cfg, update, onEnter, gallery }) {
  const { t, errorText } = useI18n();
  const [tab, setTab] = useState("room");
  const [sel, setSel] = useState(null);
  const [placing, setPlacing] = useState(null);
  const [share, setShare] = useState(null); // { url } | { error } | null
  const fmap = useMemo(() => Object.fromEntries(facesOf(cfg).map(f => [f.id, f])), [cfg]);
  const placedCount = cfg.arts.filter(a => place(a, fmap)).length;
  const storedCount = cfg.arts.length - placedCount;

  // pindah ke tab yang sesuai saat sebuah karya dipilih di denah
  useEffect(() => {
    if (sel?.kind === "art") setTab("arts");
    if (sel?.kind === "inst") setTab("inst");
  }, [sel?.kind, sel?.id]);

  const rotateSel = useCallback(
    delta => {
      if (!sel) return;
      if (sel.kind === "part") update(c => ({ ...c, parts: c.parts.map(p => (p.id === sel.id ? { ...p, rot: normDeg(p.rot + delta) } : p)) }));
      else if (sel.kind === "inst") update(c => ({ ...c, installs: c.installs.map(i => (i.id === sel.id ? { ...i, rot: normDeg(i.rot + delta) } : i)) }));
      else if (sel.kind === "spawn") update(c => ({ ...c, spawn: { ...c.spawn, yaw: -normDeg(-c.spawn.yaw / DEG + delta) * DEG } }));
    },
    [sel, update]
  );

  // Q / E memutar benda terpilih, Shift untuk 90°, Esc membatalkan pemasangan
  useEffect(() => {
    const onKey = e => {
      if (e.key === "Escape") return setPlacing(null);
      if (/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === "q" || k === "e") {
        e.preventDefault();
        rotateSel((k === "q" ? -1 : 1) * (e.shiftKey ? 90 : 15));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rotateSel]);

  const openShare = async () => {
    try {
      setShare({ url: await gallery.onShare() });
    } catch (e) {
      setShare({ error: errorText(e) });
    }
  };

  const selArt = sel?.kind === "art" && cfg.arts.find(a => a.id === sel.id);
  const selPart = sel?.kind === "part" && cfg.parts.find(p => p.id === sel.id);
  const selInst = sel?.kind === "inst" && cfg.installs.find(i => i.id === sel.id);
  const placingArt = placing && cfg.arts.find(a => a.id === placing);

  let selPanel = null;
  if (selArt) selPanel = <ArtEditor key={selArt.id} art={selArt} idx={cfg.arts.indexOf(selArt)} update={update} setSel={setSel} setPlacing={setPlacing} fmap={fmap} />;
  else if (selInst) selPanel = <InstEditor key={selInst.id} inst={selInst} idx={cfg.installs.indexOf(selInst)} update={update} setSel={setSel} />;
  else if (selPart) selPanel = <PartEditor key={selPart.id} part={selPart} cfg={cfg} update={update} setSel={setSel} />;
  else if (sel?.kind === "spawn") selPanel = <SpawnEditor cfg={cfg} update={update} />;

  const tabs = [
    ["room", t("tabs.room")],
    ["arts", t("tabs.paintings", { n: cfg.arts.length })],
    ["inst", t("tabs.installations", { n: cfg.installs.length })],
  ];

  return (
    <div className="home">
      <header className="home-head">
        <div className="home-brand">
          <span className="label">{t("home.eyebrow")}</span>
          <h1>{t("home.titleBefore")}<em>{cfg.name || t("common.unnamed")}</em>{t("home.titleAfter")}</h1>
        </div>
        <div className="head-actions">
          <span className="stat">
            <b>{placedCount}</b> {t("home.paintings", { n: placedCount })} · <b>{cfg.installs.length}</b> {t("home.installations", { n: cfg.installs.length })} · <b>{storedCount}</b> {t("home.inStorage")}
          </span>
          <SaveStatus gallery={gallery} />
          <LangSwitch />
          <button className="btn" onClick={openShare} disabled={!gallery.online} title={gallery.online ? "" : t("home.shareNeedsServer")}>{t("home.share")}</button>
          <button className="btn primary" onClick={onEnter}>{t("home.enter")}</button>
        </div>
      </header>

      <div className="workspace">
        <div className="plan-wrap">
          <div className="plan-bar">
            <span className="label">{t("plan.label")}</span>
            <p>
              {t("plan.hint1")} <kbd>Q</kbd> / <kbd>E</kbd> {t("plan.hint2")} <kbd>Shift</kbd> {t("plan.hint3")}
            </p>
          </div>
          {placingArt && (
            <div className="placing-banner" role="status">
              <span>{t("plan.placing", { title: placingArt.title || t("common.painting") })}</span>
              <button onClick={() => setPlacing(null)}>{t("common.cancel")}</button>
            </div>
          )}
          <div className="plan-box">
            <Plan cfg={cfg} update={update} sel={sel} setSel={setSel} placing={placing} setPlacing={setPlacing} rotateSel={rotateSel} />
          </div>
        </div>

        <aside className="side">
          {share && <ShareBox share={share} onClose={() => setShare(null)} />}
          {gallery.save.state === "local-full" && (
            <div className="section">
              <p className="warn">{t("home.storageFull")}</p>
            </div>
          )}
          {selPanel}
          <div className="tabs" role="tablist">
            {tabs.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
          {tab === "room" && <RoomTab cfg={cfg} update={update} setSel={setSel} gallery={gallery} />}
          {tab === "arts" && <ArtsTab cfg={cfg} update={update} sel={sel} setSel={setSel} setPlacing={setPlacing} fmap={fmap} />}
          {tab === "inst" && <InstTab cfg={cfg} update={update} sel={sel} setSel={setSel} />}
        </aside>
      </div>
    </div>
  );
}

function SaveStatus({ gallery }) {
  const { t, errorText, locale } = useI18n();
  const { online, save } = gallery;
  let text, tone = "", title = "";
  if (!online) { text = t("save.local"); tone = "muted"; title = t("save.localTitle"); }
  else if (save.state === "saving") text = t("save.saving");
  else if (save.state === "saved") text = t("save.saved", { time: new Date(save.at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) });
  else if (save.state === "error") { text = t("save.error"); tone = "bad"; title = errorText(save.error); }
  else { text = t("save.idle"); tone = "muted"; }
  return <span className={"save " + tone} title={title} role="status">{text}</span>;
}

function ShareBox({ share, onClose }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      ref.current?.select();
    }
  };
  return (
    <div className="section share" role="dialog" aria-label={t("share.title")}>
      <div className="sel-head">
        <h3>{t("share.title")}</h3>
        <button className="btn" onClick={onClose}>{t("common.close")}</button>
      </div>
      {share.error ? (
        <p className="warn">{share.error}</p>
      ) : (
        <>
          <p className="note">{t("share.note")}</p>
          <div className="share-row">
            <input ref={ref} id="share-url" readOnly value={share.url} onFocus={e => e.target.select()} />
            <button className="btn" onClick={copy}>{copied ? t("share.copied") : t("share.copy")}</button>
          </div>
          <a className="btn" href={share.url} target="_blank" rel="noreferrer">{t("share.open")}</a>
        </>
      )}
    </div>
  );
}
