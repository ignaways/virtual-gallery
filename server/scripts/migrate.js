/* Membuat tabel di database pada DATABASE_URL. Pemakaian: DATABASE_URL=... npm run db:migrate -w server */
import { createSqlStore } from "../src/stores/sqlStore.js";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("Set DATABASE_URL first, for example in a .env file or your shell.");
  process.exit(1);
}
const store = createSqlStore(url);
await store.init();
console.log(`Schema ready (${store.kind}).`);
process.exit(0);
