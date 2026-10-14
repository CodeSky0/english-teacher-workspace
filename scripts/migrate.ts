import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const url = process.env.DATABASE_URL;

if (!url) {
  if (process.env.NODE_ENV === "production") {
    console.error("✗ DATABASE_URL is required in production.");
    process.exit(1);
  }
  console.warn("⚠ DATABASE_URL not set — skipping migrations.");
  process.exit(0);
}

console.log("▶ Running database migrations...");

const client = postgres(url, {
  max: 1,
  ssl: url.includes("sslmode=require") ? "require" : false,
  connect_timeout: 30,
});

const db = drizzle(client);

migrate(db, { migrationsFolder: "./src/db/migrations" })
  .then(() => {
    console.log("✓ Migrations completed successfully.");
    return client.end();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ Migration failed:", err?.message || err);
    process.exit(1);
  });
