import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LANG_KEY, setNumberLocale } from "../lib/constants.js";
import en from "./en.js";
import id from "./id.js";

export const LANGUAGES = { en, id };
export const DEFAULT_LANG = "en";

const lookup = (dict, key) => key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), dict);

function readLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && LANGUAGES[saved]) return saved;
  } catch (_) {}
  return DEFAULT_LANG;
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readLang);
  setNumberLocale(LANGUAGES[lang].locale);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback(next => {
    if (!LANGUAGES[next]) return;
    try { localStorage.setItem(LANG_KEY, next); } catch (_) {}
    setLangState(next);
  }, []);

  const value = useMemo(() => {
    const dict = LANGUAGES[lang];
    /** t("room.note", { h: 5 }) — teks bahasa aktif, jatuh ke bahasa Inggris bila kunci tidak ada */
    const t = (key, vars = {}) => {
      let v = lookup(dict, key);
      if (v === undefined) v = lookup(en, key);
      if (v === undefined) return key;
      if (typeof v === "function") return v(vars);
      return String(v).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
    };
    const has = key => lookup(dict, key) !== undefined || lookup(en, key) !== undefined;
    /** Pesan untuk AppError / error API; teks asli bila kodenya tidak dikenal */
    const errorText = e => {
      if (e?.code && has("errors." + e.code)) return t("errors." + e.code, e.params || {});
      return t("errors.generic");
    };
    return { lang, setLang, t, has, errorText, locale: dict.locale };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

/** Label bidang dinding: "North wall" / "Partition 1 · side A" */
export const faceLabel = (t, f) => (f.part ? t("faces.partition", { n: f.n, side: f.side }) : t("faces." + f.id));

/** Tombol EN / ID */
export function LangSwitch({ dark }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={"lang" + (dark ? " dark" : "")} role="group" aria-label={t("common.language")}>
      {Object.keys(LANGUAGES).map(code => (
        <button key={code} aria-pressed={lang === code} title={LANGUAGES[code].langName} onClick={() => setLang(code)}>
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
