import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  createTestNamespace,
  removeTestNamespace,
  readStoredState,
} from "../../../tests/database-fixture.ts";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { performStoreAction as action, StoreError } from "./store.ts";

let testNamespace: string;
const originalNamespace = process.env.DEMO_NAMESPACE;
const customer = {
  name: "Fixture Shopper",
  email: "shopper@example.com",
  phone: "081234567890",
  address: "1 Example Street",
  city: "Jakarta",
  postalCode: "12345",
  note: "Synthetic test order",
};
beforeEach(async () => {
  testNamespace = await createTestNamespace();
});
afterEach(async () => {
  await removeTestNamespace(testNamespace);
  if (originalNamespace === undefined) delete process.env.DEMO_NAMESPACE;
  else process.env.DEMO_NAMESPACE = originalNamespace;
});

test("server prices the cart, enforces stock and variants, and discounts only items", async () => {
  const guest = await action(undefined, { action: "bootstrap" });
  const added = await action(guest.token, {
    action: "add",
    productId: "notebook",
    color: "Sand",
    quantity: 2,
    price: 1,
  });
  assert.equal(added.state.total, 130000);
  await assert.rejects(
    action(guest.token, {
      action: "add",
      productId: "clips",
      color: "Brass",
      quantity: 1,
    }),
    StoreError,
  );
  await assert.rejects(
    action(guest.token, {
      action: "add",
      productId: "pen",
      color: "Unlisted",
      quantity: 1,
    }),
    StoreError,
  );
  await assert.rejects(
    action(guest.token, {
      action: "quantity",
      productId: "notebook",
      color: "Sand",
      quantity: -1,
    }),
    StoreError,
  );
  await assert.rejects(
    action(guest.token, {
      action: "add",
      productId: "notebook",
      color: "Forest",
      quantity: 9,
    }),
    StoreError,
  );
  await action(guest.token, { action: "coupon", code: " save10 " });
  await action(guest.token, { action: "coupon", code: "SAVE10" });
  const express = await action(guest.token, {
    action: "delivery",
    delivery: "express",
  });
  assert.equal(express.state.discount, 13000);
  assert.equal(express.state.total, 142000);
  await assert.rejects(
    action(guest.token, { action: "coupon", code: "FAKE" }),
    StoreError,
  );
  assert.equal(
    (await action(guest.token, { action: "state" })).state.coupon,
    "SAVE10",
  );
});

test("concurrent checkout retries save one immutable order and cancellation restores stock once", async () => {
  const guest = await action(undefined, { action: "bootstrap" });
  await action(guest.token, {
    action: "add",
    productId: "tray",
    color: "Oak",
    quantity: 2,
  });
  const input = { action: "checkout", customer, requestId: randomUUID() };
  const results = await Promise.all([
    action(guest.token, input),
    action(guest.token, input),
  ]);
  assert.equal(results[0].orderId, results[1].orderId);
  assert.equal(results[1].state.orders.length, 1);
  assert.equal(
    results[1].state.products.find((p) => p.id === "tray")?.stock,
    6,
  );
  assert.equal(results[1].state.orders[0].total, 170000);
  await action(guest.token, {
    action: "add",
    productId: "pen",
    color: "Forest",
    quantity: 1,
  });
  assert.equal(
    (await action(guest.token, { action: "state" })).state.orders[0].total,
    170000,
  );
  const stranger = await action(undefined, { action: "bootstrap" });
  assert.equal(stranger.state.orders.length, 0);
  await assert.rejects(
    action(stranger.token, { action: "cancel", orderId: results[0].orderId }),
    StoreError,
  );
  await action(guest.token, { action: "cancel", orderId: results[0].orderId });
  const cancelled = await action(guest.token, {
    action: "cancel",
    orderId: results[0].orderId,
  });
  assert.equal(cancelled.state.products.find((p) => p.id === "tray")?.stock, 8);
  assert.equal(cancelled.state.orders[0].status, "cancelled");
});

