/* Menyiapkan gambar dan model .glb dari pengguna: diunggah ke server bila terhubung, atau disimpan sebagai data URL bila tidak */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MAX_GLB, MAX_GLB_SERVER, fmt } from "./constants.js";
import { AppError } from "./errors.js";

const baseName = name => name.replace(/\.[^.]+$/, "");

function loadImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); res(im); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new AppError("imageUnreadable", { name: file.name })); };
    im.src = url;
  });
}

/** Mengecilkan gambar, lalu mengunggahnya (online) atau mengubahnya ke data URL (offline). */
export async function prepareImage(file, server) {
  const im = await loadImage(file);
  const max = server.online ? 2048 : 1600, s = Math.min(1, max / Math.max(im.width, im.height));
  const c = document.createElement("canvas");
  c.width = Math.round(im.width * s);
  c.height = Math.round(im.height * s);
  const g = c.getContext("2d");
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(im, 0, 0, c.width, c.height);
  const ratio = im.height / im.width;
  if (server.online) {
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.88));
    return { img: await server.upload(blob, baseName(file.name) + ".jpg", "image/jpeg"), ratio };
  }
  return { img: c.toDataURL("image/jpeg", 0.85), ratio };
}

function bufToDataURL(buf) {
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return "data:model/gltf-binary;base64," + btoa(s);
}

function dataURLToBuf(d) {
  const s = atob(d.slice(d.indexOf(",") + 1)), b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b.buffer;
}

function parseGLB(buf) {
  return new Promise((res, rej) => {
    try {
      new GLTFLoader().parse(buf, "", res, () => rej(new AppError("glbInvalid")));
    } catch (_) {
      rej(new AppError("glbInvalid"));
    }
  });
}

/** Memuat model dari data URL atau URL server. */
export function loadModel(src) {
  if (src.startsWith("data:")) return parseGLB(dataURLToBuf(src));
  return new Promise((res, rej) => new GLTFLoader().load(src, res, undefined, rej));
}

/** Memeriksa model .glb, menghitung tapaknya, lalu mengunggah atau menyimpannya. */
export async function prepareGLB(file, server) {
  if (!/\.glb$/i.test(file.name)) throw new AppError("glbExtension");
  const limit = server.online ? MAX_GLB_SERVER : MAX_GLB;
  if (file.size > limit) {
    throw new AppError(server.online ? "glbTooLarge" : "glbTooLargeOffline", { size: fmt(file.size / 1048576), limit: fmt(limit / 1048576) });
  }
  const buf = await file.arrayBuffer();
  const gltf = await parseGLB(buf.slice(0));
  const size = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());
  if (!(size.y > 0)) throw new AppError("glbEmpty");
  const foot = { w: size.x / size.y, d: size.z / size.y };
  const model = server.online ? await server.upload(file, file.name, "model/gltf-binary") : bufToDataURL(buf);
  return { model, foot };
}
