import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { nextWorkday, hrPassword } from "../../app/hris/model";
const origin = "http://127.0.0.1:3001";
async function start(page: Page, scenario: string) {
  const response = await page.request.post(`${origin}/lab/api`, {
    data: { action: "start", scenario },
  });
  expect(response.ok()).toBe(true);
  await page.goto(origin + (await response.json()).path);
}
async function signIn(page: Page, account: string) {
  await page
    .getByLabel("Email address", { exact: true })
    .fill(`${account}@people.test`);
  await page.getByLabel("Password", { exact: true }).fill(hrPassword);
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
}
async function taskForm(page: Page, title: string) {
  await page.getByLabel("Task title").fill(title);
  await page
    .getByLabel("Description", { exact: true })
    .fill("A deliberate recovery check with retained form values.");
}
async function leaveForm(page: Page, reason: string) {
  await page.getByLabel("Start date", { exact: true }).fill(nextWorkday(12));
  await page.getByLabel("End date", { exact: true }).fill(nextWorkday(12));
  await page.getByLabel("Reason", { exact: true }).fill(reason);
}
const workspace = (context: BrowserContext) =>
  context.request
    .post(`${origin}/demo/sites/api`, { data: { action: "bootstrap" } })
    .then((response) => response.json());

test("test lab starts a fresh run through its UI, downloads catalog and restores normal data", async ({
  page,
}) => {
  await page.request.post(`${origin}/demo/sites/api`, {
    data: { action: "bootstrap" },
  });
  await page.request.post(`${origin}/demo/sites/api`, {
    data: {
      action: "save-job",
      id: "product-designer",
      requestId: randomUUID(),
    },
  });
  await page.goto(`${origin}/lab`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Good tests",
  );
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download UAT catalog" }).click();
  expect((await download).suggestedFilename()).toBe(
    "demo-district-uat-cases.json",
  );
  await page.getByLabel("Search scenarios").fill("truly empty");
  await page.getByRole("button", { name: "Start fresh scenario" }).click();
  await expect(page.getByTestId("results-count")).toHaveText("0 tasks");
  expect((await workspace(page.context())).state.savedJobs).toEqual([]);
  await page.goto(`${origin}/lab`);
  await page
    .getByRole("button", { name: "Leave lab & restore normal data" })
    .click();
  await expect(page).toHaveURL(`${origin}/demo/sites`);
  expect((await workspace(page.context())).state.savedJobs).toEqual([
    "product-designer",
  ]);
});

for (const scenario of ["retry-save", "lost-response"])
  test(`${scenario}: a failed task response can be retried with no duplicate record`, async ({
    page,
  }) => {
    await start(page, scenario);
    const title = `Recovery ${scenario}`;
    await taskForm(page, title);
    await page.getByRole("button", { name: "Create task" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      scenario === "retry-save" ? "temporarily unavailable" : "interrupted",
    );
    await expect(page.getByLabel("Task title")).toHaveValue(title);
    const before = (await workspace(page.context())).state.tasks.filter(
      (task: { title: string }) => task.title === title,
    );
    expect(before).toHaveLength(scenario === "retry-save" ? 0 : 1);
    await page.getByRole("button", { name: "Create task" }).click();
    await expect(page).toHaveURL(`${origin}/demo/sites/daybreak`);
    expect(
      (await workspace(page.context())).state.tasks.filter(
        (task: { title: string }) => task.title === title,
      ),
    ).toHaveLength(1);
  });

test("slow save blocks a rapid second submission and clears pending state", async ({
  page,
}) => {
  await start(page, "slow-save");
  await taskForm(page, "Only one slow task");
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page.getByRole("button", { name: /Saving/ })).toBeDisabled();
  await expect(page).toHaveURL(`${origin}/demo/sites/daybreak`);
  expect(
    (await workspace(page.context())).state.tasks.filter(
      (task: { title: string }) => task.title === "Only one slow task",
    ),
  ).toHaveLength(1);
});

