import { closePools, getPool } from "../server/database.ts";
try {
  const result = await getPool().query("SELECT version() AS version");
  const rows = await getPool().query(
    "SELECT kind, count(*)::int AS records FROM demo_state GROUP BY kind ORDER BY kind",
  );
  console.log(result.rows[0].version.split(" on ")[0]);
  console.log(JSON.stringify(rows.rows));
} catch {
  console.error("Database check failed. Run bun run setup first.");
  process.exitCode = 1;
} finally {
  await closePools();
}
