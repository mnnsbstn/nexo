import { test, expect } from "@playwright/test";
import {
  clearCalendarConnection,
  resetChatAndPendingActions,
  seedCalendarConnection,
  setEmailIntegration,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetChatAndPendingActions(page);
  await clearCalendarConnection(page);
});

test("Outlook Posteingang API mit Microsoft E2E-Fixture", async ({ page }) => {
  await setEmailIntegration(page, true);
  await seedCalendarConnection(page, "microsoft");

  const status = await page.request.get("/api/integrations/email");
  expect(status.ok()).toBeTruthy();
  const statusBody = (await status.json()) as {
    microsoftInboxAvailable?: boolean;
    externalInboxAvailable?: boolean;
  };
  expect(statusBody.microsoftInboxAvailable).toBe(true);
  expect(statusBody.externalInboxAvailable).toBe(true);

  const res = await page.request.get("/api/integrations/email/messages?limit=5");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    connected: boolean;
    messages: { provider: string; subject: string }[];
  };
  expect(body.connected).toBe(true);
  expect(body.messages.some((m) => m.provider === "microsoft")).toBe(true);
});
