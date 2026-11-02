# Ruang Sunyi — 3D Exhibition Gallery

A virtual exhibition you can walk through with keyboard and mouse. Lay out the floor plan, hang paintings, place 3D installations, then share the gallery with a link.

- **Frontend**: React 18 (JSX) + Three.js, built with Vite. English by default, with Indonesian available from the EN / ID switch.
- **Backend**: Node.js + Express. It stores galleries in Postgres (Neon) and uploads in Vercel Blob.
- **Deployment**: Vercel (static frontend + one serverless function), Neon (database), Vercel Blob (images and models).

Locally, the backend runs with no accounts: galleries are saved as JSON files and uploads go to disk.

---

## Run locally

Requires Node.js 20.12 or newer.

```bash
npm install
npm run dev        # API on :3001 + Vite on :5173 (opens the browser)
```

To use Postgres locally (or your Neon database), copy `.env.example` to `.env` and fill in `DATABASE_URL`. The table is created automatically on first start, or run `npm run db:migrate`.

Production-like single process: `npm run build && npm start` → http://localhost:3001

| Variable | Locally when empty | On Vercel |
| --- | --- | --- |
| `DATABASE_URL` | JSON files in `server/data/galleries` | **Required**: Neon connection string |
| `BLOB_READ_WRITE_TOKEN` | Files in `server/data/uploads` | **Required for uploads**: added by the Blob store |
| `PORT` | `3001` | Not used |
| `DATA_DIR` | `server/data` | Not used |

---

## Deploy to Vercel + Neon

### 1. Push the code to GitHub

```bash
git init && git add . && git commit -m "Ruang Sunyi"
git remote add origin https://github.com/<you>/ruang-sunyi.git
git push -u origin main
```

### 2. Import the project in Vercel

1. Go to **vercel.com → Add New → Project**, then pick the repository.
2. Leave **Root Directory** as the repository root. The settings come from `vercel.json`: framework Vite, build `npm run build`, output `client/dist`.
3. Click **Deploy**. The first deploy builds the frontend, but saving fails until the database exists. The status in the header shows **Couldn't save**, and `/api/health` returns `notConfigured`.

### 3. Add Neon (Postgres)

**Option A, through Vercel (simplest).** Open the project, then **Storage → Create Database → Neon (Serverless Postgres)** → choose a region close to your users (for Indonesia, Singapore `aws-ap-southeast-1`) → **Connect** to the project. Vercel adds `DATABASE_URL` for you.

**Option B, from neon.tech.** Create a project, open **Connect**, copy the **pooled** connection string, then add it in Vercel under **Settings → Environment Variables** as `DATABASE_URL` for Production and Preview.

You don't need to create tables by hand: the server runs `CREATE TABLE IF NOT EXISTS` on its first request. To create them up front:

```bash
DATABASE_URL="postgresql://…neon.tech/neondb?sslmode=require" npm run db:migrate
```

### 4. Add Vercel Blob (uploads)

Open the project, then **Storage → Create → Blob**. Set the access to **Public**, because gallery images are shown to every visitor. Then connect it to the project. Vercel adds `BLOB_READ_WRITE_TOKEN`.

### 5. Redeploy

Open **Deployments → ⋯ → Redeploy** so the function picks up the new variables. Then check:

- `https://<your-app>.vercel.app/api/health` → `{"ok":true,"storage":"neon","uploads":"blob"}`
- Change something in the editor. The header should show **Saved hh:mm**.
- **Share** gives a `/g/<id>` link that opens in walk-only mode.

### How it fits together on Vercel

```
Browser ──► Vercel CDN ──► client/dist (React app)
   │
   ├── /api/*  ──► api/index.js (Express, one Vercel Function) ──► Neon Postgres
   │
   └── image / .glb ──► uploaded straight to Vercel Blob
                         (the function only signs a token after checking the edit key)
```

Uploads go directly from the browser to Blob because Vercel Functions reject request bodies over 4.5 MB.

---

## Languages

- Translations live in `client/src/i18n/en.js` and `client/src/i18n/id.js`. Both files use the same keys. A missing key falls back to English.
- The chosen language is remembered per browser (`localStorage`). The `<html lang>` attribute follows it.
- Sample artworks get their medium and description in the active language when the sample gallery is created. Titles and artist names stay as they are.
- To add a language, copy `en.js`, translate it, and register it in `LANGUAGES` in `client/src/i18n/index.jsx`.
- Server errors return a stable `error` code (for example `badKey`), and the client turns it into text in the user's language.

---

## API

| Method | Route | Edit key | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | – | `{ ok, storage, uploads }` |
| `POST` | `/api/galleries` | – | Create from `{ config }` → `{ id, editKey, updatedAt }` |
| `GET` | `/api/galleries/:id` | – | `{ id, updatedAt, config }` |
| `PUT` | `/api/galleries/:id` | ✓ | Save `{ config }` |
| `DELETE` | `/api/galleries/:id` | ✓ | Delete the gallery and all its uploads |
| `POST` | `/api/galleries/:id/blob` | ✓ (header) | Vercel Blob client-upload token + completion webhook |
| `POST` | `/api/galleries/:id/uploads` | ✓ | Local mode only: multipart `file` |

The edit key travels in the `X-Edit-Key` header. The server stores only its SHA-256 hash.

Safeguards:
- Configs are cleaned before saving (`server/src/validate.js`): unknown fields are dropped, numbers are clamped, and item counts are limited.
- File references must belong to the same gallery.
- Upload types are checked from the file's first bytes. For Blob uploads, this check runs after the upload and deletes anything that isn't a real image or model.

---

## Project structure

```
ruang-sunyi/
├── vercel.json                 # build, output, rewrites for /api and /g/:id
├── api/index.js                # Vercel Function entry → server/src/app.js
├── .env.example
├── client/                     # React + Vite
│   └── src/
│       ├── App.jsx             # editor ⇄ /g/:id, autosave, session, upload mode
│       ├── i18n/               # en.js, id.js, provider, EN/ID switch
│       ├── components/home/    # Home, Plan (SVG floor plan), editors, tabs
│       ├── components/walk/    # Walk, Minimap, Plaque, Pad
│       ├── components/ui/      # Icon, shared form fields
│       ├── engine/gallery.js   # Three.js scene, collisions, controls
│       └── lib/                # api, constants, geometry, model, textures, files, errors
└── server/                     # Express
    ├── db/schema.js            # galleries table (JSONB config)
    ├── scripts/migrate.js
    └── src/
        ├── app.js              # Express app (exported for Vercel)
        ├── index.js            # local listener
        ├── stores/             # Neon / Postgres store, JSON file store
        ├── uploads/            # Vercel Blob uploads, local disk uploads
        ├── routes/galleries.js
        └── validate.js
```

## Not included yet

- Rate limiting. Before going public, add a Vercel WAF rule or `express-rate-limit` for `POST /api/galleries` and uploads.
- Cleanup of uploads that a gallery no longer references.
- User accounts. Ownership is the edit key stored in the creator's browser. If that browser's storage is cleared, the gallery stays viewable but can no longer be edited.
