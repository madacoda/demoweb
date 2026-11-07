import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  createTestNamespace,
  removeTestNamespace,
} from "./database-fixture.ts";
import { getPool, withState, CommitAndThrow } from "../server/database.ts";
import { performStoreAction } from "../app/demo/_lib/store.ts";
import { performDemoAction } from "../app/demo/sites/_lib/workspace.ts";

let testNamespace: string;
beforeEach(async () => {
  testNamespace = await createTestNamespace();
});
afterEach(async () => {
  await removeTestNamespace(testNamespace);
  delete process.env.DEMO_NAMESPACE;
});

function childAction(
  module: string,
  name: string,
  token: string,
  input: Record<string, unknown>,
): Promise<{ ok: boolean; id?: string; status?: number }> {
  const source = `import {${name}} from ${JSON.stringify(module)}; import {closePools} from './server/database.ts'; let value=''; for await (const chunk of process.stdin) value+=chunk; try { const {token,input}=JSON.parse(value); const result=await ${name}(token,input); console.log(JSON.stringify({ok:true,id:result.id||result.orderId})); } catch(error) {console.log(JSON.stringify({ok:false,status:error.status||500}));} finally {await closePools();}`;
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "-e", source],
      { env: process.env, stdio: ["pipe", "pipe", "pipe"] },
    );
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.resume();
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code) reject(new Error(`Child process exited ${code}`));
      else {
        try {
          resolve(JSON.parse(output));
        } catch {
          reject(new Error("Child process did not return valid JSON"));
        }
      }
    });
    child.stdin.end(JSON.stringify({ token, input }));
  });
}

test("PostgreSQL serializes event capacity across independent Node processes", async () => {
  const session = await performDemoAction(undefined, { action: "bootstrap" });
  const input = {
    action: "reserve-event",
    eventId: "sourdough",
    quantity: 4,
    name: "Test Attendee",
    email: "attendee@example.com",
  };
  const results = await Promise.all(
    [1, 2].map(() =>
      childAction(
        "./app/demo/sites/_lib/workspace.ts",
        "performDemoAction",
        session.token,
        { ...input, requestId: randomUUID() },
      ),
    ),
  );
  assert.equal(results.filter((r) => r.ok).length, 1);
  assert.equal(results.find((r) => !r.ok)?.status, 400);
  const current = await performDemoAction(session.token, {
    action: "bootstrap",
  });
  assert.equal(current.state.registrations.length, 1);
  assert.equal(current.state.registrations[0].quantity, 4);
});

test("PostgreSQL prevents overselling stock from independent server processes", async () => {
  const customers = await Promise.all(
    [1, 2].map(async () => {
      const session = await performStoreAction(undefined, {
        action: "bootstrap",
      });
      await performStoreAction(session.token, {
        action: "add",
        productId: "tray",
        color: "Walnut",
        quantity: 5,
      });
      return session;
    }),
  );
  const customer = {
    name: "Test Shopper",
    email: "shopper@example.com",
    phone: "081234567890",
    address: "1 Sample Street",
    city: "Jakarta",
    postalCode: "12345",
    note: "",
  };
  const results = await Promise.all(
    customers.map((session) =>
      childAction(
        "./app/demo/_lib/store.ts",
        "performStoreAction",
        session.token,
        { action: "checkout", requestId: randomUUID(), customer },
      ),
    ),
  );
  assert.equal(results.filter((r) => r.ok).length, 1);
  assert.equal(results.find((r) => !r.ok)?.status, 409);
  const row = await getPool().query(
    "SELECT data FROM demo_state WHERE namespace=$1 AND kind='storefront'",
    [testNamespace],
  );
  assert.equal(row.rows[0].data.inventory.tray, 3);
  assert.equal(row.rows[0].data.orders.length, 1);
});

test("failed operations roll back state while intentional login counters can commit before an error", async () => {
  await withState(
    "workspace",
    "transaction-test",
    () => ({ count: 0 }),
    (state) => state.count,
  );
  await assert.rejects(
    withState(
      "workspace",
      "transaction-test",
      () => ({ count: 0 }),
      (state) => {
        state.count = 10;
        throw new Error("rollback");
      },
    ),
    /rollback/,
  );
  assert.equal(
    await withState(
      "workspace",
      "transaction-test",
      () => ({ count: 0 }),
      (state) => state.count,
    ),
    0,
  );
  await assert.rejects(
    withState(
      "workspace",
      "transaction-test",
      () => ({ count: 0 }),
      (state) => {
        state.count = 1;
        throw new CommitAndThrow(new Error("counted"));
      },
    ),
    /counted/,
  );
  assert.equal(
    await withState(
      "workspace",
      "transaction-test",
      () => ({ count: 0 }),
      (state) => state.count,
    ),
    1,
  );
});

test("failed login attempts persist and lock out repeated incorrect passwords", async () => {
  const email = "account@example.com";
  const guest = await performStoreAction(undefined, { action: "bootstrap" });
  for (let i = 0; i < 5; i++)
    await assert.rejects(
      performStoreAction(guest.token, {
        action: "login",
        email,
        password: "synthetic-wrong-password",
      }),
      (e: unknown) => e instanceof Error && "status" in e && e.status === 401,
    );
  await assert.rejects(
    performStoreAction(guest.token, {
      action: "login",
      email,
      password: "synthetic-wrong-password",
    }),
    (e: unknown) => e instanceof Error && "status" in e && e.status === 429,
  );
});
