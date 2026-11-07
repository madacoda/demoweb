import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../app/demo/api/route";
import { closePools } from "../server/database";
import { createTestNamespace, removeTestNamespace } from "./database-fixture";

test("store API works behind the HTTPS proxy and rejects a foreign origin", async () => {
  const previous = process.env.DEMOWEB_PUBLIC_ORIGIN;
  const namespace = await createTestNamespace();
  process.env.DEMOWEB_PUBLIC_ORIGIN = "https://demoweb.madacoda.dev";
  try {
    const request = (origin: string) =>
      new NextRequest("http://127.0.0.1:1112/demo/api", {
        method: "POST",
        headers: {
          Host: "demoweb.madacoda.dev",
          Origin: origin,
          "Content-Type": "application/json",
          "X-Forwarded-Proto": "https",
        },
        body: JSON.stringify({ action: "bootstrap" }),
      });
    const accepted = await POST(request("https://demoweb.madacoda.dev"));
    assert.equal(accepted.status, 200);
    assert.match(accepted.headers.get("set-cookie") || "", /; Secure/i);
    const rejected = await POST(request("https://attacker.example"));
    assert.equal(rejected.status, 403);
  } finally {
    await removeTestNamespace(namespace);
    await closePools();
    if (previous === undefined) delete process.env.DEMOWEB_PUBLIC_ORIGIN;
    else process.env.DEMOWEB_PUBLIC_ORIGIN = previous;
  }
});
