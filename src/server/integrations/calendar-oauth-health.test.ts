import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { getCalendarOAuthHealth } from "@/server/integrations/calendar-oauth-health";

vi.mock("@/server/integrations/google-oauth", () => ({
  refreshGoogleAccessToken: vi.fn(),
}));

vi.mock("@/server/integrations/microsoft-oauth", () => ({
  refreshMicrosoftAccessToken: vi.fn(),
}));

import { refreshGoogleAccessToken } from "@/server/integrations/google-oauth";

describe("getCalendarOAuthHealth", () => {
  beforeEach(async () => {
    await prisma.calendarConnection.deleteMany();
    vi.mocked(refreshGoogleAccessToken).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok for valid non-expired token", async () => {
    await prisma.calendarConnection.create({
      data: {
        id: "google",
        provider: "google",
        accessToken: "enc",
        refreshToken: "ref",
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    const health = await getCalendarOAuthHealth();
    expect(health).toHaveLength(1);
    expect(health[0]?.status).toBe("ok");
  });

  it("returns reconnect_required without refresh token", async () => {
    await prisma.calendarConnection.create({
      data: {
        id: "google",
        provider: "google",
        accessToken: "enc",
        refreshToken: null,
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    const health = await getCalendarOAuthHealth();
    expect(health[0]?.status).toBe("reconnect_required");
  });

  it("returns refresh_failed when refresh throws", async () => {
    await prisma.calendarConnection.create({
      data: {
        id: "google",
        provider: "google",
        accessToken: "enc",
        refreshToken: "ref",
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    vi.mocked(refreshGoogleAccessToken).mockRejectedValue(new Error("invalid_grant"));
    const health = await getCalendarOAuthHealth();
    expect(health[0]?.status).toBe("refresh_failed");
    expect(health[0]?.message).toContain("Google");
  });
});
