import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resolveCalendarExportProvider } from "@/server/integrations/calendar-export-target";

describe("resolveCalendarExportProvider", () => {
  beforeEach(async () => {
    await prisma.calendarConnection.deleteMany();
  });

  it("prefers settings.calendarExportProvider when connected", async () => {
    await prisma.calendarConnection.createMany({
      data: [
        {
          id: "google",
          provider: "google",
          accessToken: "g",
          expiresAt: new Date(Date.now() + 3600_000),
        },
        {
          id: "microsoft",
          provider: "microsoft",
          accessToken: "m",
          expiresAt: new Date(Date.now() + 3600_000),
        },
      ],
    });

    const provider = await resolveCalendarExportProvider({
      uiLanguage: "de",
      responseLanguage: "de",
      timezone: "Europe/Berlin",
      notifyInAppDueTasks: false,
      notifyBrowserDueTasks: false,
      calendarIntegrationEnabled: true,
      calendarExportProvider: "microsoft",
      emailIntegrationEnabled: false,
    });

    expect(provider).toBe("microsoft");
  });
});
