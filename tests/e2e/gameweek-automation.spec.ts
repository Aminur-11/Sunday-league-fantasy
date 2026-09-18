import { test, expect, type Page } from "@playwright/test";
import { E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD } from "./global-setup";
import { fmtDateTimeLocal, nextGameweekNumber, ensureNoOpenGameweek } from "./helpers";

// Locking a gameweek auto-creates the next one by default (so managers get
// the full week to build their team without the admin having to remember to
// click "Create"), but the admin can opt out per-lock and create it manually
// instead — this spec proves both halves of that behaviour.

async function loginAsAdmin(page: Page) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.locator("#username").fill(E2E_ADMIN_USERNAME);
  await page.locator("#password").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/dashboard");
}

async function createGameweek(page: Page, number: number) {
  await page.goto("/admin/gameweeks");
  const now = new Date();
  await page.locator("#number").fill(String(number));
  await page.locator("#startAt").fill(fmtDateTimeLocal(new Date(now.getTime() - 3600_000)));
  await page.locator("#deadline").fill(fmtDateTimeLocal(new Date(now.getTime() + 3600_000)));
  await page.getByRole("button", { name: "Create" }).click();
  await expect(gameweekCard(page, number)).toBeVisible();
}

function gameweekCard(page: Page, number: number) {
  return page.locator(".rounded-xl", { has: page.locator("p", { hasText: `Gameweek ${number} ` }) });
}

test.describe.serial("Gameweek auto-create on lock", () => {
  let gwNumber: number;

  test("setup — no gameweek left open from a previous run", async () => {
    await ensureNoOpenGameweek();
    gwNumber = await nextGameweekNumber();
  });

  test("locking a gameweek auto-creates the next one by default", async ({ page }) => {
    await loginAsAdmin(page);
    await createGameweek(page, gwNumber);

    await gameweekCard(page, gwNumber).getByRole("button", { name: "Lock" }).click();

    await expect(gameweekCard(page, gwNumber).getByText("LOCKED")).toBeVisible();
    await expect(page.getByText(`Next gameweek (#${gwNumber + 1}) was auto-created`)).toBeVisible();
    await expect(gameweekCard(page, gwNumber + 1).getByText("OPEN")).toBeVisible();
  });

  test("unchecking auto-create lets the admin create the next gameweek manually instead", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/gameweeks");

    await gameweekCard(page, gwNumber + 1).locator("input[type=checkbox]").uncheck();
    await gameweekCard(page, gwNumber + 1).getByRole("button", { name: "Lock" }).click();

    await expect(gameweekCard(page, gwNumber + 1).getByText("LOCKED")).toBeVisible();
    await expect(page.locator(".rounded-xl", { hasText: `Gameweek ${gwNumber + 2} ` })).toHaveCount(0);

    // Manual override still works: the admin creates it themselves instead.
    await createGameweek(page, gwNumber + 2);
    await expect(gameweekCard(page, gwNumber + 2).getByText("OPEN")).toBeVisible();
  });
});
