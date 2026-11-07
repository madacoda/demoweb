import { closePools, migrate } from "../server/database.ts";
try {
  await migrate();
  console.log("PostgreSQL schema is up to date.");
} catch {
  console.error(
    "Migration failed. Check PostgreSQL is running and DATABASE_URL is configured.",
  );
  process.exitCode = 1;
} finally {
  await closePools();
}
