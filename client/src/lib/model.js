/* Data galeri: nilai awal (contoh dalam dua bahasa), migrasi versi lama, dan pemuatan dari localStorage */
import { STORE_KEY, PALETTES, FLOORS, KINDS, uid } from "./constants.js";
import { footOf, obstaclesOf } from "./geometry.js";

export function genArt(o) {
  return Object.assign({ id: uid(), title: "", artist: "", year: new Date().getFullYear(), medium: "", desc: "",
    w: 1.6, h: 1.2, img: null, ratio: null, gen: { style: "orbits", seed: 1, pal: PALETTES[1] }, face: null, t: 0 }, o);
}
export function genInst(o) {
  const kind = (o && o.kind) || "monolit";
  return Object.assign({ id: uid(), kind, x: 0, z: 0, rot: 0, size: KINDS[kind].size, color: "#e9e4dc", finish: "doff",
    title: "", artist: "", year: new Date().getFullYear(), medium: "", desc: "", model: null, foot: null }, o);
}

/* Teks contoh: [medium, deskripsi] per bahasa. Judul karya dan nama perupa tidak diterjemahkan. */
const SAMPLE_TEXT = {
  en: {
    gerbang: ["Cast resin with andesite texture", "A body-height slab with an opening at its center, made to be looked through from both sides."],
    simpul: ["Polished brass", "A single unbroken line that turns slowly on its pedestal."],
    menara: ["Painted teak", "Seven blocks, each turned slightly from the one beneath it."],
    embun: ["Glazed ceramic", "Nine ceramic spheres gathered like morning dew on a taro leaf."],
    angin: ["Aluminium and steel wire", "A mobile that drifts with the air moving through the room."],
    tangga: ["Blackened steel", "Twenty rods rising like the steps of a pelog scale."],
    senja: ["Acrylic on linen", "Stacked fields of color that echo the last hour before dark on Java's north coast."],
    orbit: ["Pigment print", "Overlapping circles drawn from notes on the sun's path across a studio window."],
    ladang: ["Gouache on paper", "Rice fields seen from above, reduced to plots and rhythm."],
    arus: ["Ink on canvas", "Hundreds of fine lines following a river's current from a single bridge."],
    kaca: ["Oil on panel", "A composition of triangles drawn from the windows of an old church in Semarang."],
    ubin: ["Screen print on paper", "Terrazzo tiles from an old family house, shuffled at random yet still connected."],
    kabut: ["Acrylic on linen", "Color fields in the cool temperature of the highlands."],
    gema: ["Pigment print", "Recorded gamelan, translated into concentric rings."],
    peta: ["Gouache on paper", "An imaginary map with no place names."],
    hujan: ["Ink on canvas", "An afternoon rain in Bandung, recorded as the vibration of lines per minute."],
    duaArah: ["Oil on panel", "Its reverse side holds its companion piece."],
    sambungan: ["Screen print on paper", "A tile pattern with its joining rules reversed."],
  },
  id: {
    gerbang: ["Resin cor bertekstur andesit", "Lubang di tengah lempeng setinggi tubuh, dibuat untuk dilihat tembus dari dua arah."],
    simpul: ["Kuningan dipoles", "Satu garis yang tidak pernah putus, berputar pelan di atas alasnya."],
    menara: ["Kayu jati berlapis cat", "Tujuh balok yang masing-masing diputar sedikit dari balok di bawahnya."],
    embun: ["Keramik glasir", "Sembilan bola keramik yang berkumpul seperti embun pagi di daun talas."],
    angin: ["Aluminium dan kawat baja", "Mobil gantung yang bergerak mengikuti aliran udara ruangan."],
    tangga: ["Baja hitam", "Dua puluh tiang yang meninggi seperti nada tangga pelog."],
    senja: ["Akrilik di atas linen", "Bidang warna bertumpuk yang meniru jam terakhir sebelum gelap di pesisir utara Jawa."],
    orbit: ["Cetak pigmen", "Lingkaran yang saling bergeser, dibuat dari catatan lintasan matahari di jendela studio."],
    ladang: ["Gouache di atas kertas", "Sawah dilihat dari atas, disederhanakan menjadi petak dan ritme."],
    arus: ["Tinta di atas kanvas", "Ratusan garis tipis yang mengikuti arus sungai dari satu jembatan."],
    kaca: ["Minyak di atas panel", "Komposisi segitiga yang lahir dari jendela gereja tua di Semarang."],
    ubin: ["Sablon di atas kertas", "Pola ubin teraso rumah lama, disusun ulang secara acak tapi tetap bersambung."],
    kabut: ["Akrilik di atas linen", "Bidang warna dengan suhu dingin dataran tinggi."],
    gema: ["Cetak pigmen", "Suara gamelan yang direkam, lalu diterjemahkan menjadi cincin konsentris."],
    peta: ["Gouache di atas kertas", "Kartografi imajiner tanpa nama tempat."],
    hujan: ["Tinta di atas kanvas", "Hujan sore di Bandung, dicatat sebagai getaran garis per menit."],
    duaArah: ["Minyak di atas panel", "Sisi baliknya menyimpan karya pasangannya."],
    sambungan: ["Sablon di atas kertas", "Pola ubin dengan aturan sambungan yang dibalik."],
  },
};
const sample = (lang, key) => {
  const [medium, desc] = (SAMPLE_TEXT[lang] || SAMPLE_TEXT.en)[key];
  return { medium, desc };
};

