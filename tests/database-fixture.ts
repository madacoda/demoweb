import { randomUUID } from "node:crypto";
import { getPool, migrate } from "../server/database.ts";
export async function createTestNamespace() {
  const name = `test-${randomUUID()}`;
  process.env.DEMO_NAMESPACE = name;
  await migrate();
  return name;
}
export async function removeTestNamespace(name: string) {
  if (!name.startsWith("test-") && !name.startsWith("e2e-"))
    throw new Error("Refusing to clear a non-test namespace");
  await getPool().query("DELETE FROM demo_state WHERE namespace=$1", [name]);
}
export async function readStoredState(kind: "storefront" | "workspace") {
  const result = await getPool().query(
    "SELECT id,data FROM demo_state WHERE namespace=$1 AND kind=$2 ORDER BY id",
    [process.env.DEMO_NAMESPACE, kind],
  );
  return JSON.stringify(result.rows);
}
