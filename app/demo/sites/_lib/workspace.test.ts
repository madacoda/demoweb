import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  createTestNamespace,
  removeTestNamespace,
  readStoredState,
} from "../../../../tests/database-fixture.ts";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { performDemoAction, DemoError } from "./workspace.ts";
import { dateAfter } from "./data.ts";
let testNamespace: string;
const originalNamespace = process.env.DEMO_NAMESPACE;
beforeEach(async () => {
  testNamespace = await createTestNamespace();
});
afterEach(async () => {
  await removeTestNamespace(testNamespace);
  if (originalNamespace === undefined) delete process.env.DEMO_NAMESPACE;
  else process.env.DEMO_NAMESPACE = originalNamespace;
});
const action = (token: string | undefined, input: Record<string, unknown>) =>
  performDemoAction(token, { requestId: randomUUID(), ...input });
const contact = { name: "Sample Visitor", email: "visitor@example.com" };

test("stays use server rates, reject overlaps and invalid dates, release dates after cancellation", async () => {
  const session = await action(undefined, { action: "bootstrap" });
  const input = {
    action: "book-stay",
    roomId: "bamboo-house",
    start: dateAfter(3),
    end: dateAfter(5),
    guests: 2,
    ...contact,
    total: 1,
  };
  const booked = await action(session.token, input);
  assert.equal(booked.state.bookings[0].total, 1700000);
  await assert.rejects(action(session.token, input), /already booked/);
  await assert.rejects(
    action(session.token, { ...input, start: dateAfter(8), end: dateAfter(7) }),
    /1–30 nights/,
  );
  await assert.rejects(
    action(session.token, { ...input, roomId: "ocean-loft", guests: 4 }),
    /1 to 3/,
  );
  await assert.rejects(
    action(session.token, { ...input, start: "2026-02-30" }),
    /valid start date/,
  );
  await action(session.token, { action: "cancel-stay", id: booked.id });
  const replacement = await action(session.token, input);
  assert.equal(
    replacement.state.bookings.filter((b) => b.status === "Confirmed").length,
    1,
  );
});
test("concurrent reservation replay is idempotent and other workspaces cannot cancel it", async () => {
  const session = await action(undefined, { action: "bootstrap" });
  const input = {
    action: "reserve-event",
    eventId: "clay-club",
    quantity: 3,
    ...contact,
    requestId: randomUUID(),
  };
  const [first, second] = await Promise.all([
    action(session.token, input),
    action(session.token, input),
  ]);
  assert.equal(first.id, second.id);
  assert.equal(second.state.registrations.length, 1);
  assert.equal(second.state.registrations[0].total, 750000);
  await assert.rejects(
    action(session.token, { ...input, quantity: 2 }),
    (e: unknown) => e instanceof DemoError && e.status === 409,
  );
  const stranger = await action(undefined, { action: "bootstrap" });
  await assert.rejects(
    action(stranger.token, { action: "cancel-event", id: first.id }),
    (e: unknown) => e instanceof DemoError && e.status === 404,
  );
  assert.equal(stranger.state.registrations.length, 0);
});
test("event capacity is enforced atomically, cancellation releases capacity once", async () => {
  const session = await action(undefined, { action: "bootstrap" });
  const input = {
    action: "reserve-event",
    eventId: "sourdough",
    quantity: 4,
    ...contact,
  };
  const results = await Promise.allSettled([
    action(session.token, input),
    action(session.token, input),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const current = await action(session.token, { action: "bootstrap" });
  const reservation = current.state.registrations[0];
  await action(session.token, { action: "cancel-event", id: reservation.id });
  await action(session.token, { action: "cancel-event", id: reservation.id });
  const full = await action(session.token, { ...input, quantity: 6 });
  assert.equal(
    full.state.registrations.filter((r) => r.status === "Confirmed").length,
    1,
  );
  await assert.rejects(
    action(session.token, { ...input, eventId: "botanical", quantity: 1 }),
    /not enough tickets/,
  );
});
test("food quantities, availability, offers, totals and immutable order snapshots", async () => {
  const session = await action(undefined, { action: "bootstrap" });
  await assert.rejects(
    action(session.token, { action: "food-add", id: "brownie", quantity: 1 }),
    /unavailable/,
  );
  await action(session.token, {
    action: "food-add",
    id: "harvest-bowl",
    quantity: 2,
    price: 1,
  });
  await assert.rejects(
    action(session.token, {
      action: "food-add",
      id: "harvest-bowl",
      quantity: 20,
    }),
    /up to 20/,
  );
  await assert.rejects(
    action(session.token, {
      action: "food-quantity",
      id: "harvest-bowl",
      quantity: 1.5,
    }),
    /whole number/,
  );
  await assert.rejects(
    action(session.token, { action: "food-coupon", coupon: "BAD" }),
    /not valid/,
  );
  await action(session.token, { action: "food-coupon", coupon: "lunch10" });
  await action(session.token, { action: "food-coupon", coupon: "LUNCH10" });
  await assert.rejects(
    action(session.token, {
      action: "food-order",
      name: "Example",
      phone: "invalid!",
      pickup: "In 30 minutes",
      note: "",
    }),
    /phone number/,
  );
  const order = await action(session.token, {
    action: "food-order",
    name: "Example",
    phone: "08123456789",
    pickup: "In 30 minutes",
    note: "No utensils",
    total: 1,
  });
  assert.equal(order.state.foodOrders[0].total, 109400);
  assert.equal(order.state.foodOrders[0].discount, 11600);
  assert.deepEqual(order.state.foodCart, []);
  await action(session.token, {
    action: "food-add",
    id: "cold-brew",
    quantity: 1,
  });
  const cancelled = await action(session.token, {
    action: "cancel-food",
    id: order.id,
  });
  assert.equal(cancelled.state.foodOrders[0].total, 109400);
  assert.equal(cancelled.state.foodOrders[0].items[0].name, "Harvest Bowl");
});
test("tasks support create, edit, move and delete while validating assignments", async () => {
  const session = await action(undefined, { action: "bootstrap" });
  assert.equal(session.state.tasks.length, 12);
  const input = {
    action: "task-save",
    title: "Review the release",
    description: "Check the main flows",
    status: "To do",
    priority: "High",
    assignee: "Maya",
    project: "Website launch",
    due: dateAfter(5),
  };
  const created = await action(session.token, input);
  assert.equal(created.state.tasks.length, 13);
  await assert.rejects(
    action(session.token, {
      ...input,
      id: created.id,
      assignee: "Someone else",
    }),
    /valid assignee/,
  );
  await action(session.token, {
    ...input,
    id: created.id,
    title: "Review the release together",
  });
  const moved = await action(session.token, {
    action: "task-move",
    id: created.id,
    status: "Done",
  });
  assert.equal(moved.state.tasks[0].status, "Done");
  const deleted = await action(session.token, {
    action: "task-delete",
    id: created.id,
  });
  assert.equal(deleted.state.tasks.length, 12);
  await assert.rejects(
    action(session.token, {
      action: "task-move",
      id: created.id,
      status: "Done",
    }),
    /not be found/,
  );
});
test("job applications validate content and URLs, prevent duplicates, support withdrawal and reapplication", async () => {
  const session = await action(undefined, { action: "bootstrap" });
  const saved = await action(session.token, {
    action: "save-job",
    id: "product-designer",
  });
  assert.deepEqual(saved.state.savedJobs, ["product-designer"]);
  const input = {
    action: "apply-job",
    jobId: "product-designer",
    ...contact,
    portfolio: "https://portfolio.example.com",
    letter:
      "I have experience building accessible products and would like to learn more.",
  };
  await assert.rejects(
    action(session.token, { ...input, portfolio: "javascript:alert(1)" }),
    /http or https/,
  );
  await assert.rejects(
    action(session.token, { ...input, letter: "Too short" }),
    /letter/,
  );
  const applied = await action(session.token, input);
  await assert.rejects(action(session.token, input), /active application/);
  await action(session.token, {
    action: "withdraw-application",
    id: applied.id,
  });
  const reapplied = await action(session.token, input);
  assert.equal(reapplied.state.applications.length, 2);
  assert.equal(
    reapplied.state.applications.filter((a) => a.status === "Submitted").length,
    1,
  );
});
test("support messages are saved, resolved requests reject replies until reopened", async () => {
  const session = await action(undefined, { action: "bootstrap" });
  assert.equal(session.state.tickets.length, 6);
  const ticket = await action(session.token, {
    action: "ticket-create",
    subject: "Need help with export",
    category: "Technical",
    priority: "High",
    body: "The export stalls after choosing the report format.",
  });
  await action(session.token, {
    action: "ticket-reply",
    id: ticket.id,
    body: "It also happens in another browser.",
  });
  await action(session.token, {
    action: "ticket-status",
    id: ticket.id,
    status: "Resolved",
  });
  await assert.rejects(
    action(session.token, {
      action: "ticket-reply",
      id: ticket.id,
      body: "More context",
    }),
    /Reopen/,
  );
  await action(session.token, {
    action: "ticket-status",
    id: ticket.id,
    status: "Open",
  });
  const replied = await action(session.token, {
    action: "ticket-reply",
    id: ticket.id,
    body: "I found another detail.",
  });
  assert.equal(replied.state.tickets[0].messages.length, 3);
});
test("reset clears only the owning workspace and restores seeded tasks and tickets", async () => {
  const session = await action(undefined, { action: "bootstrap" });
  const other = await action(undefined, { action: "bootstrap" });
  await action(session.token, { action: "save-job", id: "product-designer" });
  await action(other.token, { action: "save-job", id: "frontend-engineer" });
  await assert.rejects(action(session.token, { action: "reset" }), /Confirm/);
  const reset = await action(session.token, {
    action: "reset",
    confirm: "RESET",
  });
  assert.equal(reset.state.tasks.length, 12);
  assert.equal(reset.state.tickets.length, 6);
  assert.deepEqual(reset.state.savedJobs, []);
  const unchanged = await action(other.token, { action: "bootstrap" });
  assert.deepEqual(unchanged.state.savedJobs, ["frontend-engineer"]);
});
test("records survive a fresh server process and raw session tokens are not stored", async () => {
  const session = await action(undefined, { action: "bootstrap" });
  await action(session.token, { action: "save-job", id: "product-designer" });
  const raw = await readStoredState("workspace");
  assert.equal(raw.includes(session.token), false);
  const script = `const {performDemoAction}=require(${JSON.stringify(join(process.cwd(), "app/demo/sites/_lib/workspace.ts"))}); let token=''; process.stdin.on('data',x=>token+=x); process.stdin.on('end',async()=>{const r=await performDemoAction(token,{action:'bootstrap'}); process.stdout.write(JSON.stringify(r.state.savedJobs));});`;
  const output = execFileSync(
    process.execPath,
    ["--import", "tsx", "-e", script],
    {
      input: session.token,
      env: process.env,
      encoding: "utf8",
    },
  );
  assert.deepEqual(JSON.parse(output), ["product-designer"]);
});
