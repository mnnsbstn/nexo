import { test, expect } from "@playwright/test";
import {
  confirmCalendarDraftFromChat,
  resetChatAndPendingActions,
  setCalendarIntegration,
} from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await resetChatAndPendingActions(page);
});

test.describe("Kalender-Entwurf (Demo, Opt-in)", () => {
  test("Ohne Opt-in keine Kalender-Freigabe", async ({ page }) => {
    await setCalendarIntegration(page, false);
    await page.goto("/chat");
    await page.getByLabel("Nachricht").fill("Kalender Termin: Soll nicht erscheinen morgen");
    await page.getByRole("button", { name: "Senden" }).click();
    await expect(page.getByText(/Kalender-Entwürfe sind/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Kalender-Entwurf: Soll nicht")).toHaveCount(0);
  });

  test("Opt-in, Freigabe und Entwurf in Einstellungen", async ({ page }) => {
    const title = `E2E Kalender ${Date.now()}`;
    await setCalendarIntegration(page, true);
    await confirmCalendarDraftFromChat(page, title);

    await page.goto("/einstellungen");
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
  });
});
