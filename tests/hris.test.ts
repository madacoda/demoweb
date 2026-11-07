import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { performHRAction, leaveDays } from "../server/hris.ts";
import { hrPassword, nextWorkday, today } from "../app/hris/model.ts";
import {
  getPool,
  inNamespace,
  namespace,
  closePools,
} from "../server/database.ts";
import {
  createTestNamespace,
  removeTestNamespace,
} from "./database-fixture.ts";
const root = await createTestNamespace();
after(async () => {
  await removeTestNamespace(root);
  await closePools();
});
function scenario(name: string, run: () => Promise<void>) {
  test(name, () => inNamespace(`${root}:lab:${randomUUID()}`, run));
}
const login = (name: string, token?: string) =>
  performHRAction(token, {
    action: "login",
    email: `${name}@people.test`,
    password: hrPassword,
  });
const send = (token: string, input: Record<string, unknown>) =>
  performHRAction(token, { requestId: randomUUID(), ...input });
const request = (offset = 12) => ({
  action: "submit",
  type: "Annual",
  duration: "Full day",
  start: nextWorkday(offset),
  end: nextWorkday(offset),
  reason: "A planned family appointment.",
});
const status = (code: number) => (error: unknown) =>
  error instanceof Error && "status" in error && error.status === code;
scenario(
  "HRIS: employee submits, own manager approves, HR reconciles balances and audit",
  async () => {
    const employee = await login("alex");
    const submitted = await send(employee.token, request());
    assert.equal(submitted.state.requests[0].status, "Pending");
    assert.equal(submitted.state.balances[0].pending, 2);
    assert.equal(submitted.state.balances[0].available, 10);
    const manager = await login("maya");
    const approved = await send(manager.token, {
      action: "decide",
      id: submitted.id,
      version: 1,
      decision: "Approved",
      note: "Coverage arranged.",
    });
    assert.equal(
      approved.state.requests.find((r) => r.id === submitted.id)?.status,
      "Approved",
    );
    const hr = await login("harper");
    const balance = hr.state.balances.find(
      (b) => b.employeeId === "alex" && b.type === "Annual",
    )!;
    assert.deepEqual(
      [balance.used, balance.pending, balance.available],
      [1, 1, 10],
    );
    assert.deepEqual(
      hr.state.audit
        .filter((a) => a.targetId === submitted.id)
        .map((a) => [a.action, a.actorId]),
      [
        ["Approved", "maya"],
        ["Submitted", "alex"],
      ],
    );
    assert.ok(!JSON.stringify(hr.state).includes('"password"'));
    assert.ok(!JSON.stringify(hr.state).includes('"salt"'));
  },
);
scenario(
  "HRIS: server permissions ignore forged roles and employee IDs",
  async () => {
    const employee = await login("alex");
    for (const input of [
      {
        action: "decide",
        id: "LV-SEED-001",
        version: 1,
        decision: "Approved",
        note: "",
        role: "manager",
      },
      {
        action: "adjust-balance",
        employeeId: "alex",
        type: "Annual",
        allowance: 50,
        version: 1,
        note: "Forged privilege attempt.",
        role: "hr",
      },
    ])
      await assert.rejects(send(employee.token, input), status(403));
    const forged = await send(employee.token, {
      ...request(),
      employeeId: "sam",
      role: "hr",
    });
    assert.equal(forged.state.requests[0].employeeId, "alex");
    for (const role of ["maya", "harper"]) {
      const user = await login(role);
      await assert.rejects(send(user.token, request()), status(403));
    }
    const hr = await login("harper");
    await assert.rejects(
      send(hr.token, {
        action: "decide",
        id: "LV-SEED-001",
        version: 1,
        decision: "Approved",
        note: "",
      }),
      status(403),
    );
  },
);
scenario(
  "HRIS: employee and manager data and mutations stay within ownership",
  async () => {
    const alex = await login("alex"),
      maya = await login("maya"),
      leo = await login("leo");
    assert.deepEqual(
      alex.state.people.map((p) => p.id),
      ["alex"],
    );
    assert.deepEqual(
      maya.state.people.map((p) => p.id),
      ["alex", "sam"],
    );
    assert.deepEqual(
      leo.state.people.map((p) => p.id),
      ["nina"],
    );
    assert.ok(maya.state.audit.every((entry) => entry.employeeId !== "nina"));
    await assert.rejects(
      send(alex.token, { action: "cancel", id: "LV-SEED-002", version: 2 }),
      status(404),
    );
    await assert.rejects(
      send(maya.token, {
        action: "decide",
        id: "LV-SEED-003",
        version: 1,
        decision: "Approved",
        note: "",
      }),
      status(404),
    );
    assert.equal((await login("nina")).state.requests[0].status, "Pending");
  },
);
scenario(
  "HRIS: login normalizes email, rotates tokens and logout invalidates the old token",
  async () => {
    const guest = await performHRAction(undefined, { action: "bootstrap" });
    const user = await performHRAction(guest.token, {
      action: "login",
      email: " ALEX@PEOPLE.TEST ",
      password: hrPassword,
    });
    assert.notEqual(user.token, guest.token);
    assert.equal(
      (await performHRAction(guest.token, { action: "bootstrap" })).state.user,
      null,
    );
    const logout = await performHRAction(user.token, { action: "logout" });
    assert.notEqual(logout.token, user.token);
    assert.equal(
      (await performHRAction(user.token, { action: "bootstrap" })).state.user,
      null,
    );
    await assert.rejects(send(user.token, request()), status(401));
  },
);
scenario(
  "HRIS: invalid logins use generic messages and persist lockout",
  async () => {
    for (let i = 0; i < 5; i++)
      await assert.rejects(
        performHRAction(undefined, {
          action: "login",
          email: "alex@people.test",
          password: "incorrect",
        }),
        { message: "Email or password is incorrect." },
      );
    await assert.rejects(login("alex"), status(429));
    await assert.rejects(
      performHRAction(undefined, {
        action: "login",
        email: "unknown@people.test",
        password: "incorrect",
      }),
      { message: "Email or password is incorrect." },
    );
    assert.equal((await login("sam")).state.user?.id, "sam");
  },
);
scenario(
  "HRIS: expired sessions cannot create leave or expose private state",
  async () => {
    const user = await login("alex");
    await getPool().query(
      "UPDATE demo_state SET data=jsonb_set(data,'{sessions}',(SELECT jsonb_object_agg(key,jsonb_set(value,'{expires}','0')) FROM jsonb_each(data->'sessions'))) WHERE namespace=$1 AND kind='hris'",
      [namespace()],
    );
    await assert.rejects(send(user.token, request()), status(401));
    assert.equal(
      (await performHRAction(user.token, { action: "bootstrap" })).state.user,
      null,
    );
    assert.equal((await login("alex")).state.requests.length, 1);
  },
);
const invalid = [
  ["reversed dates", { start: nextWorkday(12), end: nextWorkday(11) }],
  ["impossible calendar date", { start: "2027-02-30", end: "2027-02-30" }],
  ["past date", { start: "2020-01-01", end: "2020-01-01" }],
  ["too far in future", { start: "2099-01-01", end: "2099-01-01" }],
  ["over 30 calendar days", { start: nextWorkday(12), end: nextWorkday(40) }],
  [
    "multi-day half day",
    { start: nextWorkday(12), end: nextWorkday(13), duration: "Half day" },
  ],
  ["unknown leave type", { type: "Unlimited" }],
  ["unknown duration", { duration: "Quarter hour" }],
  ["blank reason", { reason: "           " }],
  ["long reason", { reason: "a".repeat(1001) }],
] as const;
for (const [label, changes] of invalid)
  scenario(`HRIS validation: ${label} rolls back all state`, async () => {
    const user = await login("alex");
    await assert.rejects(
      send(user.token, { ...request(), ...changes }),
      status(400),
    );
    const after = await performHRAction(user.token, { action: "bootstrap" });
    assert.deepEqual(after.state.requests, user.state.requests);
    assert.deepEqual(after.state.balances, user.state.balances);
    assert.deepEqual(after.state.audit, user.state.audit);
  });
