import { Pool, type PoolClient } from "pg";
const shared = globalThis as typeof globalThis & {
  districtPools?: Map<string, Pool>;
};
export function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error(
      "DATABASE_URL is required. Start PostgreSQL with bun run setup.",
    );
  const url = new URL(connectionString);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:")
    throw new Error("DATABASE_URL must use PostgreSQL.");
  shared.districtPools ||= new Map();
  let pool = shared.districtPools.get(connectionString);
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 8,
      idleTimeoutMillis: 1000,
      connectionTimeoutMillis: 5000,
      allowExitOnIdle: true,
    });
    // An idle connection can be closed by a database restart; the pool replaces it.
    pool.on("error", () => {});
    shared.districtPools.set(connectionString, pool);
  }
  return pool;
}
export function namespace() {
  return process.env.DEMO_NAMESPACE || "default";
}
export async function closePools() {
  await Promise.all(
    [...(shared.districtPools?.values() || [])].map((pool) => pool.end()),
  );
  shared.districtPools?.clear();
}
export async function migrate() {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(182731006)");
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS demo_state (
        namespace text NOT NULL,
        kind text NOT NULL CHECK (kind IN ('storefront', 'workspace')),
        id text NOT NULL,
        data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (namespace, kind, id)
      );
      INSERT INTO schema_migrations(version) VALUES (1) ON CONFLICT DO NOTHING;`);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export class CommitAndThrow extends Error {
  constructor(public readonly original: Error) {
    super(original.message);
  }
}
async function save<T>(
  client: PoolClient,
  kind: "storefront" | "workspace",
  id: string,
  state: T,
) {
  await client.query(
    "UPDATE demo_state SET data=$4::jsonb, updated_at=now() WHERE namespace=$1 AND kind=$2 AND id=$3",
    [namespace(), kind, id, JSON.stringify(state)],
  );
}
export async function withState<T, R>(
  kind: "storefront" | "workspace",
  id: string,
  initial: () => T,
  operation: (state: T) => R | Promise<R>,
): Promise<R> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query(
      "INSERT INTO demo_state(namespace,kind,id,data) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT DO NOTHING",
      [namespace(), kind, id, JSON.stringify(initial())],
    );
    const result = await client.query<{ data: T }>(
      "SELECT data FROM demo_state WHERE namespace=$1 AND kind=$2 AND id=$3 FOR UPDATE",
      [namespace(), kind, id],
    );
    const state = result.rows[0].data;
    let value: R;
    try {
      value = await operation(state);
    } catch (error) {
      if (error instanceof CommitAndThrow) {
        await save(client, kind, id, state);
        await client.query("COMMIT");
        throw error;
      }
      throw error;
    }
    await save(client, kind, id, state);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    if (error instanceof CommitAndThrow) throw error.original;
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
