import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { exportDraftToGoogle } from "@/server/integrations/google-calendar-export";

describe("exportDraftToGoogle", () => {
  beforeEach(async () => {
    await prisma.externalCalendarDraft.deleteMany();
    await prisma.calendarConnection.deleteMany();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns not connected without calendar connection", async () => {
    const draft = await prisma.externalCalendarDraft.create({
      data: {
        title: "Test",
        startAt: new Date("2026-09-25T10:00:00.000Z"),
      },
    });
    const result = await exportDraftToGoogle(draft.id);
    expect(result.connected).toBe(false);
    expect(result.exported).toBe(false);
  });

  it("exports when connection and API succeed", async () => {
    await prisma.calendarConnection.create({
      data: {
        id: "default",
        accessToken: "token",
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    const draft = await prisma.externalCalendarDraft.create({
      data: {
        title: "Meet",
        startAt: new Date("2026-09-25T10:00:00.000Z"),
        endAt: new Date("2026-09-25T11:00:00.000Z"),
        timezone: "Europe/Berlin",
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "evt_123" }),
      }),
    );

    const result = await exportDraftToGoogle(draft.id);
    expect(result.exported).toBe(true);
    expect(result.externalEventId).toBe("evt_123");

    const updated = await prisma.externalCalendarDraft.findUnique({ where: { id: draft.id } });
    expect(updated?.status).toBe("exported");
  });
});
