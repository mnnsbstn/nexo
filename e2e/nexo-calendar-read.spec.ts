import { test, expect } from "@playwright/test";
import {
  clearCalendarConnection,
  resetChatAndPendingActions,
  seedCalendarConnection,
  setCalendarIntegration,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetChatAndPendingActions(page);
  await clearCalendarConnection(page);
});

test("Externe Termine API mit E2E-Mock", async ({ page }) => {
  await setCalendarIntegration(page, true);
  await seedCalendarConnection(page);

  const res = await page.request.get("/api/integrations/calendar/events?limit=5");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    connected: boolean;
    events: { title: string }[];
  };
  expect(body.connected).toBe(true);
  expect(body.events.length).toBeGreaterThan(0);
});
