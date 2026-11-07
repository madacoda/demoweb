import { readFile } from "node:fs/promises";
import { closePools, getPool, migrate, namespace } from "../server/database.ts";
const [storePath, workspacePath] = process.argv.slice(2);
if (!storePath || !workspacePath) {
  console.error("Usage: bun run db:import <store.json> <workspaces.json>");
  process.exitCode = 1;
} else {
  try {
    const store = JSON.parse(await readFile(storePath, "utf8"));
    const workspaces = JSON.parse(await readFile(workspacePath, "utf8"));
    if (
      store.version !== 1 ||
      !Array.isArray(store.users) ||
      !Array.isArray(store.orders) ||
      !store.sessions ||
      !store.inventory ||
      workspaces.version !== 1 ||
      !workspaces.sessions
    )
      throw new Error("Invalid legacy data");
    await migrate();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      // Plain INSERT intentionally refuses to overwrite any existing destination record.
      await client.query(
        "INSERT INTO demo_state(namespace,kind,id,data) VALUES ($1,'storefront','main',$2::jsonb)",
        [namespace(), JSON.stringify(store)],
      );
      for (const [key, session] of Object.entries(workspaces.sessions)) {
        if (
          !/^[a-f0-9]{64}$/.test(key) ||
          !session ||
          typeof session !== "object" ||
          !("state" in session) ||
          !("requests" in session)
        )
          throw new Error("Invalid workspace");
        await client.query(
          "INSERT INTO demo_state(namespace,kind,id,data) VALUES ($1,'workspace',$2,$3::jsonb)",
          [namespace(), key, JSON.stringify(session)],
        );
      }
      await client.query("COMMIT");
      console.log(
        `Imported storefront and ${Object.keys(workspaces.sessions).length} browser workspaces into PostgreSQL. Existing data is never overwritten.`,
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch {
    console.error(
      "Import failed and was rolled back. Verify both legacy files and use an empty destination namespace.",
    );
    process.exitCode = 1;
  } finally {
    await closePools();
  }
}