test("accounts merge guest history, hash passwords, rotate sessions, and retain data after logout", async () => {
  const guest = await action(undefined, { action: "bootstrap" });
  await action(guest.token, {
    action: "add",
    productId: "pen",
    color: "Forest",
    quantity: 1,
  });
  await action(guest.token, {
    action: "checkout",
    customer,
    requestId: randomUUID(),
  });
  await action(guest.token, { action: "saved", productId: "mug" });
  const secret = randomUUID();
  const account = await action(guest.token, {
    action: "register",
    name: customer.name,
    email: customer.email,
    password: secret,
  });
  assert.notEqual(account.token, guest.token);
  assert.equal(account.state.orders.length, 1);
  assert.deepEqual(account.state.saved, ["mug"]);
  const persisted = await readStoredState("storefront");
  assert.equal(persisted.includes(secret), false);
  assert.equal(persisted.includes(account.token), false);
  const loggedOut = await action(account.token, { action: "logout" });
  assert.equal(loggedOut.state.user, null);
  assert.deepEqual(loggedOut.state.orders, []);
  assert.equal(
    (await action(account.token, { action: "state" })).state.user,
    null,
  );
  await assert.rejects(
    action(loggedOut.token, {
      action: "login",
      email: customer.email,
      password: randomUUID(),
    }),
    StoreError,
  );
  const signedIn = await action(loggedOut.token, {
    action: "login",
    email: customer.email,
    password: secret,
  });
  assert.equal(signedIn.state.orders.length, 1);
  assert.deepEqual(signedIn.state.saved, ["mug"]);
});

test("legacy fixtures retain exact totals without overwriting the shopper's real bag", async () => {
  const guest = await action(undefined, { action: "bootstrap" });
  await action(guest.token, {
    action: "add",
    productId: "mug",
    color: "Chalk",
    quantity: 1,
  });
  await action(guest.token, { action: "bootstrap", scenario: "broken" });
  const broken = await action(guest.token, {
    action: "coupon",
    code: "SAVE10",
  });
  assert.equal(broken.state.total, 100000);
  await action(guest.token, { action: "bootstrap", scenario: "fixed" });
  assert.equal(
    (await action(guest.token, { action: "coupon", code: "SAVE10" })).state
      .total,
    90000,
  );
  const normal = await action(guest.token, { action: "bootstrap" });
  assert.deepEqual(normal.state.cart, [
    { productId: "mug", color: "Chalk", quantity: 1 },
  ]);
  assert.equal(normal.state.total, 120000);
});

test("invalid checkout input is rejected without losing the bag or changing inventory", async () => {
  const guest = await action(undefined, { action: "bootstrap" });
  await action(guest.token, {
    action: "add",
    productId: "pen",
    color: "Forest",
    quantity: 1,
  });
  for (const invalid of [
    { ...customer, postalCode: "bad" },
    { ...customer, email: "bad" },
    { ...customer, phone: "words" },
    { ...customer, name: "   " },
  ])
    await assert.rejects(
      action(guest.token, {
        action: "checkout",
        customer: invalid,
        requestId: randomUUID(),
      }),
      StoreError,
    );
  const state = (await action(guest.token, { action: "state" })).state;
  assert.equal(state.orders.length, 0);
  assert.equal(state.cart.length, 1);
  assert.equal(state.products.find((p) => p.id === "pen")?.stock, 40);
});

test("contact submissions persist and are isolated to the submitting session", async () => {
  const guest = await action(undefined, { action: "bootstrap" });
  const sent = await action(guest.token, {
    action: "contact",
    name: customer.name,
    email: customer.email,
    subject: "Product question",
    message: "A synthetic question about notebook paper.",
  });
  assert.match(sent.ticketId!, /^MSG-/);
  assert.equal(
    (await action(guest.token, { action: "state" })).state.tickets.length,
    1,
  );
  assert.deepEqual(
    (await action(undefined, { action: "bootstrap" })).state.tickets,
    [],
  );
  await assert.rejects(
    action(guest.token, {
      action: "contact",
      name: customer.name,
      email: "bad",
      subject: "Question",
      message: "A valid-length message.",
    }),
    StoreError,
  );
});

test("a fresh server process reloads the persisted session and order", async () => {
  const guest = await action(undefined, { action: "bootstrap" });
  await action(guest.token, {
    action: "add",
    productId: "pouch",
    color: "Rust",
    quantity: 1,
  });
  await action(guest.token, {
    action: "checkout",
    customer,
    requestId: randomUUID(),
  });
  const source = `const {readFileSync} = require('node:fs'); const {performStoreAction} = require('./app/demo/_lib/store.ts'); (async () => { const input = JSON.parse(readFileSync(0, 'utf8')); const result = await performStoreAction(input.token, {action:'state'}); process.stdout.write(JSON.stringify({orders:result.state.orders.length,total:result.state.orders[0].total})); })();`;
  const output = execFileSync(
    process.execPath,
    ["--import", "tsx", "-e", source],
    {
      input: JSON.stringify({ token: guest.token }),
      encoding: "utf8",
      env: process.env,
    },
  );
  assert.deepEqual(JSON.parse(output), { orders: 1, total: 75000 });
});
