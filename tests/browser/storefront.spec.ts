import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

const origin = "http://127.0.0.1:1112";

test("storefront has a working catalog, search, categories, sorting, and product pages", async ({
  page,
}) => {
  await page.goto(`${origin}/demo`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Good things.",
  );
  await expect(page.getByText("Veriflow", { exact: true })).toHaveCount(0);
  await page
    .getByRole("link", { name: "Find your everyday", exact: true })
    .click();
  await expect(page.getByTestId("results-count")).toHaveText("8 objects");
  await page
    .getByRole("navigation", { name: "Product categories" })
    .getByRole("link", { name: "Paper", exact: true })
    .click();
  await expect(page.getByTestId("results-count")).toHaveText("2 objects");
  await page.getByLabel("Sort by").selectOption("price-high");
  await expect(page.locator("article").first()).toHaveAttribute(
    "data-testid",
    "product-planner",
  );
  await page.getByRole("link", { name: "Clear filters" }).click();
  await page
    .getByRole("searchbox", { name: "Search the collection" })
    .fill("notebook");
  await page
    .getByRole("button", { name: "Search products", exact: true })
    .click();
  await expect(page.getByTestId("results-count")).toHaveText("1 object");
  await page
    .getByRole("link", { name: "The Field Notebook", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The Field Notebook",
  );
});

test("selected variants, quantity updates, favorites, and cart survive reload", async ({
  page,
}) => {
  await page.goto(`${origin}/demo/products/field-notebook`);
  await page.getByRole("radio", { name: "Forest", exact: true }).check();
  await page
    .getByRole("button", { name: "Increase The Field Notebook quantity" })
    .click();
  await page.getByTestId("add-to-bag").click();
  await expect(page.getByTestId("bag-count")).toHaveText("2");
  await page
    .getByRole("button", { name: "Save The Field Notebook", exact: true })
    .click();
  await page.getByRole("link", { name: "Your bag 2", exact: true }).click();
  await expect(page.getByTestId("cart-notebook-Forest")).toBeVisible();
  await expect(page.getByTestId("order-total")).toHaveText("130000");
  await page.reload();
  await expect(page.getByTestId("order-total")).toHaveText("130000");
  await page
    .getByRole("button", {
      name: "Decrease The Field Notebook Forest quantity",
    })
    .click();
  await expect(page.getByTestId("order-total")).toHaveText("65000");
  await page
    .getByRole("button", { name: "Remove The Field Notebook Forest" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Your bag is taking a little breather.",
    }),
  ).toBeVisible();
  await page.goto(`${origin}/demo/saved`);
  await expect(page.getByTestId("product-notebook")).toBeVisible();
});

