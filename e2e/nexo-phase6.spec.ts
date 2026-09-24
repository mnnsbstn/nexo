import { test, expect } from "@playwright/test";
import {
  clearCalendarConnection,
  confirmCalendarDraftFromChat,
  resetChatAndPendingActions,
  seedCalendarConnection,
  setCalendarIntegration,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetChatAndPendingActions(page);
  await clearCalendarConnection(page);
});

test("Sync-Einblicke: API liefert syncInsights nur bei Opt-in", async ({ page }) => {
  await setCalendarIntegration(page, true);
  await seedCalendarConnection(page);

  const off = await page.request.get("/api/integrations/calendar/events?limit=5");
  expect(off.ok()).toBeTruthy();
  const offBody = (await off.json()) as { syncInsights?: unknown };
  expect(offBody.syncInsights).toBeUndefined();

  const patch = await page.request.patch("/api/settings", {
    data: { calendarSyncInsightsEnabled: true },
  });
  expect(patch.ok()).toBeTruthy();

  const on = await page.request.get("/api/integrations/calendar/events?limit=5");
  expect(on.ok()).toBeTruthy();
  const onBody = (await on.json()) as {
    syncInsights?: {
      enabled: boolean;
      daysAhead: number;
      recurringEventCount: number;
      draftOverlaps: unknown[];
    };
  };
  expect(onBody.syncInsights?.enabled).toBe(true);
  expect(onBody.syncInsights?.daysAhead).toBeGreaterThanOrEqual(60);
  expect(onBody.syncInsights?.recurringEventCount).toBeGreaterThanOrEqual(1);
});

test("Sync-Einblicke: Entwurf-Überschneidung mit Mock-Termin", async ({ page }) => {
  await setCalendarIntegration(page, true);
  await seedCalendarConnection(page);
  await page.request.patch("/api/settings", {
    data: { calendarSyncInsightsEnabled: true },
  });

  const title = `E2E Overlap ${Date.now()}`;
  await confirmCalendarDraftFromChat(page, title);

  const res = await page.request.get("/api/integrations/calendar/events?limit=10");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    syncInsights?: { draftOverlaps: { draftTitle: string; reason: string }[] };
  };
  const overlaps = body.syncInsights?.draftOverlaps ?? [];
  expect(overlaps.some((o) => o.draftTitle === title)).toBe(true);
  expect(overlaps.some((o) => o.reason === "time_overlap")).toBe(true);
});

test("CalDAV E2E-Fixture: verbunden und lesbar", async ({ page }) => {
  await setCalendarIntegration(page, true);
  await seedCalendarConnection(page, "caldav");

  const status = await page.request.get("/api/integrations/calendar");
  expect(status.ok()).toBeTruthy();
  const statusBody = (await status.json()) as { caldavConnected?: boolean };
  expect(statusBody.caldavConnected).toBe(true);

  const events = await page.request.get("/api/integrations/calendar/events?limit=5");
  expect(events.ok()).toBeTruthy();
  const eventsBody = (await events.json()) as {
    connected: boolean;
    events: { provider: string; title: string }[];
  };
  expect(eventsBody.connected).toBe(true);
  expect(eventsBody.events.some((e) => e.provider === "caldav")).toBe(true);
});

test("Web Push: VAPID konfiguriert (E2E-Fixture)", async ({ page }) => {
  const res = await page.request.get("/api/push/vapid-public-key");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { configured: boolean; publicKey: string | null };
  expect(body.configured).toBe(true);
  expect(body.publicKey).toBeTruthy();
});

test("Web Push: Abo + check-due bei fälliger Aufgabe (Mock-Versand)", async ({ page }) => {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  await page.request.patch("/api/settings", {
    data: { notifyWebPushDueTasks: true },
  });

  const sub = await page.request.post("/api/push/subscribe", {
    data: {
      endpoint: "https://fcm.googleapis.com/fcm/send/e2e-nexo-push-fixture",
      keys: { p256dh: "e2e-p256dh-key-placeholder-0123456789ab", auth: "e2e-auth-key-012345" },
    },
  });
  expect(sub.ok()).toBeTruthy();

  const task = await page.request.post("/api/tasks", {
    data: { title: `E2E Push ${Date.now()}`, dueDate: today },
  });
  expect(task.ok()).toBeTruthy();

  const check = await page.request.post("/api/push/check-due");
  expect(check.ok()).toBeTruthy();
  const result = (await check.json()) as { sent: boolean; message: string };
  expect(result.sent).toBe(true);
  expect(result.message).toMatch(/Push an/);
});
