import { test, expect } from "@playwright/test";

test.describe("Auth (optional)", () => {
  test.skip(
    !process.env.E2E_AUTH_PASSWORD,
    "Setze E2E_AUTH_PASSWORD + NEXO_AUTH_PASSWORD im webServer für Auth-E2E",
  );

  test("Login schützt Heute", async ({ page }) => {
    await page.goto("/heute");
    await expect(page).toHaveURL(/\/anmelden/);
    await page.getByLabel("Passwort").fill(process.env.E2E_AUTH_PASSWORD!);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/heute$/);
    await expect(page.getByRole("heading", { name: "Heute" })).toBeVisible();
  });
});
