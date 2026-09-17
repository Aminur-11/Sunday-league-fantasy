import { test, expect } from "@playwright/test";
import {
  E2E_ADMIN_USERNAME,
  E2E_ADMIN_PASSWORD,
  E2E_DEACTIVATED_USERNAME,
  E2E_DEACTIVATED_PASSWORD,
} from "./global-setup";
import { randomUsername } from "./helpers";

async function signUp(page: import("@playwright/test").Page, username: string, password: string) {
  await page.goto("/sign-up");
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/dashboard");
}

test.describe("Authentication & session security", () => {
  test("deactivated user cannot log in", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#username").fill(E2E_DEACTIVATED_USERNAME);
    await page.locator("#password").fill(E2E_DEACTIVATED_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.locator("p[role=alert]")).toContainText("deactivated");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("wrong password is rejected", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#username").fill(E2E_ADMIN_USERNAME);
    await page.locator("#password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.locator("p[role=alert]")).toContainText("Invalid username or password");
  });

  test("unauthenticated visitor is redirected to /login from protected pages", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/team");
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("Authorization boundaries", () => {
  test("a MANAGER cannot access the admin area", async ({ page }) => {
    const username = randomUsername("secmgr");
    await signUp(page, username, "SecurityTest123!");

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/admin/players");
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/admin/game-rules");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("a MANAGER's dashboard has no admin navigation link", async ({ page }) => {
    const username = randomUsername("secmgr");
    await signUp(page, username, "SecurityTest123!");
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
  });

  test("ADMIN retains full manager experience plus admin nav", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#username").fill(E2E_ADMIN_USERNAME);
    await page.locator("#password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("**/dashboard");

    await expect(page.getByRole("link", { name: "Admin", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "My Team" })).toBeVisible();

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/);
  });
});

test.describe("Cross-manager data isolation", () => {
  test("a manager can only ever save their own team (no team id is client-supplied)", async ({
    page,
  }) => {
    // The team builder form never includes a fantasyTeamId/managerId field —
    // saveTeamAction always resolves the target team from the server-side
    // session (requireUser().id), so there is no id a malicious client could
    // tamper with to target another manager's team.
    const username = randomUsername("isolmgr");
    await signUp(page, username, "SecurityTest123!");
    await page.goto("/team");

    const hiddenInputNames = await page
      .locator("form input[type=hidden]")
      .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).name));

    expect(hiddenInputNames).not.toContain("managerId");
    expect(hiddenInputNames).not.toContain("fantasyTeamId");
    expect(hiddenInputNames).not.toContain("userId");
  });

  test("league table and other managers' team pages expose no edit controls", async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const username = randomUsername("viewer");
    await signUp(page, username, "SecurityTest123!");

    await page.goto("/league");
    await expect(page.getByRole("button", { name: "Save team" })).toHaveCount(0);

    // If any team already exists (e.g. from another test), its read-only
    // detail page must also carry no save/edit affordances for this viewer.
    const firstTeamLink = page.locator("table a[href^='/league/']").first();
    if (await firstTeamLink.count()) {
      await firstTeamLink.click();
      await expect(page.getByRole("button", { name: "Save team" })).toHaveCount(0);
      await expect(page.locator("input[type=checkbox]")).toHaveCount(0);
    }

    await ctx.close();
  });
});
