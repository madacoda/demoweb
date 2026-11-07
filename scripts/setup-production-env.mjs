import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";

const password = randomBytes(24).toString("hex");
try {
  await writeFile(
    new URL("../.env.deploy", import.meta.url),
    [
      "DEMOWEB_IMAGE=ghcr.io/madacoda/demoweb:latest",
      "DEMOWEB_BIND_ADDRESS=127.0.0.1",
      "DEMOWEB_PORT=1112",
      "DEMOWEB_PUBLIC_ORIGIN=https://demoweb.madacoda.dev",
      "POSTGRES_USER=demo_district",
      "POSTGRES_DB=demo_district",
      `POSTGRES_PASSWORD=${password}`,
      `DATABASE_URL=postgresql://demo_district:${password}@db:5432/demo_district`,
      "",
    ].join("\n"),
    { flag: "wx", mode: 0o600 },
  );
  console.log("Created ignored .env.deploy with a random database password.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log("Kept existing .env.deploy unchanged.");
}
