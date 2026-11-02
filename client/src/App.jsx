import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Home } from "./components/home/Home.jsx";
import { Walk } from "./components/walk/Walk.jsx";
import { ServerContext } from "./context/ServerContext.js";
import { LangSwitch, useI18n } from "./i18n/index.jsx";
import { api } from "./lib/api.js";
import { SESSION_KEY, STORE_KEY } from "./lib/constants.js";
import { defaultConfig, loadConfig, normalize } from "./lib/model.js";

const SHARED_PATH = /^\/g\/([A-Za-z0-9_-]{10})\/?$/;

/* Sesi = galeri di server milik browser ini: { id, editKey } */
const readSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch (_) { return null; }
};
const writeSession = s => {
  try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch (_) {}
};

export function App() {
  const shared = window.location.pathname.match(SHARED_PATH);
  return shared ? <SharedGallery id={shared[1]} /> : <Editor />;
}

/** Halaman /g/:id — pengunjung hanya bisa berjalan, tidak bisa mengubah. */
function SharedGallery({ id }) {
  const { t, lang } = useI18n();
  const [state, setState] = useState({ status: "loading" });
  useEffect(() => {
    api.getGallery(id)
      .then(g => setState({ status: "ready", cfg: normalize(g.config, lang) }))
      .catch(e => setState({ status: "error", code: e.status === 404 ? "notFound" : "loadFailed" }));
  }, [id]);

  if (state.status === "ready") return <Walk cfg={state.cfg} />;
  return (
    <div className="notice">
      <div className="notice-top">
        <span className="label">Ruang Sunyi</span>
        <LangSwitch />
      </div>
      <h1>{state.status === "loading" ? t("shared.loading") : t("shared.unavailable")}</h1>
      {state.code && <p>{t("errors." + state.code)}</p>}
      {state.status === "error" && <a className="btn primary" href="/">{t("walk.createOwn")}</a>}
    </div>
  );
}

/** Editor + mode jalan. Simpan otomatis ke server bila terhubung, selalu juga ke localStorage. */
function Editor() {
  const { lang } = useI18n();
  const [cfg, setCfg] = useState(() => loadConfig(lang));
  const [view, setView] = useState(() => (window.location.hash === "#galeri" ? "walk" : "home"));
  const [server, setServer] = useState({ online: false, uploads: "local" });
  const [session, setSession] = useState(readSession);
  const [save, setSave] = useState({ state: "idle" });
  const sessionRef = useRef(session);
  const cfgRef = useRef(cfg);
  const changed = useRef(false); // hanya simpan ke server setelah pengguna benar-benar mengubah sesuatu
  const creating = useRef(null);
  sessionRef.current = session;
  cfgRef.current = cfg;
  const online = server.online;

  // Cek server, lalu muat galeri milik browser ini bila ada
  useEffect(() => {
    let alive = true;
    (async () => {
      let health;
      try {
        health = await api.health();
      } catch (_) {
        return;
      }
      if (!alive) return;
      const s = readSession();
      if (s) {
        try {
          const g = await api.getGallery(s.id);
          if (!alive) return;
          if (!changed.current) setCfg(normalize(g.config, lang));
          setSave({ state: "saved", at: g.updatedAt });
        } catch (e) {
          if (e.status === 404) { writeSession(null); setSession(null); }
        }
      }
      if (alive) setServer({ online: true, uploads: health.uploads || "local" });
    })();
    return () => { alive = false; };
  }, []);

  const ensureSession = useCallback(async () => {
    if (sessionRef.current) return sessionRef.current;
    if (!creating.current) {
      creating.current = api.createGallery(cfgRef.current)
        .then(r => {
          const s = { id: r.id, editKey: r.editKey };
          writeSession(s);
          sessionRef.current = s;
          setSession(s);
          setSave({ state: "saved", at: r.updatedAt });
          return s;
        })
        .finally(() => { creating.current = null; });
    }
    return creating.current;
  }, []);

  // Simpan otomatis
  useEffect(() => {
    let localOk = true;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(cfg)); } catch (_) { localOk = false; }
    if (!online) {
      setSave({ state: localOk ? "idle" : "local-full" });
      return;
    }
    if (!changed.current) return;
    setSave(s => ({ ...s, state: "saving" }));
    const timer = setTimeout(async () => {
      changed.current = false;
      try {
        const s = await ensureSession();
        const r = await api.saveGallery(s.id, s.editKey, cfgRef.current);
        setSave({ state: "saved", at: r.updatedAt });
      } catch (e) {
        changed.current = true;
        setSave({ state: "error", error: e });
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [cfg, online, ensureSession]);

  const update = useCallback(fn => {
    changed.current = true;
    setCfg(c => fn(c));
  }, []);

  /* Unggah file: langsung ke Vercel Blob di produksi, atau lewat server di mode lokal */
  const upload = useCallback(async (blob, name, contentType) => {
    const s = await ensureSession();
    const r = server.uploads === "blob"
      ? await api.uploadBlob(s.id, s.editKey, blob, contentType)
      : await api.uploadLocal(s.id, s.editKey, blob, name);
    return r.url;
  }, [ensureSession, server.uploads]);

  const startNew = useCallback(() => {
    writeSession(null);
    sessionRef.current = null;
    setSession(null);
    changed.current = false;
    setCfg(defaultConfig(lang));
    setSave({ state: "idle" });
  }, [lang]);

  const gallery = {
    online,
    id: session?.id || null,
    save,
    onShare: async () => `${window.location.origin}/g/${(await ensureSession()).id}`,
    onNew: startNew,
    onDelete: async () => {
      const s = sessionRef.current;
      if (!s) return;
      try {
        await api.deleteGallery(s.id, s.editKey);
        startNew();
      } catch (e) {
        setSave({ state: "error", error: e });
      }
    },
  };

  const serverCtx = useMemo(() => ({ online, upload }), [online, upload]);
  const go = v => {
    setView(v);
    try { window.history.replaceState(null, "", v === "walk" ? "#galeri" : window.location.pathname); } catch (_) {}
  };

  return (
    <ServerContext.Provider value={serverCtx}>
      {view === "walk"
        ? <Walk cfg={cfg} onBack={() => go("home")} />
        : <Home cfg={cfg} update={update} onEnter={() => go("walk")} gallery={gallery} />}
    </ServerContext.Provider>
  );
}
