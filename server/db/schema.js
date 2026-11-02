/* Skema database. Dijalankan otomatis saat server pertama kali butuh database, atau lewat `npm run db:migrate`. */
export const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS galleries (
     id          VARCHAR(10)  PRIMARY KEY,
     key_hash    CHAR(64)     NOT NULL,
     config      JSONB        NOT NULL,
     created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
     updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS galleries_updated_at_idx ON galleries (updated_at DESC)`,
];
