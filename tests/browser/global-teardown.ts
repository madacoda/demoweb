import { removeTestNamespace } from "../database-fixture.ts";
import { closePools } from "../../server/database.ts";
export default async function teardown() {
  try {
    await removeTestNamespace(process.env.DEMO_NAMESPACE!);
  } finally {
    await closePools();
  }
}
