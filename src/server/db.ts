import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle> | undefined;
  pgClient: ReturnType<typeof postgres> | undefined;
};

const DUMMY_URL = "postgresql://dummy:dummy@localhost:5432/dummy";

function createClient() {
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[db] DATABASE_URL is required in production.");
    }
    console.warn("[db] DATABASE_URL not set — database operations will fail at runtime.");
  }
  const url = process.env.DATABASE_URL || DUMMY_URL;
  return postgres(url, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: url.includes("sslmode=require") ? "require" : false,
  });
}

const pgClient = globalForDb.pgClient ?? createClient();
const db = globalForDb.db ?? drizzle(pgClient, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = pgClient;
  globalForDb.db = db;
}

export { db, pgClient };
