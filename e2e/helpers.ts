import { expect, type Page } from "@playwright/test";

/** Leert Chat und lehnt offene Freigaben ab — isoliert Tests in einer E2E-Sitzung. */
export async function resetChatAndPendingActions(page: Page) {
  await page.request.post("/api/chat/clear", { data: { confirm: true } });
}

export async function setEmailIntegration(page: Page, enabled: boolean) {
  const res = await page.request.patch("/api/settings", {
    data: { emailIntegrationEnabled: enabled },
  });
  expect(res.ok()).toBeTruthy();
}

export async function setCalendarIntegration(page: Page, enabled: boolean) {
  const res = await page.request.patch("/api/settings", {
    data: { calendarIntegrationEnabled: enabled },
  });
  expect(res.ok()).toBeTruthy();
}

export async function seedCalendarConnection(
  page: Page,
  provider: "google" | "microsoft" | "caldav" = "google",
) {
  const res = await page.request.post("/api/e2e/calendar/connection", {
    data: { provider },
  });
  expect(res.ok()).toBeTruthy();
}

export async function setCalendarExportProvider(
  page: Page,
  provider: "google" | "microsoft" | "icloud",
) {
  const res = await page.request.patch("/api/settings", {
    data: { calendarExportProvider: provider },
  });
  expect(res.ok()).toBeTruthy();
}

export async function clearCalendarConnection(page: Page) {
  await page.request.delete("/api/e2e/calendar/connection");
}

export async function confirmCalendarDraftFromChat(
  page: Page,
  title: string,
): Promise<void> {
  await page.goto("/chat");
  await page.getByLabel("Nachricht").fill(`Kalender Termin: ${title} morgen um 10 Uhr`);
  await page.getByRole("button", { name: "Senden" }).click();

  const card = page
    .locator("div")
    .filter({ hasText: `Kalender-Entwurf: ${title}` })
    .filter({ has: page.getByRole("button", { name: "Bestätigen" }) })
    .first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.getByRole("button", { name: "Bestätigen" }).click();

  await expect
    .poll(
      async () => {
        const res = await page.request.get("/api/integrations/calendar");
        if (!res.ok()) return false;
        const body = (await res.json()) as { drafts?: { title: string }[] };
        return body.drafts?.some((d) => d.title === title) ?? false;
      },
      { timeout: 15_000 },
    )
    .toBe(true);
}
