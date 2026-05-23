import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getDatabaseUrl } from "../config/env.js";
import * as schema from "./schema.js";

let pool: Pool | undefined;
let db: NodePgDatabase<typeof schema> | undefined;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      max: Number(process.env.DB_POOL_MAX ?? 3),
    });
  }

  return pool;
}

export function getDb() {
  if (!db) {
    db = drizzle(getPool(), { schema });
  }

  return db;
}

export async function closeDb() {
  await pool?.end();
  pool = undefined;
  db = undefined;
}
