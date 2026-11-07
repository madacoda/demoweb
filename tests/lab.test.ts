import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { scenarios, workflows } from "../app/lab/catalog.ts";
import { startLab, getLab, runWithLab, labNamespace } from "../server/lab.ts";
import { performDemoAction } from "../app/demo/sites/_lib/workspace.ts";
import { performHRAction } from "../server/hris.ts";
import { inNamespace, getPool, closePools } from "../server/database.ts";
import {
  createTestNamespace,
  removeTestNamespace,
} from "./database-fixture.ts";
const root = await createTestNamespace();
after(async () => {
  await removeTestNamespace(root);
  await closePools();
});
test("lab catalog has unique IDs and every acceptance plan refers to a real preset", () => {
  assert.equal(new Set(scenarios.map((s) => s.id)).size, scenarios.length);
  assert.equal(new Set(workflows.map((w) => w.id)).size, workflows.length);
  assert.ok(workflows.every((w) => scenarios.some((s) => s.id === w.scenario)));
});
for (const scenario of scenarios)
  test(`lab preset ${scenario.id} creates independent persisted state`, async () => {
    const result = await startLab(scenario.id);
    const lab = (await getLab(result.token))!;
    assert.equal(lab.scenario, scenario.id);
    const state = await getPool().query(
      "SELECT kind FROM demo_state WHERE namespace=$1",
      [labNamespace(lab)],
    );
    assert.equal(state.rowCount, scenario.id.startsWith("hris-") ? 3 : 2);
    if (scenario.id === "hris-balance") {
      const hr = await inNamespace(labNamespace(lab), () =>
        performHRAction(result.hrToken, { action: "bootstrap" }),
      );
      assert.equal(hr.state.balances[0].available, 0);
    }
  });
test("lab namespace overrides do not leak across concurrent asynchronous requests", async () => {
  const [a, b] = await Promise.all([
    startLab("empty-workspace"),
    startLab("full-workspace"),
  ]);
  const [al, bl] = await Promise.all([getLab(a.token), getLab(b.token)]);
  const [x, y, normal] = await Promise.all([
    runWithLab(al, "workspace", { action: "bootstrap" }, () =>
      performDemoAction(a.workspaceToken, { action: "bootstrap" }),
    ),
    runWithLab(bl, "workspace", { action: "bootstrap" }, () =>
      performDemoAction(b.workspaceToken, { action: "bootstrap" }),
    ),
    performDemoAction(undefined, { action: "bootstrap" }),
  ]);
  assert.equal(x.result.state.tasks.length, 0);
  assert.equal(y.result.state.tasks.length, 200);
  assert.equal(normal.state.tasks.length, 12);
});
test("lab fault is claimed once across concurrent calls; nonmatching actions do not consume it", async () => {
  const result = await startLab("retry-save"),
    lab = (await getLab(result.token))!;
  await runWithLab(lab, "workspace", { action: "bootstrap" }, async () => 1);
  assert.equal((await getLab(result.token))?.remaining, 1);
  let calls = 0;
  const responses = await Promise.allSettled(
    [1, 2].map(() =>
      runWithLab(
        lab,
        "workspace",
        { action: "task-save" },
        async () => ++calls,
      ),
    ),
  );
  assert.equal(calls, 1);
  assert.equal(responses.filter((r) => r.status === "rejected").length, 1);
  assert.equal((await getLab(result.token))?.remaining, 0);
});
test("lab cannot be entered with an invalid or expired token", async () => {
  await assert.rejects(getLab("invalid"), /expired/);
  const result = await startLab("login");
  const lab = (await getLab(result.token))!;
  await getPool().query(
    "UPDATE lab_sessions SET expires_at=now()-interval '1 second' WHERE id=$1",
    [lab.id],
  );
  await assert.rejects(getLab(result.token), /expired/);
});
test("task stale edit is rejected while original data and version remain intact", async () => {
  const result = await startLab("stale-edit"),
    lab = (await getLab(result.token))!;
  await inNamespace(labNamespace(lab), async () => {
    const before = await performDemoAction(result.workspaceToken, {
      action: "bootstrap",
    });
    const task = before.state.tasks[0];
    const input = {
      ...task,
      action: "task-save",
      version: 1,
      title: "The first editor wins",
    };
    const saved = await performDemoAction(result.workspaceToken, {
      ...input,
      requestId: randomUUID(),
    });
    assert.equal(saved.state.tasks[0].version, 2);
    await assert.rejects(
      performDemoAction(result.workspaceToken, {
        ...input,
        title: "The stale editor loses",
        requestId: randomUUID(),
      }),
      /changed in another tab/,
    );
    assert.equal(
      (await performDemoAction(result.workspaceToken, { action: "bootstrap" }))
        .state.tasks[0].title,
      "The first editor wins",
    );
  });
});
