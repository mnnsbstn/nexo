import { test, expect } from "@playwright/test";
import {
  clearCalendarConnection,
  confirmCalendarDraftFromChat,
  resetChatAndPendingActions,
  seedCalendarConnection,
  setCalendarIntegration,
} from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await resetChatAndPendingActions(page);
  await clearCalendarConnection(page);
});

test.describe("Kalender Export & ICS (E2E)", () => {
  test(".ics nach Freigabe ohne Google-Verbindung", async ({ page }) => {
    const title = `E2E ICS ${Date.now()}`;
    await setCalendarIntegration(page, true);

    await confirmCalendarDraftFromChat(page, title);

    const list = await page.request.get("/api/integrations/calendar");
    expect(list.ok()).toBeTruthy();
    const body = (await list.json()) as {
      drafts: { title: string; id: string; icsUrl?: string }[];
    };
    const draft = body.drafts.find((d) => d.title === title);
    expect(draft?.icsUrl).toBeTruthy();

    const ics = await page.request.get(draft!.icsUrl!);
    expect(ics.ok()).toBeTruthy();
    const text = await ics.text();
    expect(text).toContain("BEGIN:VCALENDAR");
    expect(text).toContain(title);

    await page.goto("/einstellungen");
    await expect(page.getByRole("link", { name: "Als .ics laden" }).first()).toBeVisible();
    await expect(page.locator("li", { hasText: title }).getByText(/ · Entwurf/)).toBeVisible();
  });

  test("Mock-Export bei verbundener E2E-Fixture", async ({ page }) => {
    const title = `E2E Export ${Date.now()}`;
    await setCalendarIntegration(page, true);
    await seedCalendarConnection(page);

    await confirmCalendarDraftFromChat(page, title);

    await page.goto("/einstellungen");
    await expect(page.getByText(/Verbunden \(Google\).*e2e@nexo\.test/)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator("li", { hasText: title }).getByText(/ · Google/)).toBeVisible({
      timeout: 10_000,
    });

    const list = await page.request.get("/api/integrations/calendar");
    const body = (await list.json()) as {
      connected: boolean;
      drafts: { title: string; status: string; externalEventId?: string | null }[];
    };
    expect(body.connected).toBe(true);
    const draft = body.drafts.find((d) => d.title === title);
    expect(draft?.status).toBe("exported");
    expect(draft?.externalEventId).toMatch(/^e2e-mock-event-/);
  });
});
