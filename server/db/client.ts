import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export function createDb() {
  if (!process.env.DATABASE_URL) return null;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  return drizzle(pool, { schema });
}

export type Database = NonNullable<ReturnType<typeof createDb>>;
