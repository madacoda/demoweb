import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const [phase, origin, stateFile] = process.argv.slice(2);
assert(["create", "restore", "unavailable"].includes(phase));
assert(origin && stateFile, "Expected phase, origin and temporary state file");

const health = await fetch(`${origin}/health`, {
  signal: AbortSignal.timeout(10000),
});
if (phase === "unavailable") {
  assert.equal(
    health.status,
    503,
    "Readiness must fail when PostgreSQL is down",
  );
  console.log("Container readiness rejects an unavailable database.");
  process.exit(0);
}
assert.equal(health.status, 200);
assert.equal((await health.json()).database, "postgresql");

let cookie = "";
async function action(input) {
  const response = await fetch(`${origin}/demo/api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      Cookie: cookie,
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, 200, `Store action ${input.action} failed`);
  const session = response.headers
    .getSetCookie()
    .find((value) => value.startsWith("form_field_session="));
  if (session) cookie = session.split(";", 1)[0];
  return (await response.json()).state;
}

if (phase === "create") {
  for (const route of ["/", "/hris", "/lab"]) {
    const response = await fetch(`${origin}${route}`);
    assert.equal(response.status, 200, `Page ${route} failed`);
    const html = await response.text();
    const asset = html.match(/(?:src|href)="([^\"]*\/_next\/static\/[^\"]+)"/);
    assert(asset, `Page ${route} has no static asset`);
    assert.equal(
      (await fetch(new URL(asset[1].replaceAll("&amp;", "&"), origin))).status,
      200,
    );
  }
  const catalog = await (await fetch(`${origin}/lab/cases`)).json();
  assert.equal(catalog.format, "demo-district-acceptance-catalog");
  assert(catalog.workflows.length > 0);
  await action({ action: "bootstrap" });
  assert(cookie, "Session cookie was not issued");
  const state = await action({
    action: "add",
    productId: "notebook",
    color: "Sand",
    quantity: 2,
  });
  assert.equal(state.cart.length, 1);
  assert.equal(state.cart[0].quantity, 2);
  await writeFile(stateFile, JSON.stringify({ cookie, cart: state.cart }), {
    mode: 0o600,
    flag: "wx",
  });
  console.log(
    "Container serves pages/assets, migrates PostgreSQL and persists a cart.",
  );
} else {
  const saved = JSON.parse(await readFile(stateFile, "utf8"));
  cookie = saved.cookie;
  const state = await action({ action: "bootstrap" });
  assert.deepEqual(state.cart, saved.cart);
  console.log(
    "Persisted cart and session survive application and database restart.",
  );
}
