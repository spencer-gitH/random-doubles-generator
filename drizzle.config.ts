import { config } from "dotenv";
import type { Config } from "drizzle-kit";

config({ path: ".env.local" });
config({ path: ".env" });

const url =
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL;

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: url ? { url, ssl: "require" } : undefined,
  strict: true,
} satisfies Config;