test("failed initial load offers a working keyboard accessible retry", async ({
  page,
}) => {
  await start(page, "load-error");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "couldn't load",
  );
  await page.getByRole("button", { name: "Retry loading" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("results-count")).toHaveText("12 tasks");
  await expect(page.getByRole("main").getByRole("alert")).not.toBeVisible();
});

test("job filter intersection, clear, Back, reload and invalid URL values stay consistent", async ({
  page,
}) => {
  await start(page, "filters");
  await page.getByLabel("Team", { exact: true }).selectOption("Design");
  await page.getByLabel("Remote only").check();
  const count = await page.getByTestId("results-count").innerText();
  expect(count).not.toBe("10 opportunities");
  await page
    .getByRole("link", { name: /Product Designer/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/(jobs|requests)\//);
  await page.goBack();
  await expect(page.getByLabel("Remote only")).toBeChecked();
  await expect(page.getByLabel("Team", { exact: true })).toHaveValue("Design");
  await expect(page.getByTestId("results-count")).toHaveText(count);
  await page.reload();
  await expect(page.getByTestId("results-count")).toHaveText(count);
  await page.getByLabel("Search", { exact: true }).fill("no-results-zzzz");
  await expect(page.getByTestId("results-count")).toHaveText("0 opportunities");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByLabel("Remote only")).not.toBeChecked();
  await expect(page.getByTestId("results-count")).toHaveText(
    "10 opportunities",
  );
  await page.goto(
    `${origin}/demo/sites/hireline?team=unknown&remote=maybe&type=wrong`,
  );
  await expect(page.getByLabel("Team", { exact: true })).toHaveValue("All");
  await expect(page.getByTestId("results-count")).toHaveText(
    "10 opportunities",
  );
});

test("Unicode search trims whitespace and markup is rendered literally", async ({
  page,
}) => {
  await start(page, "unicode");
  await page.getByLabel("Search", { exact: true }).fill(" CAFÉ ");
  await expect(page.getByTestId("results-count")).toHaveText("1 tasks");
  await page.getByLabel("Search", { exact: true }).fill("東京");
  await expect(page.getByTestId("results-count")).toHaveText("1 tasks");
  await page.getByLabel("Search", { exact: true }).fill("<img");
  await expect(
    page.getByRole("heading", { name: "Literal <img src=x onerror=alert(1)>" }),
  ).toBeVisible();
  await expect(page.locator("img[onerror]")).toHaveCount(0);
});

test("store login merges guest bag once and expired profile writes are rejected", async ({
  page,
}) => {
  await start(page, "guest-merge");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("ALEX@EXAMPLE.TEST");
  await page.getByLabel("Password", { exact: true }).fill("District123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/demo/account`);
  await expect(page.getByTestId("bag-count")).toHaveText("3");
  await page.goto(`${origin}/demo/saved`);
  await expect(page.getByTestId("product-notebook")).toHaveCount(1);
  await start(page, "session-expired");
  await page.getByLabel("Full name", { exact: true }).fill("Unsaved person");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(
    page.getByText("Please sign in to update your details.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true }).first(),
  ).toBeVisible();
});

test("store checkout recovers an already committed order after a lost response", async ({
  page,
}) => {
  await start(page, "checkout-lost");
  await page.getByLabel("Full name", { exact: true }).fill("Sample Shopper");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("sample@example.test");
  await page.getByLabel("Phone number", { exact: true }).fill("08123456789");
  await page
    .getByLabel("Street address", { exact: true })
    .fill("1 Sample Street");
  await page.getByLabel("City", { exact: true }).fill("Jakarta");
  await page.getByLabel("Postal code", { exact: true }).fill("12345");
  await page.getByTestId("place-order").click();
  await expect(
    page.getByText(
      "The response was interrupted. Please retry your unchanged submission.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByTestId("place-order").click();
  await expect(page).toHaveURL(/\/demo\/orders\/FF-/);
  const state = await page.request
    .post(`${origin}/demo/api`, { data: { action: "state" } })
    .then((r) => r.json());
  expect(state.state.orders).toHaveLength(1);
  expect(
    state.state.products.find(
      (product: { id: string }) => product.id === "notebook",
    ).stock,
  ).toBe(23);
});

test("HRIS employee submit → manager approval → HR balance and audit, all through UI", async ({
  page,
}) => {
  await start(page, "hris-journey");
  await signIn(page, "alex");
  await expect(page.getByTestId("annual-available")).toHaveText("11");
  await page
    .getByRole("navigation", { name: "People navigation" })
    .getByRole("link", { name: "Request leave", exact: true })
    .click();
  await leaveForm(page, "A family celebration for the full browser journey.");
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page).toHaveURL(/\/hris\/requests\/LV-/);
  const id = page.url().split("/").at(-1)!;
  await expect(page.getByText("Pending", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, "maya");
  await page.getByRole("link").filter({ hasText: id }).click();
  await page
    .getByLabel("Decision note")
    .fill("Team coverage is arranged. Enjoy the celebration.");
  await page.getByRole("button", { name: "Save decision" }).click();
  await expect(page.getByText("Approved", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save decision" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, "harper");
  const row = page.getByTestId("balance-alex-Annual");
  await expect(row.locator("td")).toHaveText(["Annual", "12", "1", "1", "10"]);
  await page.getByRole("link", { name: "Activity", exact: true }).click();
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: id })
      .filter({ hasText: "Approved" }),
  ).toContainText("Maya Chen");
});

test("HRIS rejection requires a reason and returns reserved days", async ({
  page,
}) => {
  await start(page, "hris-reject");
  await page.getByRole("link").filter({ hasText: "LV-SEED-001" }).click();
  await page.getByLabel("Decision", { exact: true }).selectOption("Rejected");
  await page.getByRole("button", { name: "Save decision" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "valid note",
  );
  await page
    .getByLabel("Decision note")
    .fill("Please coordinate coverage before these dates.");
  await page.getByRole("button", { name: "Save decision" }).click();
  await expect(page.getByText("Rejected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, "alex");
  await expect(page.getByTestId("annual-available")).toHaveText("12");
  await page.getByRole("link").filter({ hasText: "LV-SEED-001" }).click();
  await expect(
    page.getByText("Please coordinate coverage before these dates.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("HRIS direct role URLs and forged API requests cannot bypass authorization", async ({
  page,
}) => {
  await start(page, "hris-permissions");
  await page.goto(`${origin}/hris/balances`);
  await expect(
    page.getByRole("heading", { name: "Access restricted" }),
  ).toBeVisible();
  const response = await page.request.post(`${origin}/hris/api`, {
    data: {
      action: "decide",
      id: "LV-SEED-001",
      version: 1,
      decision: "Approved",
      note: "",
      role: "manager",
      requestId: randomUUID(),
    },
  });
  expect(response.status()).toBe(403);
  await page.goto(`${origin}/hris/requests/LV-SEED-003`);
  await expect(
    page.getByRole("heading", { name: "Request not found" }),
  ).toBeVisible();
});

test("HRIS filters reset pagination, survive Back and reload, and recover zero results", async ({
  page,
}) => {
  await start(page, "hris-filters");
  await expect(page.getByTestId("hr-results")).toHaveText("10 requests");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await page.getByLabel("Team", { exact: true }).selectOption("Operations");
  await page.getByLabel("Status", { exact: true }).selectOption("Pending");
  await expect(page.getByTestId("hr-results")).toHaveText("1 request");
  await expect(page.getByText("Page 1 of 1")).toBeVisible();
  await page.getByRole("link").filter({ hasText: "LV-SEED-003" }).click();
  await expect(page).toHaveURL(/\/(jobs|requests)\//);
  await page.goBack();
  await page.reload();
  await expect(page.getByLabel("Team", { exact: true })).toHaveValue(
    "Operations",
  );
  await expect(page.getByTestId("hr-results")).toHaveText("1 request");
  await page.getByLabel("Search requests").fill("impossible-person-xyz");
  await expect(page.getByTestId("hr-results")).toHaveText("0 requests");
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.getByTestId("hr-results")).toHaveText("10 requests");
});

for (const scenario of ["hris-retry", "hris-expiry"])
  test(`${scenario}: submit recovery respects authorization and idempotency`, async ({
    page,
  }) => {
    await start(page, scenario);
    await leaveForm(
      page,
      "Checking a deliberately interrupted leave submission.",
    );
    await page.getByRole("button", { name: "Submit request" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      scenario === "hris-retry" ? "interrupted" : "expired",
    );
    if (scenario === "hris-retry") {
      await expect(page.getByLabel("Reason", { exact: true })).toHaveValue(
        "Checking a deliberately interrupted leave submission.",
      );
      await page.getByRole("button", { name: "Submit request" }).click();
      await expect(page).toHaveURL(/\/hris\/requests\/LV-/);
    } else await signIn(page, "alex");
    const state = await page.request
      .post(`${origin}/hris/api`, { data: { action: "bootstrap" } })
      .then((r) => r.json());
    expect(state.state.requests).toHaveLength(
      scenario === "hris-retry" ? 2 : 1,
    );
    expect(
      state.state.audit.filter(
        (entry: { action: string }) => entry.action === "Submitted",
      ),
    ).toHaveLength(scenario === "hris-retry" ? 1 : 0);
  });

for (const route of ["/lab", "/hris/login", "/hris/balances"])
  test(`mobile and accessibility: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    if (route.endsWith("balances")) await start(page, "hris-filters");
    await page.goto(origin + route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

test("lab and HRIS HTTP routes reject malformed, oversized and cross-origin requests", async ({
  request,
}) => {
  for (const route of ["/lab/api", "/hris/api"]) {
    expect(
      (await request.post(origin + route, { data: "bad json" })).status(),
    ).toBe(400);
    expect(
      (
        await request.post(origin + route, { data: "x".repeat(17000) })
      ).status(),
    ).toBe(413);
    expect(
      (
        await request.post(origin + route, {
          data: { action: "bootstrap" },
          headers: { origin: "https://unrelated.example" },
        })
      ).status(),
    ).toBe(403);
  }
});

test("HR keeps an edited allowance's version when background refresh finds another edit", async ({
  page,
}) => {
  await start(page, "hris-filters");
  await page.getByRole("link", { name: "Leave balances", exact: true }).click();
  await page.getByLabel("New allowance (days)").fill("18");
  await page
    .getByLabel("Adjustment reason")
    .fill("A pending HR correction in the first tab.");
  const changed = await page.request.post(`${origin}/hris/api`, {
    data: {
      action: "adjust-balance",
      employeeId: "alex",
      type: "Annual",
      allowance: 15,
      version: 1,
      note: "Another HR session adjusted this first.",
      requestId: randomUUID(),
    },
  });
  expect(changed.ok()).toBe(true);
  await page.getByRole("button", { name: "Refresh data" }).click();
  await expect(
    page.getByTestId("balance-alex-Annual").locator("td").nth(1),
  ).toHaveText("15");
  await page.getByRole("button", { name: "Save allowance" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "changed in another session",
  );
  const state = await page.request
    .post(`${origin}/hris/api`, { data: { action: "bootstrap" } })
    .then((response) => response.json());
  expect(
    state.state.balances.find(
      (b: { employeeId: string; type: string }) =>
        b.employeeId === "alex" && b.type === "Annual",
    ).allowance,
  ).toBe(15);
});