export function defaultInstalls(lang = "en") {
  const i = (key, o) => genInst({ ...o, ...sample(lang, key) });
  return [
    i("gerbang", { kind: "monolit", x: -6, z: -9, color: "#7d7a74", finish: "doff", title: "Gerbang Napas", artist: "Wening Sasmita", year: 2025 }),
    i("simpul", { kind: "simpul", x: 6, z: -9, color: "#c9a35b", finish: "logam", title: "Simpul Waktu", artist: "Arief Kusuma", year: 2024 }),
    i("menara", { kind: "tumpuk", x: -6, z: 9, color: "#a5583c", finish: "kilap", title: "Menara Puntir", artist: "Nadia Prameswari", year: 2025 }),
    i("embun", { kind: "bola", x: 6, z: 9, color: "#e9e4dc", finish: "kilap", title: "Gugus Embun", artist: "Wening Sasmita", year: 2023 }),
    i("angin", { kind: "gantung", x: 0, z: -14, size: 1.8, color: "#2f3b4c", finish: "logam", title: "Angin Utara", artist: "Arief Kusuma", year: 2025 }),
    i("tangga", { kind: "spiral", x: -8, z: 0, color: "#2b2927", finish: "logam", title: "Tangga Bunyi", artist: "Nadia Prameswari", year: 2024 }),
  ];
}

export function defaultConfig(lang = "en") {
  const a = (key, title, artist, year, style, seed, pal, w, h, face, t) =>
    genArt({ title, artist, year, w, h, gen: { style, seed, pal: PALETTES[pal] }, face, t, ...sample(lang, key) });
  return {
    name: "Ruang Sunyi", w: 24, d: 36, floor: "kayu", wallColor: "#e9e4da",
    spawn: { x: 0, z: 15, yaw: 0 },
    parts: [
      { id: "p1", type: "wall", x: 0, z: 0, len: 8.3, rot: 0 },
      { id: "b1", type: "bench", x: 0, z: 9, rot: 0 },
      { id: "b2", type: "bench", x: 0, z: -9, rot: 0 },
    ],
    installs: defaultInstalls(lang),
    arts: [
      a("senja", "Tiga Lapis Senja", "Sekar Wulandari", 2024, "field", 11, 0, 2.4, 1.8, "W", -12),
      a("orbit", "Orbit Pagi", "Bayu Prasetyo", 2023, "orbits", 4, 1, 1.6, 1.6, "W", -4),
      a("ladang", "Petak Ladang", "Rara Anindita", 2025, "grid", 27, 2, 1.5, 2.0, "W", 4),
      a("arus", "Arus Bawah", "Dimas Hartono", 2022, "waves", 8, 3, 2.8, 1.5, "W", 12),
      a("kaca", "Pecahan Kaca", "Laras Kinanti", 2024, "shards", 51, 4, 1.6, 2.0, "E", -12),
      a("ubin", "Ubin Kakek", "Gilang Ramadhan", 2025, "truchet", 3, 5, 1.7, 1.7, "E", -4),
      a("kabut", "Kabut Dieng", "Sekar Wulandari", 2025, "field", 92, 6, 2.2, 1.6, "E", 4),
      a("gema", "Gema", "Bayu Prasetyo", 2025, "orbits", 63, 7, 1.8, 1.8, "E", 12),
      a("peta", "Peta Tanpa Kota", "Rara Anindita", 2023, "grid", 14, 2, 3.2, 1.8, "N", 0),
      a("hujan", "Garis Hujan", "Dimas Hartono", 2024, "waves", 77, 3, 3.0, 1.8, "S", 0),
      a("duaArah", "Dua Arah", "Laras Kinanti", 2025, "shards", 19, 1, 2.2, 1.6, "p1:b", 0),
      a("sambungan", "Sambungan", "Gilang Ramadhan", 2024, "truchet", 42, 7, 2.2, 1.6, "p1:a", 0),
    ],
  };
}

/* Migrasi dari versi sebelumnya */
export function normalize(c, lang = "en") {
  c = { ...c };
  if (!FLOORS.some(f => f.id === c.floor)) c.floor = "kayu";
  if (!/^#[0-9a-f]{6}$/i.test(c.wallColor || "")) c.wallColor = "#e9e4da";
  const flip = new Set();
  c.parts = (c.parts || []).map(p => {
    if (typeof p.rot === "number") return p;
    if (p.orient === "v") flip.add(p.id);
    const { orient, ...rest } = p;
    return { ...rest, rot: orient === "v" ? 90 : 0 };
  });
  if (flip.size) c.arts = c.arts.map(a => {
    if (!a.face) return a;
    const [pid, s] = a.face.split(":");
    return flip.has(pid) && s ? { ...a, face: pid + ":" + (s === "a" ? "b" : "a") } : a;
  });
  if (!Array.isArray(c.installs)) {
    const obs = obstaclesOf({ ...c, installs: [] });
    c.installs = defaultInstalls(lang).filter(i => {
      const f = footOf(i);
      if (Math.abs(i.x) + f.hx > c.w / 2 - 0.5 || Math.abs(i.z) + f.hz > c.d / 2 - 0.5) return false;
      return !obs.some(o => Math.hypot(o.x - i.x, o.z - i.z) < Math.max(o.hx, o.hz) + Math.max(f.hx, f.hz) + 0.6);
    });
  }
  return c;
}

export function loadConfig(lang = "en") {
  try {
    const s = localStorage.getItem(STORE_KEY);
    if (s) {
      const c = JSON.parse(s);
      if (c && Array.isArray(c.arts)) return normalize(c, lang);
    }
  } catch (_) {}
  return defaultConfig(lang);
}
