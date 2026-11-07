import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
const origin = "http://127.0.0.1:3001";
const root = `${origin}/demo/sites`;
const future = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

test("directory opens eight independent sites and reset restores only the six new workspaces", async ({
  page,
}) => {
  await page.goto(root);
  for (const path of [
    "/demo",
    "/hris",
    ...["haven", "thyme", "daybreak", "gather", "hireline", "careloop"].map(
      (id) => `/demo/sites/${id}`,
    ),
  ])
    await expect(page.locator(`main a[href="${path}"]`)).toHaveCount(1);
  await page.locator('main a[href="/demo/sites/hireline"]').click();
  await page
    .getByRole("button", { name: "Save Product Designer", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Job saved for later.");
  await page.getByRole("link", { name: "Explore all 8 websites" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset sample workspaces" }).click();
  await expect(page.getByRole("status")).toContainText("reset");
  await page.goto(`${root}/hireline/saved`);
  await expect(page.getByTestId("results-count")).toHaveText("0 opportunities");
});

test("Haven filters stays, prices dates, persists a booking, downloads and cancels it", async ({
  page,
}) => {
  await page.goto(`${root}/haven`);
  await expect(page.getByTestId("results-count")).toHaveText("9 stays");
  await page.getByLabel("Destination").selectOption("Ubud");
  await expect(page.getByTestId("results-count")).toHaveText("2 stays");
  await page.getByLabel("Sort by").selectOption("low");
  await expect(page.locator('a[href*="/stays/"]').first()).toContainText(
    "Garden Suite",
  );
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("link", { name: /The Bamboo House/ }).click();
  await page.getByLabel("Check-in", { exact: true }).fill(future(3));
  await page.getByLabel("Check-out", { exact: true }).fill(future(5));
  await page.getByLabel("Guests", { exact: true }).selectOption("2");
  await expect(page.getByTestId("stay-total")).toContainText("1,700,000");
  await page.getByLabel("Full name").fill("Sample Traveler");
  await page.getByLabel("Email address").fill("traveler@example.com");
  await page.getByRole("button", { name: "Reserve this stay" }).click();
  await expect(page).toHaveURL(`${root}/haven/bookings`);
  await expect(
    page.getByRole("heading", { name: "The Bamboo House" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download booking" }).click();
  expect((await download).suggestedFilename()).toMatch(/^HV-.+\.txt$/);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
});

test("Table & Thyme supports dietary filters, basket changes, offers, pickup and cancellation", async ({
  page,
}) => {
  await page.goto(`${root}/thyme`);
  await page.getByLabel("Vegan dishes only").check();
  await expect(page.getByTestId("results-count")).toHaveText("6 dishes");
  await page
    .getByRole("button", { name: "Add Harvest Bowl", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("added");
  await page.getByLabel("Vegan dishes only").uncheck();
  await expect(
    page.getByRole("button", { name: "Dark Chocolate Brownie sold out" }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Basket (1)" }).click();
  await page.getByRole("button", { name: "Increase Harvest Bowl" }).click();
  await expect(page.getByLabel("Harvest Bowl quantity")).toHaveText("2");
  await page.getByLabel("Offer code").fill("INVALID");
  await page.getByRole("button", { name: "Apply offer" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "not valid",
  );
  await page.getByLabel("Offer code").fill("LUNCH10");
  await page.getByRole("button", { name: "Apply offer" }).click();
  await expect(page.getByTestId("food-total")).toContainText("109,400");
  await page.reload();
  await expect(page.getByTestId("food-total")).toContainText("109,400");
  await page.getByLabel("Name for your order").fill("Sample Diner");
  await page.getByLabel("Phone number").fill("08123456789");
  await page.getByLabel("Pickup time").selectOption("In 30 minutes");
  await page.getByLabel("Note for the kitchen").fill("No utensils please");
  await page.getByRole("button", { name: "Place pickup order" }).click();
  await expect(page).toHaveURL(`${root}/thyme/orders`);
  await expect(
    page.getByRole("heading", { name: "Order for Sample Diner" }),
  ).toBeVisible();
  await expect(page.getByText("Received", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Basket (0)" })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cancel order" }).click();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
});

test("Daybreak creates, edits, filters, moves and deletes a task", async ({
  page,
}) => {
  await page.goto(`${root}/daybreak`);
  await expect(page.getByTestId("results-count")).toHaveText("12 tasks");
  await page.getByRole("link", { name: "+ New task", exact: true }).click();
  await page.getByLabel("Task title").fill("Verify the launch journey");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Check booking, checkout, and cancellation.");
  await page.getByLabel("Assignee", { exact: true }).selectOption("Nina");
  await page.getByLabel("Priority", { exact: true }).selectOption("High");
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page.getByTestId("results-count")).toHaveText("13 tasks");
  await page.getByRole("searchbox").fill("Verify the launch");
  await expect(page.getByTestId("results-count")).toHaveText("1 tasks");
  await page
    .getByLabel("Status for Verify the launch journey")
    .selectOption("In progress");
  await expect(
    page
      .getByRole("region", { name: "In progress", exact: true })
      .getByRole("heading", { name: "Verify the launch journey" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Verify the launch journey", exact: true })
    .click();
  await page
    .getByLabel("Task title")
    .fill("Verify the complete launch journey");
  await page.getByLabel("Status", { exact: true }).selectOption("Done");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(`${root}/daybreak`);
  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Done", exact: true })
      .getByRole("heading", { name: "Verify the complete launch journey" }),
  ).toBeVisible();
  await page
    .getByRole("link", {
      name: "Verify the complete launch journey",
      exact: true,
    })
    .click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete task" }).click();
  await expect(page.getByTestId("results-count")).toHaveText("12 tasks");
  await expect(
    page.getByRole("heading", { name: "Verify the complete launch journey" }),
  ).toHaveCount(0);
});

test("Gather sells available tickets, persists reservations, cancels and restores places", async ({
  page,
}) => {
  await page.goto(`${root}/gather`);
  await page.getByRole("searchbox").fill("clay");
  await expect(page.getByTestId("results-count")).toHaveText("1 events");
  await page.getByRole("link", { name: /Sunday Clay Club/ }).click();
  await page.getByLabel("Tickets", { exact: true }).selectOption("2");
  await expect(page.getByTestId("ticket-total")).toContainText("500,000");
  await page.getByLabel("Full name").fill("Sample Guest");
  await page.getByLabel("Email address").fill("guest@example.com");
  await page.getByRole("button", { name: "Reserve tickets" }).click();
  await expect(page).toHaveURL(`${root}/gather/tickets`);
  await page.reload();
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
  await page.goto(`${root}/gather/events/clay-club`);
  await expect(page.getByTestId("tickets-remaining")).toHaveText(
    "6 places left",
  );
  await page.getByRole("link", { name: "My tickets", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cancel tickets" }).click();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  await page.goto(`${root}/gather/events/clay-club`);
  await expect(page.getByTestId("tickets-remaining")).toHaveText(
    "8 places left",
  );
  await page.goto(`${root}/gather/events/botanical`);
  await expect(
    page.getByRole("heading", { name: "All booked up" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reserve tickets" }),
  ).toHaveCount(0);
});

test("Hireline saves jobs, applies with validation, persists and withdraws applications", async ({
  page,
}) => {
  await page.goto(`${root}/hireline`);
  await page.getByLabel("Remote only").check();
  await expect(page.getByTestId("results-count")).toHaveText("4 opportunities");
  await page
    .getByRole("button", { name: "Save Product Designer", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("saved");
  await page.getByRole("link", { name: "Saved jobs", exact: true }).click();
  await expect(page.getByTestId("results-count")).toHaveText("1 opportunities");
  await page
    .getByRole("link", { name: "Product Designer", exact: true })
    .click();
  await page.getByLabel("Full name").fill("Sample Candidate");
  await page.getByLabel("Email address").fill("candidate@example.com");
  await page
    .getByLabel("Portfolio or profile URL")
    .fill("https://portfolio.example.com");
  await page
    .getByLabel("Your introduction")
    .fill(
      "I have designed accessible products for three years and would love to contribute to your team.",
    );
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page).toHaveURL(`${root}/hireline/applications`);
  await page.reload();
  await expect(page.getByText("Submitted", { exact: true })).toBeVisible();
  await page.getByText("View submitted application", { exact: true }).click();
  await expect(
    page.getByText("candidate@example.com", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Withdraw application" }).click();
  await expect(page.getByText("Withdrawn", { exact: true })).toBeVisible();
});

test("Careloop creates, replies to, resolves, reopens and filters support requests", async ({
  page,
}) => {
  await page.goto(`${root}/careloop`);
  await expect(page.getByTestId("results-count")).toHaveText("6 requests");
  await page.getByRole("link", { name: "+ New request", exact: true }).click();
  await page
    .getByLabel("Subject", { exact: true })
    .fill("Export stops halfway through");
  await page.getByLabel("Category", { exact: true }).selectOption("Technical");
  await page.getByLabel("Priority", { exact: true }).selectOption("High");
  await page
    .getByLabel("What's happening?")
    .fill("The export stops at 50 percent after I select a report.");
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(
    page.getByRole("heading", { name: "Export stops halfway through" }),
  ).toBeVisible();
  await page
    .getByLabel("Your reply")
    .fill("It also happens after refreshing the browser.");
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.getByRole("status")).toContainText("saved");
  await page.reload();
  await expect(
    page.getByText("It also happens after refreshing the browser.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark as resolved" }).click();
  await expect(page.getByLabel("Your reply")).toHaveCount(0);
  await page.getByRole("button", { name: "Reopen request" }).click();
  await expect(page.getByLabel("Your reply")).toBeVisible();
  await page.getByRole("link", { name: "My requests", exact: true }).click();
  await page.getByRole("searchbox").fill("Export stops halfway");
  await expect(page.getByTestId("results-count")).toHaveText("1 requests");
  await page.getByLabel("Status", { exact: true }).selectOption("Resolved");
  await expect(page.getByTestId("results-count")).toHaveText("0 requests");
  await page.getByRole("link", { name: "Help center", exact: true }).click();
  await page
    .getByText("How do I close or reopen a request?", { exact: true })
    .click();
  await expect(page.getByText(/Your conversation is kept/)).toBeVisible();
});

test("demo API rejects cross-site, malformed and oversized input and isolates browser sessions", async ({
  browser,
  request,
}) => {
  expect(
    (
      await request.post(`${root}/api`, {
        headers: { origin: "https://unrelated.example" },
        data: { action: "bootstrap" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (await request.post(`${root}/api`, { data: "bad json" })).status(),
  ).toBe(400);
  expect(
    (await request.post(`${root}/api`, { data: "x".repeat(17000) })).status(),
  ).toBe(413);
  const a = await browser.newContext(),
    b = await browser.newContext();
  try {
    await a.request.post(`${root}/api`, { data: { action: "bootstrap" } });
    await a.request.post(`${root}/api`, {
      data: {
        action: "save-job",
        id: "product-designer",
        requestId: randomUUID(),
      },
    });
    const untouched = await b.request.post(`${root}/api`, {
      data: { action: "bootstrap" },
    });
    expect((await untouched.json()).state.savedJobs).toEqual([]);
    const cookie = (await a.cookies()).find(
      (c) => c.name === "demo_district_session",
    );
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");
    const unknown = await a.request.get(`${root}/haven/stays/not-a-real-room`);
    expect(unknown.status()).toBe(404);
  } finally {
    await a.close();
    await b.close();
  }
});

for (const site of [
  "",
  "/haven",
  "/thyme",
  "/daybreak",
  "/gather",
  "/hireline",
  "/careloop",
]) {
  test(`site ${site || "directory"} fits mobile and has no detected accessibility violations`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${root}${site}`);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    if (!site)
      await expect(
        page.getByRole("button", { name: "Reset sample workspaces" }),
      ).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}