scenario(
  "HRIS: working days exclude weekends and half days reserve 0.5",
  async () => {
    assert.equal(leaveDays("2026-11-13", "2026-11-16", false), 2);
    assert.throws(
      () => leaveDays("2026-11-14", "2026-11-15", false),
      /working day/,
    );
    const user = await login("alex");
    const result = await send(user.token, {
      ...request(),
      duration: "Half day",
    });
    assert.equal(result.state.requests[0].days, 0.5);
    assert.equal(result.state.balances[0].available, 10.5);
    assert.ok(today().match(/^\d{4}-\d{2}-\d{2}$/));
  },
);
scenario(
  "HRIS: overlaps are rejected across leave types and pending/approved states",
  async () => {
    const employee = await login("alex");
    for (const type of ["Annual", "Sick"])
      await assert.rejects(
        send(employee.token, { ...request(3), type }),
        status(409),
      );
    const manager = await login("maya");
    await send(manager.token, {
      action: "decide",
      id: "LV-SEED-001",
      version: 1,
      decision: "Approved",
      note: "",
    });
    await assert.rejects(send(employee.token, request(3)), status(409));
  },
);
scenario(
  "HRIS: rejecting requires a reason, releases reservation and permits resubmission",
  async () => {
    const manager = await login("maya");
    const decision = {
      action: "decide",
      id: "LV-SEED-001",
      version: 1,
      decision: "Rejected",
    };
    await assert.rejects(
      send(manager.token, { ...decision, note: "" }),
      status(400),
    );
    await send(manager.token, {
      ...decision,
      note: "Please arrange team coverage first.",
    });
    const employee = await login("alex");
    assert.equal(employee.state.balances[0].available, 12);
    const result = await send(employee.token, request(3));
    assert.equal(result.state.balances[0].available, 11);
    assert.equal(result.state.requests.length, 2);
  },
);
scenario(
  "HRIS: simultaneous submissions cannot overdraw a balance",
  async () => {
    const user = await login("alex");
    const results = await Promise.allSettled([
      send(user.token, { ...request(15), end: nextWorkday(20) }),
      send(user.token, { ...request(25), end: nextWorkday(30) }),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const state = (await performHRAction(user.token, { action: "bootstrap" }))
      .state;
    assert.equal(state.balances[0].available, 5);
    assert.equal(state.requests.length, 2);
  },
);
scenario(
  "HRIS: competing approvals use optimistic versions and one audit decision",
  async () => {
    const manager = await login("maya");
    const results = await Promise.allSettled(
      ["Approved", "Rejected"].map((decision) =>
        send(manager.token, {
          action: "decide",
          id: "LV-SEED-001",
          version: 1,
          decision,
          note: "A considered decision for the team.",
        }),
      ),
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.ok(
      results.some((r) => r.status === "rejected" && status(409)(r.reason)),
    );
    const state = (
      await performHRAction(manager.token, { action: "bootstrap" })
    ).state;
    assert.equal(
      state.audit.filter(
        (a) => a.targetId === "LV-SEED-001" && a.action !== "Seeded request",
      ).length,
      1,
    );
    const current = state.requests.find((r) => r.id === "LV-SEED-001")!;
    await assert.rejects(
      send(manager.token, {
        action: "decide",
        id: current.id,
        version: current.version,
        decision: "Approved",
        note: "",
      }),
      status(409),
    );
  },
);
scenario(
  "HRIS: cancellation is idempotent for pending and approved leave",
  async () => {
    for (const [account, id, version] of [
      ["alex", "LV-SEED-001", 1],
      ["sam", "LV-SEED-002", 2],
    ] as const) {
      const user = await login(account);
      const input = { action: "cancel", id, version, requestId: randomUUID() };
      const a = await send(user.token, input),
        b = await send(user.token, input);
      assert.equal(a.id, b.id);
      assert.equal(b.state.balances[0].available, 12);
      assert.equal(
        b.state.audit.filter((entry) => entry.action === "Cancelled").length,
        1,
      );
      await assert.rejects(
        send(user.token, {
          ...input,
          version: version + 1,
          requestId: randomUUID(),
        }),
        status(409),
      );
    }
  },
);
scenario(
  "HRIS: HR adjustments respect committed days, reason, bounds and stale versions",
  async () => {
    const hr = await login("harper");
    const input = {
      action: "adjust-balance",
      employeeId: "alex",
      type: "Annual",
      version: 1,
      note: "Annual allowance correction approved.",
    };
    for (const allowance of [-1, 1.25, 61, "12"])
      await assert.rejects(
        send(hr.token, { ...input, allowance }),
        status(400),
      );
    await assert.rejects(
      send(hr.token, { ...input, allowance: 0 }),
      status(409),
    );
    await assert.rejects(
      send(hr.token, { ...input, allowance: 15, note: "" }),
      status(400),
    );
    const result = await send(hr.token, { ...input, allowance: 15.5 });
    assert.equal(
      result.state.balances.find(
        (b) => b.employeeId === "alex" && b.type === "Annual",
      )?.available,
      14.5,
    );
    await assert.rejects(
      send(hr.token, { ...input, allowance: 20 }),
      status(409),
    );
    assert.equal(result.state.audit[0].action, "Balance adjusted");
  },
);
scenario(
  "HRIS: same request ID replays once and changed payload gets 409",
  async () => {
    const user = await login("alex");
    const input = { ...request(), requestId: randomUUID() };
    const results = await Promise.all([
      send(user.token, input),
      send(user.token, input),
    ]);
    assert.equal(results[0].id, results[1].id);
    assert.equal(
      results[1].state.audit.filter((entry) => entry.action === "Submitted")
        .length,
      1,
    );
    await assert.rejects(
      send(user.token, {
        ...input,
        reason: "Another reason using the same key.",
      }),
      status(409),
    );
  },
);
