import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { checkOrigin, cookieOptions } from "../server/http";

test("proxied HTTPS requests accept only the configured website origin", () => {
  const previous = process.env.DEMOWEB_PUBLIC_ORIGIN;
  process.env.DEMOWEB_PUBLIC_ORIGIN = "https://demoweb.madacoda.dev";
  try {
    const request = (host: string, origin: string, fetchSite = "same-origin") =>
      new NextRequest("http://127.0.0.1:1112/demo/api", {
        method: "POST",
        headers: {
          Host: host,
          Origin: origin,
          "Sec-Fetch-Site": fetchSite,
          "X-Forwarded-Proto": "https",
        },
      });
    const sameOrigin = request(
      "demoweb.madacoda.dev",
      "https://demoweb.madacoda.dev",
    );
    assert.doesNotThrow(() => checkOrigin(sameOrigin));
    assert.equal(cookieOptions(sameOrigin, "/demo").secure, true);
    for (const rejected of [
      request("demoweb.madacoda.dev", "https://attacker.example"),
      request("attacker.example", "https://demoweb.madacoda.dev"),
      request(
        "demoweb.madacoda.dev",
        "https://demoweb.madacoda.dev",
        "cross-site",
      ),
    ]) {
      assert.throws(() => checkOrigin(rejected), { status: 403 });
    }
  } finally {
    if (previous === undefined) delete process.env.DEMOWEB_PUBLIC_ORIGIN;
    else process.env.DEMOWEB_PUBLIC_ORIGIN = previous;
  }
});
