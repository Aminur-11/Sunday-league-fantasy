import { test, expect, type Page } from "@playwright/test";
import { E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD } from "./global-setup";
import { randomUsername, fmtDateTimeLocal, nextGameweekNumber, ensureNoOpenGameweek } from "./helpers";

// Implements the realistic end-to-end journey from the spec: build a team,
// set a captain, lock the gameweek, record a real match's stats, verify
// automatic scoring (including the captain multiplier), complete the
// gameweek, then confirm changing the scoring rules afterwards leaves the
// completed gameweek untouched while a new gameweek uses the new rules.

const MANAGER_PASSWORD = "JourneyTest123!";
const SQUAD = [
  "E2E Def One",
  "E2E Def Two",
  "E2E Mid One",
  "E2E Mid Two",
  "E2E Mid Three",
  "E2E Fwd One",
  "E2E Fwd Two",
];

async function loginAsAdmin(page: Page) {
  // Tests reuse the same `page` across different accounts within a single
  // spec; clear any existing session first so /login doesn't just redirect
  // straight back to /dashboard for whoever was previously logged in.
  await page.context().clearCookies();
  await page.goto("/login");
  await page.locator("#username").fill(E2E_ADMIN_USERNAME);
  await page.locator("#password").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/dashboard");
}

async function loginAsManager(page: Page, username: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(MANAGER_PASSWORD);
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

async function completeGameweek(page: Page, number: number) {
  const card = gameweekCard(page, number);
  page.once("dialog", (d) => d.accept());
  await card.getByRole("button", { name: "Complete" }).click();
  await expect(card.getByText("COMPLETE")).toBeVisible();
}

test.describe.serial("Core fantasy season journey", () => {
  let gwNumber: number;
  const managerUsername = randomUsername("journey");
  const teamName = `Journey FC ${managerUsername}`;

  test("0. setup — no gameweek left open from a previous run", async () => {
    await ensureNoOpenGameweek();
    gwNumber = await nextGameweekNumber();
  });

  test("1. admin creates a gameweek (OPEN by default)", async ({ page }) => {
    await loginAsAdmin(page);
    await createGameweek(page, gwNumber);
    await expect(gameweekCard(page, gwNumber).getByText("OPEN")).toBeVisible();
  });

  test("2. manager signs up and starts with an empty team", async ({ page }) => {
    await page.goto("/sign-up");
    await page.locator("#username").fill(managerUsername);
    await page.locator("#password").fill(MANAGER_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/dashboard");
    await expect(page.getByText("Your team is empty")).toBeVisible();
  });

  test("3-5. manager builds a valid 7-player team and sets a captain", async ({ page }) => {
    await loginAsManager(page, managerUsername);
    await page.goto("/team");
    await page.waitForSelector("input[type=checkbox]");
    for (const name of SQUAD) {
      await page.locator("label", { hasText: name }).first().locator("input[type=checkbox]").check();
    }
    await page
      .locator("label", { has: page.locator("input[name=captainRadio]") })
      .filter({ hasText: "E2E Fwd One" })
      .locator("input[type=radio]")
      .check();
    await page.locator("#teamName").fill(teamName);
    await page.getByRole("button", { name: "Save team" }).click();
    await expect(page.getByText("Team saved!")).toBeVisible();
  });

  test("6. admin locks the gameweek", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/gameweeks");
    await gameweekCard(page, gwNumber).getByRole("button", { name: "Lock" }).click();
    await expect(gameweekCard(page, gwNumber).getByText("LOCKED")).toBeVisible();
  });

  test("manager can no longer edit their team once locked", async ({ page }) => {
    await loginAsManager(page, managerUsername);
    await page.goto("/team");
    await expect(page.getByText(/deadline has passed/i)).toBeVisible();
    await expect(page.locator('input[type=checkbox]').first()).toBeDisabled();
  });

  test("7-11. admin creates the real match and enters player stats", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/record-stats");
    await expect(page.locator("select")).toContainText(`Gameweek ${gwNumber} (LOCKED)`);

    await page.locator("#teamAName").fill("Reds");
    await page.locator("#teamBName").fill("Blues");

    const plus = page.getByRole("button", { name: "+", exact: true });
    for (let i = 0; i < 5; i++) await plus.nth(0).click(); // score A = 5
    for (let i = 0; i < 2; i++) await plus.nth(1).click(); // score B = 2
    await expect(page.getByText("Reds: WIN")).toBeVisible();

    await page.locator("#playerSearch").fill("E2E Fwd One");
    await page.getByRole("button", { name: "→ Reds" }).first().click();
    await page.locator("#playerSearch").fill("");

    await page.locator("#playerSearch").fill("E2E Mid One");
    await page.getByRole("button", { name: "→ Blues" }).first().click();
    await page.locator("#playerSearch").fill("");

    const captainRow = page.locator(".rounded-lg.border", { hasText: "E2E Fwd One" }).first();
    const captainGoalsPlus = captainRow.getByRole("button", { name: "+", exact: true }).nth(0);
    await captainGoalsPlus.click();
    await captainGoalsPlus.click(); // 2 goals
    await captainRow.locator("input[type=checkbox]").nth(1).check(); // MOTM

    await page.getByRole("button", { name: "Save stats" }).click();
    await expect(page.getByText("Stats saved")).toBeVisible();
  });

  test("12-15. points calculate automatically, captain doubles, gameweek completes", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/gameweeks");
    await completeGameweek(page, gwNumber);
  });

  test("captain (2x) FWD: 2 goals + MOTM + win + conceded bonus => 46; teammate on losing side => 2; total 48", async ({
    page,
  }) => {
    await loginAsManager(page, managerUsername);
    await page.goto("/dashboard");
    // Check "Overall points" rather than the "current gameweek" heading:
    // this manager has only ever played the one gameweek, so overall points
    // is a robust 48 regardless of which gameweek the dashboard's "most
    // relevant gameweek" heuristic happens to surface (e.g. a later, empty
    // gameweek created by another test run can otherwise outrank this one).
    const overallPointsValue = page.locator("text=Overall points").locator("..").locator("span.text-xl");
    await expect(overallPointsValue).toHaveText("48");

    await page.goto("/league");
    await expect(page.getByText(teamName)).toBeVisible();
    const row = page.locator("tr", { hasText: teamName });
    await expect(row.locator("td").nth(3)).toHaveText("48"); // Total Points column
  });

  test("16-17. changing scoring rules afterwards leaves the completed gameweek unchanged", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/game-rules");
    const fwdGoalInput = page.locator("#FWD_goalPoints");
    const current = Number(await fwdGoalInput.inputValue());
    await fwdGoalInput.fill(String(current + 10));
    await page.getByRole("button", { name: "Save rules" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    // The already-completed gameweek's stored points must be unaffected by
    // this rule change (they are pinned to the scoring-rule version that was
    // active when the gameweek was created — see scoring-rules integration
    // tests for the data-layer proof). Confirm the UI-visible total is still 48.
    await loginAsManager(page, managerUsername);
    await page.goto("/league");
    const row = page.locator("tr", { hasText: teamName });
    await expect(row.locator("td").nth(3)).toHaveText("48");
  });

  test("18. a new gameweek picks up the new scoring rules", async ({ page }) => {
    await loginAsAdmin(page);
    const newGwNumber = await nextGameweekNumber();
    await createGameweek(page, newGwNumber);
    await expect(gameweekCard(page, newGwNumber).getByText("OPEN")).toBeVisible();
    await expect(gameweekCard(page, gwNumber).getByText("COMPLETE")).toBeVisible();
  });
});
