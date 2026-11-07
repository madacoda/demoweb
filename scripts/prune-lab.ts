import { closePools, getPool, namespace } from "../server/database.ts";
try {
  const result = await getPool().query(
    `WITH expired AS (
    DELETE FROM lab_sessions WHERE base_namespace=$1 AND expires_at<=now() RETURNING id,base_namespace
  ), removed AS (
    DELETE FROM demo_state USING expired WHERE demo_state.namespace=expired.base_namespace || ':lab:' || expired.id RETURNING 1
  ) SELECT count(*)::int AS runs FROM expired`,
    [namespace()],
  );
  console.log(
    `Removed ${result.rows[0].runs} expired lab runs. Normal data and active runs were preserved.`,
  );
} catch {
  console.error("Lab cleanup failed. Check the database and migrations.");
  process.exitCode = 1;
} finally {
  await closePools();
}
