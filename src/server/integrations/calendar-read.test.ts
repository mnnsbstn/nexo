import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { listExternalCalendarEvents } from "@/server/integrations/calendar-read";

describe("listExternalCalendarEvents", () => {
  beforeEach(async () => {
    await prisma.calendarConnection.deleteMany();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns not connected without connection", async () => {
    const result = await listExternalCalendarEvents();
    expect(result.connected).toBe(false);
    expect(result.events).toHaveLength(0);
  });

  it("returns mock events in E2E mode", async () => {
    vi.stubEnv("NEXO_E2E_CALENDAR_MOCK", "1");
    await prisma.calendarConnection.create({
      data: {
        id: "default",
        provider: "google",
        accessToken: "tok",
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    const result = await listExternalCalendarEvents();
    expect(result.connected).toBe(true);
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events[0]?.title).toContain("Mock");
  });

  it("parses Google API response", async () => {
    await prisma.calendarConnection.create({
      data: {
        id: "default",
        accessToken: "tok",
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "g1",
              summary: "Standup",
              start: { dateTime: "2026-09-25T08:00:00Z" },
              end: { dateTime: "2026-09-25T08:30:00Z" },
            },
          ],
        }),
      }),
    );
    const result = await listExternalCalendarEvents({ limit: 5 });
    expect(result.events[0]?.title).toBe("Standup");
    expect(result.provider).toBe("google");
  });
});
