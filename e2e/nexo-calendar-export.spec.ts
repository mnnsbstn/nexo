import { test, expect } from "@playwright/test";
import {
  clearCalendarConnection,
  confirmCalendarDraftFromChat,
  resetChatAndPendingActions,
  seedCalendarConnection,
  setCalendarExportProvider,
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
    await expect(
      page.locator("li").filter({ hasText: "Google" }).filter({ hasText: "e2e@nexo.test" }),
    ).toBeVisible({
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

  test("Multi-Kalender: Export-Ziel Microsoft trotz Google-Verbindung", async ({ page }) => {
    const title = `E2E Multi ${Date.now()}`;
    await setCalendarIntegration(page, true);
    await seedCalendarConnection(page, "google");
    await seedCalendarConnection(page, "microsoft");
    await setCalendarExportProvider(page, "microsoft");

    await confirmCalendarDraftFromChat(page, title);

    const list = await page.request.get("/api/integrations/calendar");
    const body = (await list.json()) as {
      exportProvider: string;
      connections: { provider: string }[];
      drafts: { title: string; status: string; exportProvider?: string | null }[];
    };
    expect(body.connections.length).toBeGreaterThanOrEqual(2);
    expect(body.exportProvider).toBe("microsoft");

    const draft = body.drafts.find((d) => d.title === title);
    expect(draft?.status).toBe("exported");
    expect(draft?.exportProvider).toBe("microsoft");

    await page.goto("/einstellungen");
    await expect(page.locator("li", { hasText: title }).getByText(/ · Outlook/)).toBeVisible({
      timeout: 10_000,
    });
  });
});
