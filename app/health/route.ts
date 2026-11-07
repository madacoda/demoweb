import { getPool } from "../../server/database";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await getPool().query("SELECT 1 FROM demo_state LIMIT 1");
    return Response.json({ status: "ok", database: "postgresql" });
  } catch {
    return Response.json(
      { status: "unavailable", database: "postgresql" },
      { status: 503 },
    );
  }
}
