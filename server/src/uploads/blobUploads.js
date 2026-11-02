/*
 * Unggahan ke Vercel Blob. Browser mengunggah langsung ke Blob (melewati batas 4,5 MB
 * Vercel Functions); server hanya memberi token setelah memeriksa kunci edit.
 */
import { handleUpload } from "@vercel/blob/client";
import { del, list } from "@vercel/blob";
import { config } from "../config.js";
import { HttpError } from "../errors.js";
import { sniff } from "./sniff.js";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MODEL_TYPES = ["model/gltf-binary", "application/octet-stream"];

/* Setelah unggahan selesai, cek isi file; hapus bila bukan gambar/model yang sah */
async function verify(url, token) {
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-11" } });
    const kind = sniff(Buffer.from(await res.arrayBuffer()));
    const expected = /\.glb$/i.test(new URL(url).pathname) ? ["glb"] : ["jpg", "png", "webp"];
    if (!expected.includes(kind)) await del(url, { token });
  } catch (e) {
    console.error("Blob verification failed", e);
  }
}

export function createBlobUploads(token) {
  return {
    mode: "blob",
    mount() {},

    routes(router, { body, findGallery, keyMatches }) {
      router.post("/:id/blob", body, async (req, res, next) => {
        try {
          const id = req.params.id;
          const result = await handleUpload({
            token,
            body: req.body,
            request: req,
            onBeforeGenerateToken: async pathname => {
              const rec = await findGallery(id);
              if (!rec) throw new HttpError(404, "notFound", "Gallery not found");
              if (!keyMatches(req.get("X-Edit-Key"), rec.keyHash)) throw new HttpError(403, "badKey", "Edit key does not match");
              if (!pathname.startsWith(`galleries/${id}/`)) throw new HttpError(400, "uploadPath", "Invalid upload path");
              const model = /\.glb$/i.test(pathname);
              return {
                allowedContentTypes: model ? MODEL_TYPES : IMAGE_TYPES,
                maximumSizeInBytes: model ? config.maxModel : config.maxImage,
                addRandomSuffix: true,
                tokenPayload: JSON.stringify({ id }),
              };
            },
            onUploadCompleted: async ({ blob }) => verify(blob.url, token),
          });
          res.json(result);
        } catch (e) {
          // Error dari SDK Blob (mis. tanda tangan webhook salah) dijawab 400, bukan 500
          next(e instanceof HttpError ? e : new HttpError(400, "invalidUpload", e.message));
        }
      });
    },

    async removeAll(id) {
      let cursor;
      do {
        const page = await list({ prefix: `galleries/${id}/`, cursor, token });
        if (page.blobs.length) await del(page.blobs.map(b => b.url), { token });
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
    },
  };
}