test("stock, no-results, and invalid coupon states are actionable", async ({
  page,
}) => {
  await page.goto(`${origin}/demo/products/brass-page-clips`);
  await expect(page.getByTestId("add-to-bag")).toBeDisabled();
  await page.goto(`${origin}/demo/shop?q=xyz-nothing`);
  await expect(
    page.getByRole("heading", { name: "Nothing here just yet." }),
  ).toBeVisible();
  await page.goto(`${origin}/demo?bug=0`);
  await page.getByTestId("apply-coupon").click();
  await expect(page.getByTestId("coupon-input")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByTestId("coupon-input").fill("INVALID");
  await page.getByTestId("apply-coupon").click();
  await expect(
    page.getByText("That code isn’t valid. Try SAVE10 for 10% off.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("order-total")).toHaveText("100000");
});

test("both frozen workflow scenarios retain their exact assertion targets", async ({
  page,
}) => {
  for (const [bug, total] of [
    ["1", "100000"],
    ["0", "90000"],
  ]) {
    await page.goto(`${origin}/demo?bug=${bug}`);
    await expect(page.getByTestId("order-total")).toHaveText("100000");
    await page.getByTestId("coupon-input").fill("SAVE10");
    await page.getByTestId("apply-coupon").click();
    await expect(page.getByTestId("coupon-status")).toHaveText(
      "SAVE10 applied",
    );
    await expect(page.getByTestId("order-total")).toHaveText(total);
    await page.getByTestId("apply-coupon").click();
    await expect(page.getByTestId("order-total")).toHaveText(total);
  }
});

test("guest can shop, check out, download a receipt, reload history, and cancel", async ({
  page,
}) => {
  await page.goto(`${origin}/demo/products/everyday-pen`);
  await page.getByTestId("add-to-bag").click();
  await expect(page.getByTestId("bag-count")).toHaveText("1");
  await page.getByRole("link", { name: "Your bag 1", exact: true }).click();
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await page.getByTestId("place-order").click();
  await expect(page).toHaveURL(`${origin}/demo/checkout`);
  await page.getByLabel("Full name", { exact: true }).fill("Browser Fixture");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("browser@example.com");
  await page.getByLabel("Phone number", { exact: true }).fill("081234567890");
  await page
    .getByLabel("Street address", { exact: true })
    .fill("1 Example Street");
  await page.getByLabel("City", { exact: true }).fill("Jakarta");
  await page.getByLabel("Postal code", { exact: true }).fill("12345");
  await page.getByLabel("Studio pickup").check();
  await expect(page.getByTestId("order-total")).toHaveText("35000");
  await page.getByLabel("Express delivery").check();
  await expect(page.getByLabel("Street address", { exact: true })).toHaveValue(
    "1 Example Street",
  );
  await expect(page.getByTestId("order-total")).toHaveText("60000");
  await page.getByTestId("coupon-input").fill("SAVE10");
  await page.getByTestId("apply-coupon").click();
  await expect(page.getByTestId("order-total")).toHaveText("56500");
  await page.getByTestId("place-order").click();
  await expect(page).toHaveURL(/\/demo\/orders\/FF-/);
  await expect(page.getByTestId("receipt-total")).toHaveText("Rp 56.500");
  await expect(page.getByTestId("order-status")).toHaveText("Confirmed");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download receipt" }).click();
  const download = await downloadEvent;
  const receipt = await readFile((await download.path())!, "utf8");
  expect(receipt).toContain("Total: Rp 56.500");
  await page.reload();
  await expect(page.getByTestId("receipt-total")).toHaveText("Rp 56.500");
  await page.getByRole("button", { name: "Cancel order", exact: true }).click();
  await page.getByRole("button", { name: "Yes, cancel order" }).click();
  await expect(page.getByTestId("order-status")).toHaveText("Cancelled");
  await page.getByRole("link", { name: "View all orders" }).click();
  await expect(page.getByRole("main")).toContainText("Cancelled");
});

test("account registration, profile, contact messages, logout and login persist", async ({
  page,
}) => {
  const email = `fixture-${randomUUID()}@example.com`;
  const secret = randomUUID();
  await page.goto(`${origin}/demo/register`);
  await page.getByLabel("Full name", { exact: true }).fill("Alex Fixture");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(secret);
  await page.getByLabel("Confirm password", { exact: true }).fill(secret);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(`${origin}/demo/account`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Hello, Alex.",
  );
  await page.getByLabel("Street address").fill("2 Example Street");
  await page.getByLabel("City").fill("Bandung");
  await page.getByLabel("Postal code").fill("40111");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(
    page.getByText("Your details have been saved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Get in touch", exact: true })
    .first()
    .click();
  await page
    .getByLabel("What’s on your mind?")
    .selectOption("Product question");
  await page
    .getByLabel("Your message", { exact: true })
    .fill("A browser fixture question about paper quality.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByTestId("ticket-id")).toHaveText(/^MSG-/);
  await page.goto(`${origin}/demo/account`);
  await expect(
    page.getByText("A browser fixture question about paper quality.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(`${origin}/demo/login`);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(secret);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/demo/account`);
  await expect(page.getByLabel("City")).toHaveValue("Bandung");
  await expect(
    page.getByText("A browser fixture question about paper quality.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("request validation prevents unknown actions and cross-origin mutations", async ({
  request,
}) => {
  expect(
    (
      await request.post(`${origin}/demo/api`, { data: { action: "unknown" } })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post(`${origin}/demo/api`, {
        headers: { Origin: "https://untrusted.example" },
        data: { action: "bootstrap" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post(`${origin}/demo/api`, {
        data: "x".repeat(20000),
        headers: { "Content-Type": "application/json" },
      })
    ).status(),
  ).toBe(413);
});

for (const route of [
  "/demo",
  "/demo/shop",
  "/demo/products/field-notebook",
  "/demo?bug=0",
]) {
  test(`mobile layout and accessibility: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${origin}${route}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (route.includes("bug"))
      await expect(page.getByTestId("order-total")).toHaveText("100000");
    else
      await expect(
        page.getByRole("button", { name: /Add to bag/ }).first(),
      ).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations).toEqual([]);
  });
}

test("story and help navigation work and unknown product URLs return 404", async ({
  page,
}) => {
  await page.goto(`${origin}/demo/about`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Everyday deserves",
  );
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "A little help" })
    .click();
  await page
    .getByText("Do I need an account to place an order?", { exact: true })
    .click();
  await expect(
    page.getByText(/No\. You can checkout as a guest\./),
  ).toBeVisible();
  const response = await page.goto(`${origin}/demo/products/does-not-exist`);
  expect(response?.status()).toBe(404);
});
