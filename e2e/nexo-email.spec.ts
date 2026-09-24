import { test, expect } from "@playwright/test";
import { resetChatAndPendingActions, setEmailIntegration } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await resetChatAndPendingActions(page);
});

test.describe("E-Mail-Entwurf (Demo, Opt-in)", () => {
  test("Ohne Opt-in keine E-Mail-Freigabe", async ({ page }) => {
    await setEmailIntegration(page, false);
    await page.goto("/chat");
    await page.getByLabel("Nachricht").fill("E-Mail an test@example.com Betreff: Nein");
    await page.getByRole("button", { name: "Senden" }).click();
    await expect(page.getByText(/E-Mail-Entwürfe sind/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("E-Mail-Entwurf: Nein")).toHaveCount(0);
  });

  test("Opt-in, Freigabe und Entwurf in Einstellungen", async ({ page }) => {
    const subject = `E2E Mail ${Date.now()}`;
    await setEmailIntegration(page, true);

    await page.goto("/chat");
    await page
      .getByLabel("Nachricht")
      .fill(`E-Mail an e2e@example.com Betreff: ${subject} Nachricht: Automatisierter Test`);
    await page.getByRole("button", { name: "Senden" }).click();

    const card = page
      .locator("div")
      .filter({ hasText: `E-Mail-Entwurf: ${subject}` })
      .filter({ has: page.getByRole("button", { name: "Bestätigen" }) })
      .first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole("button", { name: "Bestätigen" }).click();

    await expect
      .poll(
        async () => {
          const res = await page.request.get("/api/integrations/email");
          if (!res.ok()) return false;
          const body = (await res.json()) as { drafts: { subject: string; status: string }[] };
          return body.drafts.some((d) => d.subject === subject && d.status === "saved");
        },
        { timeout: 15_000 },
      )
      .toBe(true);

    await page.goto("/einstellungen");
    await expect(page.getByText(subject)).toBeVisible({ timeout: 10_000 });
  });
});
