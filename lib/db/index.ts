import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | null = null;

function getDb(): DrizzleDb {
  if (_db) return _db;
  const connectionString =
    process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "POSTGRES_URL (or DATABASE_URL) is not set. Run `vercel env pull .env.local` after provisioning Vercel Postgres.",
    );
  }
  if (typeof WebSocket === "undefined") {
    neonConfig.webSocketConstructor = ws;
  }
  const pool = new Pool({ connectionString });
  _db = drizzle(pool, { schema });
  return _db;
}

export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    const instance = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = instance[prop];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

export { schema };
