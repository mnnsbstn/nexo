import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function setCalendarIntegration(page: import("@playwright/test").Page, enabled: boolean) {
  const res = await page.request.patch("/api/settings", {
    data: { calendarIntegrationEnabled: enabled },
  });
  expect(res.ok()).toBeTruthy();
}

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

    await page.goto("/chat");
    await page.getByLabel("Nachricht").fill(`Kalender Termin: ${title} morgen 10 Uhr`);
    await page.getByRole("button", { name: "Senden" }).click();

    const card = page
      .locator("div")
      .filter({ hasText: `Kalender-Entwurf: ${title}` })
      .filter({ has: page.getByRole("button", { name: "Bestätigen" }) })
      .first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.getByText(/nicht verbunden/i)).toBeVisible();
    await card.getByRole("button", { name: "Bestätigen" }).click();

    await page.goto("/einstellungen");
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
  });
});
