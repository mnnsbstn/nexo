import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { exportDraftToExternalCalendar } from "@/server/integrations/calendar-export";

describe("exportDraftToExternalCalendar", () => {
  beforeEach(async () => {
    await prisma.externalCalendarDraft.deleteMany();
    await prisma.calendarConnection.deleteMany();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports via Microsoft Graph when provider is microsoft", async () => {
    await prisma.calendarConnection.create({
      data: {
        id: "microsoft",
        provider: "microsoft",
        accessToken: "token",
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    const draft = await prisma.externalCalendarDraft.create({
      data: {
        title: "Outlook Meet",
        startAt: new Date("2026-09-25T10:00:00.000Z"),
        endAt: new Date("2026-09-25T11:00:00.000Z"),
        timezone: "Europe/Berlin",
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "ms_evt_1" }),
      }),
    );

    const result = await exportDraftToExternalCalendar(draft.id);
    expect(result.exported).toBe(true);
    expect(result.exportProvider).toBe("microsoft");
    expect(result.externalEventId).toBe("ms_evt_1");

    const updated = await prisma.externalCalendarDraft.findUnique({ where: { id: draft.id } });
    expect(updated?.exportProvider).toBe("microsoft");
  });

  it("exports via iCloud CalDAV when provider is icloud (E2E mock)", async () => {
    vi.stubEnv("NEXO_E2E_CALENDAR_MOCK", "1");
    await prisma.calendarConnection.create({
      data: {
        id: "icloud",
        provider: "icloud",
        accessToken: "app-pass",
        accountEmail: "user@icloud.com",
        calendarId: "https://caldav.icloud.com/cal/home/",
      },
    });
    const draft = await prisma.externalCalendarDraft.create({
      data: {
        title: "iCloud Event",
        startAt: new Date("2026-09-25T10:00:00.000Z"),
      },
    });

    const result = await exportDraftToExternalCalendar(draft.id);
    expect(result.exported).toBe(true);
    expect(result.exportProvider).toBe("icloud");
    vi.unstubAllEnvs();
  });
});
