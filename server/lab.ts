import { createHash, randomBytes, randomUUID } from "node:crypto";
import { performHRAction } from "./hris";
import { hrPassword, nextWorkday } from "../app/hris/model";
import { getPool, inNamespace, namespace } from "./database";
import { performStoreAction } from "../app/demo/_lib/store";
import { performDemoAction } from "../app/demo/sites/_lib/workspace";
import { dateAfter, type Workspace } from "../app/demo/sites/_lib/data";
import { demoAccount, scenarios, type Scenario } from "../app/lab/catalog";

export const labCookie = "district_lab";
export class LabError extends Error {
  constructor(
    message: string,
    public status = 400,
    public retryAfter?: string,
  ) {
    super(message);
  }
}
export type LabSession = {
  id: string;
  base_namespace: string;
  scenario: string;
  remaining: number;
  expires_at: Date;
};
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const labNamespace = (
  session: Pick<LabSession, "base_namespace" | "id">,
) => `${session.base_namespace}:lab:${session.id}`;
export async function getLab(token?: string): Promise<LabSession | undefined> {
  if (!token) return;
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new LabError(
      "This test run has expired. Start a new run from the test lab.",
      401,
    );
  const result = await getPool().query<LabSession>(
    "SELECT * FROM lab_sessions WHERE id=$1 AND base_namespace=$2 AND expires_at>now()",
    [hash(token), namespace()],
  );
  if (!result.rows[0])
    throw new LabError(
      "This test run has expired. Start a new run from the test lab.",
      401,
    );
  return result.rows[0];
}
export async function startLab(scenarioId: string) {
  const scenario = scenarios.find((s) => s.id === scenarioId);
  if (!scenario) throw new LabError("Choose a listed scenario.");
  const token = randomBytes(32).toString("hex");
  const session = { id: hash(token), base_namespace: namespace() };
  let storeToken = "",
    workspaceToken = "",
    hrToken = "";
  try {
    await inNamespace(labNamespace(session), async () => {
      let store = await performStoreAction(undefined, { action: "bootstrap" });
      const send = async (input: Record<string, unknown>) => {
        store = await performStoreAction(store.token, input);
      };
      if (
        [
          "login",
          "guest-merge",
          "login-lockout",
          "session-expired",
          "rate-limit",
        ].includes(scenario.id)
      ) {
        await send({ action: "register", ...demoAccount });
        await send({ action: "saved", productId: "notebook" });
        if (scenario.id === "guest-merge")
          await send({
            action: "add",
            productId: "notebook",
            color: "Sand",
            quantity: 2,
          });
        if (scenario.id !== "session-expired") await send({ action: "logout" });
        if (scenario.id === "guest-merge") {
          await send({
            action: "add",
            productId: "notebook",
            color: "Sand",
            quantity: 1,
          });
          await send({ action: "saved", productId: "notebook" });
        }
        if (scenario.id === "login-lockout") {
          for (let n = 0; n < 4; n++) {
            try {
              await send({
                action: "login",
                email: demoAccount.email,
                password: "wrong-password",
              });
            } catch (error) {
              if (
                !(error instanceof Error) ||
                !error.message.includes("incorrect")
              )
                throw error;
            }
          }
        }
      }
      if (["last-item", "checkout-lost"].includes(scenario.id)) {
        await send({
          action: "add",
          productId: "notebook",
          color: "Sand",
          quantity: 1,
        });
        if (scenario.id === "last-item")
          await getPool().query(
            "UPDATE demo_state SET data=jsonb_set(data,'{inventory,notebook}','1') WHERE namespace=$1 AND kind='storefront' AND id='main'",
            [namespace()],
          );
      }
      storeToken = store.token;
      let workspace = await performDemoAction(undefined, {
        action: "bootstrap",
      });
      if (scenario.id === "booking-conflict")
        workspace = await performDemoAction(workspace.token, {
          action: "book-stay",
          requestId: randomUUID(),
          roomId: "bamboo-house",
          start: dateAfter(3),
          end: dateAfter(5),
          guests: 2,
          name: demoAccount.name,
          email: demoAccount.email,
        });
      if (scenario.id === "last-seat")
        workspace = await performDemoAction(workspace.token, {
          action: "reserve-event",
          requestId: randomUUID(),
          eventId: "clay-club",
          quantity: 7,
          name: demoAccount.name,
          email: demoAccount.email,
        });
      const state: Workspace = workspace.state;
      if (scenario.id === "empty-workspace") {
        state.tasks = [];
        state.tickets = [];
      }
      if (scenario.id === "full-workspace")
        state.tasks = Array.from({ length: 200 }, (_, i) => ({
          ...state.tasks[i % state.tasks.length],
          id: `DB-LIMIT-${i + 1}`,
          title: `Capacity task ${i + 1}`,
        }));
      if (scenario.id === "unicode")
        state.tasks = [
          "Café résumé — review",
          "東京のデザイン確認",
          "مراجعة التصميم",
          "Launch checklist 🚀",
          "Literal <img src=x onerror=alert(1)>",
        ].map((title, i) => ({
          ...state.tasks[i],
          id: `DB-TEXT-${i + 1}`,
          title,
          description:
            i === 4
              ? "<img src=x onerror=alert(1)> is literal text, not an image."
              : "Long description: " + "Thoughtful details. ".repeat(70),
        }));
      if (
        ["empty-workspace", "full-workspace", "unicode"].includes(scenario.id)
      )
        await getPool().query(
          "UPDATE demo_state SET data=jsonb_set(data,'{state}',$3::jsonb) WHERE namespace=$1 AND kind='workspace' AND id=$2",
          [namespace(), hash(workspace.token), JSON.stringify(state)],
        );
      workspaceToken = workspace.token;
      if (scenario.id.startsWith("hris-")) {
        let hr = await performHRAction(undefined, { action: "bootstrap" });
        if (scenario.id === "hris-filters") {
          hr = await performHRAction(hr.token, {
            action: "login",
            email: "alex@people.test",
            password: hrPassword,
          });
          for (let i = 10; i < 17; i++)
            hr = await performHRAction(hr.token, {
              action: "submit",
              requestId: randomUUID(),
              type: "Annual",
              duration: "Half day",
              start: nextWorkday(i),
              end: nextWorkday(i),
              reason: `Sample appointment number ${i}.`,
            });
          hr = await performHRAction(hr.token, { action: "logout" });
        }
        if (scenario.id !== "hris-journey") {
          const account = ["hris-reject", "hris-conflict"].includes(scenario.id)
            ? "maya"
            : scenario.id === "hris-filters"
              ? "harper"
              : "alex";
          hr = await performHRAction(hr.token, {
            action: "login",
            email: `${account}@people.test`,
            password: hrPassword,
          });
        }
        if (scenario.id === "hris-balance")
          await getPool().query(
            "UPDATE demo_state SET data=jsonb_set(data,'{users,0,annual}','1') WHERE namespace=$1 AND kind='hris' AND id='main'",
            [namespace()],
          );
        hrToken = hr.token;
      }
    });
    await getPool().query(
      "INSERT INTO lab_sessions(id,base_namespace,scenario) VALUES($1,$2,$3)",
      [session.id, session.base_namespace, scenario.id],
    );
    return { token, storeToken, workspaceToken, hrToken, scenario };
  } catch (error) {
    await getPool().query("DELETE FROM demo_state WHERE namespace=$1", [
      labNamespace(session),
    ]);
    throw error;
  }
}
// The one-shot fault is claimed atomically before any optional delay. No row lock is held while waiting.
export async function runWithLab<T>(
  session: LabSession | undefined,
  api: "store" | "workspace" | "hris",
  input: unknown,
  operation: () => Promise<T>,
): Promise<{ result: T; lost: boolean }> {
  if (!session) return { result: await operation(), lost: false };
  const scenario: Scenario | undefined = scenarios.find(
    (s) => s.id === session.scenario,
  );
  const action =
    input && typeof input === "object" && "action" in input
      ? input.action
      : undefined;
  const candidate = scenario?.fault;
  let mode: string | undefined;
  if (candidate?.api === api && candidate.action === action) {
    const claimed = await getPool().query(
      "UPDATE lab_sessions SET remaining=remaining-1 WHERE id=$1 AND remaining>0 RETURNING id",
      [session.id],
    );
    if (claimed.rowCount) mode = candidate.mode;
  }
  if (mode === "slow")
    await new Promise((resolve) => setTimeout(resolve, 1500));
  if (mode === "unavailable")
    throw new LabError(
      "The service is temporarily unavailable. Please try again.",
      503,
      "1",
    );
  if (mode === "rate")
    throw new LabError(
      "Too many requests. Wait one second and try again.",
      429,
      "1",
    );
  return inNamespace(labNamespace(session), async () => {
    if (mode === "expire") {
      // Expire the actual stored sessions, then let the ordinary auth check reject the write.
      await getPool().query(
        `UPDATE demo_state SET data=jsonb_set(data,'{sessions}',COALESCE((SELECT jsonb_object_agg(key,jsonb_set(value,'{expires}','0')) FROM jsonb_each(data->'sessions')),'{}'::jsonb)) WHERE namespace=$1 AND kind=$2 AND id='main'`,
        [namespace(), api === "hris" ? "hris" : "storefront"],
      );
    }
    return { result: await operation(), lost: mode === "lost" };
  });
}
