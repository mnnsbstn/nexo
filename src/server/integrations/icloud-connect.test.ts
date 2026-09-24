import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { connectICloud } from "@/server/integrations/icloud-connect";

vi.mock("@/server/integrations/icloud-caldav", () => ({
  verifyICloudCalendarAccess: vi.fn(async () => "https://caldav.icloud.com/cal/home/"),
}));

describe("connectICloud", () => {
  beforeEach(async () => {
    await prisma.calendarConnection.deleteMany();
    await prisma.emailConnection.deleteMany();
  });

  it("stores calendar and email connections", async () => {
    await connectICloud({
      appleId: "user@icloud.com",
      appPassword: "abcd-efgh-ijkl-mnop",
    });

    const cal = await prisma.calendarConnection.findUnique({ where: { id: "icloud" } });
    expect(cal?.provider).toBe("icloud");
    expect(cal?.accountEmail).toBe("user@icloud.com");
    expect(cal?.calendarId).toContain("caldav");

    const mail = await prisma.emailConnection.findUnique({ where: { id: "default" } });
    expect(mail?.provider).toBe("icloud");
    expect(mail?.accountEmail).toBe("user@icloud.com");
  });
});
