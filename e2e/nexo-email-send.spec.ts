import { test, expect } from "@playwright/test";
import { resetChatAndPendingActions, setEmailIntegration } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await resetChatAndPendingActions(page);
});

test.describe("E-Mail Versand (Mock SMTP)", () => {
  test("Manueller Senden-Button nach Entwurf", async ({ page }) => {
    const subject = `E2E Send ${Date.now()}`;
    await setEmailIntegration(page, true);

    await page.goto("/chat");
    await page
      .getByLabel("Nachricht")
      .fill(`E-Mail an send@example.com Betreff: ${subject} Nachricht: Bitte senden`);
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
          const body = (await res.json()) as {
            sendConfigured: boolean;
            drafts: { subject: string; status: string }[];
          };
          return (
            body.sendConfigured &&
            body.drafts.some((d) => d.subject === subject && d.status === "saved")
          );
        },
        { timeout: 15_000 },
      )
      .toBe(true);

    await page.goto("/einstellungen");
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "E-Mail senden…" }).click();

    await expect
      .poll(
        async () => {
          const res = await page.request.get("/api/integrations/email");
          const body = (await res.json()) as { drafts: { subject: string; status: string }[] };
          return body.drafts.some((d) => d.subject === subject && d.status === "sent");
        },
        { timeout: 15_000 },
      )
      .toBe(true);
  });
});
