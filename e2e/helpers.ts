import type { Page } from "@playwright/test";

/** Leert Chat und lehnt offene Freigaben ab — isoliert Tests in einer E2E-Sitzung. */
export async function resetChatAndPendingActions(page: Page) {
  await page.request.post("/api/chat/clear", { data: { confirm: true } });
}
