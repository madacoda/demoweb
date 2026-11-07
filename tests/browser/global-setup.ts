import { migrate, closePools } from "../../server/database.ts";
export default async function setup() {
  await migrate();
  await closePools();
}
