/* Klien kecil untuk API backend (lihat server/src/routes/galleries.js) */
import { AppError } from "./errors.js";

async function request(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (_) {
    throw new AppError("network");
  }
  if (!res.ok) {
    let body = null;
    try { body = await res.json(); } catch (_) {}
    throw new AppError(body?.error || "server", body?.params, res.status);
  }
  return res.status === 204 ? null : res.json();
}

const jsonBody = (method, data, key) => ({
  method,
  headers: { "Content-Type": "application/json", ...(key ? { "X-Edit-Key": key } : {}) },
  body: JSON.stringify(data),
});

export const api = {
  health: () => request("/api/health"),
  getGallery: id => request(`/api/galleries/${encodeURIComponent(id)}`),
  createGallery: config => request("/api/galleries", jsonBody("POST", { config })),
  saveGallery: (id, key, config) => request(`/api/galleries/${id}`, jsonBody("PUT", { config }, key)),
  deleteGallery: (id, key) => request(`/api/galleries/${id}`, { method: "DELETE", headers: { "X-Edit-Key": key } }),

  /** Unggah lewat server (mode lokal) */
  uploadLocal(id, key, blob, filename) {
    const form = new FormData();
    form.append("file", blob, filename);
    return request(`/api/galleries/${id}/uploads`, { method: "POST", headers: { "X-Edit-Key": key }, body: form });
  },

  /** Unggah langsung dari browser ke Vercel Blob; server hanya memberi token */
  async uploadBlob(id, key, blob, contentType) {
    const { upload } = await import("@vercel/blob/client");
    const name = contentType === "model/gltf-binary" ? "model.glb" : "image.jpg";
    try {
      return await upload(`galleries/${id}/${name}`, blob, {
        access: "public",
        handleUploadUrl: `/api/galleries/${id}/blob`,
        headers: { "X-Edit-Key": key },
        contentType,
      });
    } catch (e) {
      throw new AppError("uploadFailed", { detail: e.message });
    }
  },
};
