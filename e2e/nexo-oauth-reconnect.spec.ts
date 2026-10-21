import { test, expect } from "@playwright/test";
import { clearCalendarConnection, resetChatAndPendingActions } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetChatAndPendingActions(page);
  await clearCalendarConnection(page);
});

test("OAuth Reconnect: Hinweise in Einstellungen bei stale Tokens", async ({ page }) => {
  const seed = await page.request.post("/api/e2e/calendar/oauth-stale");
  expect(seed.ok()).toBeTruthy();

  const cal = await page.request.get("/api/integrations/calendar");
  expect(cal.ok()).toBeTruthy();
  const calBody = (await cal.json()) as {
    oauthHealth?: { provider: string; status: string }[];
  };
  const google = calBody.oauthHealth?.find((h) => h.provider === "google");
  const microsoft = calBody.oauthHealth?.find((h) => h.provider === "microsoft");
  expect(google?.status).toBe("reconnect_required");
  expect(microsoft?.status).toBe("refresh_failed");

  await page.goto("/einstellungen");
  await expect(page.getByText("staging-google@nexo.test")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("erneut verbinden", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Erneut verbinden" }).first()).toBeVisible();

  await page.request.delete("/api/e2e/calendar/oauth-stale");
});
