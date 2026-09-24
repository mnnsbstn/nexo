import { test, expect } from "@playwright/test";

test.describe("Nexo Kernabläufe (Demo)", () => {
  test("Navigation und Heute-Ansicht", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/heute$/);
    await expect(page.getByRole("heading", { name: "Heute", exact: true })).toBeVisible();
    const nav = page.getByRole("navigation");
    await nav.getByRole("link", { name: "Chat", exact: true }).click();
    await expect(page).toHaveURL(/\/chat$/);
    await nav.getByRole("link", { name: "Aufgaben", exact: true }).click();
    await expect(page).toHaveURL(/\/aufgaben$/);
  });

  test("Aufgabe anlegen bleibt nach Reload", async ({ page }) => {
    const title = `E2E Persist ${Date.now()}`;
    await page.goto("/aufgaben");
    await page.getByLabel("Titel").fill(title);
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: title })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("listitem").filter({ hasText: title })).toBeVisible();
  });

  test("Chat-Freigabe: Bestätigen legt Aufgabe an", async ({ page }) => {
    const unique = Date.now();
    const taskTitle = `E2E Chat Task ${unique}`;
    await page.goto("/chat");
    await page.getByLabel("Nachricht").fill(`Erstelle eine Aufgabe: ${taskTitle}, heute`);
    await page.getByRole("button", { name: "Senden" }).click();
    const confirm = page.getByRole("button", { name: "Bestätigen" });
    await expect(confirm).toBeVisible({ timeout: 15_000 });
    await confirm.click();
    await expect(confirm).toHaveCount(0, { timeout: 10_000 }).catch(() => {});
    await page.getByRole("link", { name: "Aufgaben", exact: true }).click();
    await expect(page.getByRole("listitem").filter({ hasText: taskTitle })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Chat-Freigabe: Ablehnen legt keine Aufgabe an", async ({ page }) => {
    const unique = Date.now();
    const taskTitle = `E2E Reject ${unique}`;
    await page.goto("/chat");
    await page.getByLabel("Nachricht").fill(`Erstelle eine Aufgabe: ${taskTitle}, heute`);
    await page.getByRole("button", { name: "Senden" }).click();
    await expect(page.getByRole("button", { name: "Ablehnen" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Ablehnen" }).click();
    await page.getByRole("link", { name: "Aufgaben", exact: true }).click();
    await expect(page.getByRole("listitem").filter({ hasText: taskTitle })).toHaveCount(0);
  });

  test("Tagesplan erscheint auf Heute nach Bestätigung", async ({ page }) => {
    await page.goto("/chat");
    await page.getByLabel("Nachricht").fill("Plane meinen Tag anhand meiner offenen Aufgaben.");
    await page.getByRole("button", { name: "Senden" }).click();
    await expect(page.getByRole("button", { name: "Bestätigen" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Bestätigen" }).click();
    await page.getByRole("link", { name: "Heute", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Dein Tagesplan" })).toBeVisible({
      timeout: 10_000,
    });
  });
});
