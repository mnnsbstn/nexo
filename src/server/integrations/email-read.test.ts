import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { listExternalInboxMessages } from "@/server/integrations/email-read";

describe("listExternalInboxMessages", () => {
  beforeEach(async () => {
    await prisma.emailConnection.deleteMany();
    await prisma.calendarConnection.deleteMany();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns not connected without sources", async () => {
    const result = await listExternalInboxMessages();
    expect(result.connected).toBe(false);
    expect(result.messages).toHaveLength(0);
  });

  it("includes reconnect hint for stale Microsoft in E2E mock mode", async () => {
    vi.stubEnv("NEXO_E2E_EMAIL_MOCK", "1");
    vi.stubEnv("NEXO_E2E_CALENDAR_MOCK", "1");
    await prisma.calendarConnection.create({
      data: {
        id: "microsoft",
        provider: "microsoft",
        accessToken: "tok",
        refreshToken: "bad",
        expiresAt: new Date(Date.now() - 86_400_000),
        accountEmail: "staging-ms@nexo.test",
      },
    });
    const result = await listExternalInboxMessages({ limit: 3 });
    expect(result.connected).toBe(true);
    expect(result.readError?.toLowerCase()).toContain("erneut verbinden");
  });

  it("returns Microsoft mock inbox when MS calendar connected in E2E mode", async () => {
    vi.stubEnv("NEXO_E2E_EMAIL_MOCK", "1");
    vi.stubEnv("NEXO_E2E_CALENDAR_MOCK", "1");
    await prisma.calendarConnection.create({
      data: {
        id: "microsoft",
        provider: "microsoft",
        accessToken: "tok",
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    const result = await listExternalInboxMessages({ limit: 5 });
    expect(result.connected).toBe(true);
    expect(result.messages.some((m) => m.provider === "microsoft")).toBe(true);
  });
});
