/*
 * Penyimpanan Postgres. Di Neon memakai driver HTTP serverless (cocok untuk Vercel Functions);
 * di Postgres biasa (mis. lokal) memakai node-postgres.
 */
import { SCHEMA_SQL } from "../../db/schema.js";

async function createQuery(url) {
  if (/\.neon\.tech|neon\.database/i.test(url)) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    return { driver: "neon", query: (text, params) => sql.query(text, params) };
  }
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 5 });
  return { driver: "postgres", query: async (text, params) => (await pool.query(text, params)).rows };
}

const toRecord = row => ({
  id: row.id,
  keyHash: row.key_hash,
  config: row.config,
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
});

export function createSqlStore(url) {
  let db;
  const store = {
    kind: "postgres",
    /* Membuat tabel bila belum ada. Aman dipanggil berkali-kali (sekali per cold start). */
    init: () =>
      (db ||= createQuery(url).then(async q => {
        store.kind = q.driver;
        for (const stmt of SCHEMA_SQL) await q.query(stmt, []);
        return q;
      }).catch(e => {
        db = null;
        throw e;
      })),

    async get(id) {
      const q = await store.init();
      const rows = await q.query("SELECT id, key_hash, config, created_at, updated_at FROM galleries WHERE id = $1", [id]);
      return rows.length ? toRecord(rows[0]) : null;
    },

    async put(rec) {
      const q = await store.init();
      await q.query(
        `INSERT INTO galleries (id, key_hash, config, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, $4, $5)
         ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = EXCLUDED.updated_at`,
        [rec.id, rec.keyHash, JSON.stringify(rec.config), rec.createdAt, rec.updatedAt]
      );
    },

    async remove(id) {
      const q = await store.init();
      await q.query("DELETE FROM galleries WHERE id = $1", [id]);
    },
  };
  return store;
}
