import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
const password = randomBytes(24).toString("hex");
try {
  await writeFile(
    new URL("../.env", import.meta.url),
    `POSTGRES_USER=demo_district\nPOSTGRES_DB=demo_district\nPOSTGRES_PORT=5433\nPOSTGRES_PASSWORD=${password}\nDATABASE_URL=postgresql://demo_district:${password}@127.0.0.1:5433/demo_district\n`,
    { flag: "wx", mode: 0o600 },
  );
  console.log("Created ignored .env with a random local database password.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log("Kept existing .env unchanged.");
}
