import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { connectCalDav } from "@/server/integrations/caldav-connect";

vi.mock("@/server/integrations/caldav", () => ({
  verifyCalDavAccess: vi.fn(async () => "https://cloud.example/dav/cal/personal/"),
}));

describe("connectCalDav", () => {
  beforeEach(async () => {
    await prisma.calendarConnection.deleteMany();
  });

  it("stores caldav connection with serverUrl", async () => {
    await connectCalDav({
      serverUrl: "https://cloud.example/remote.php/dav",
      username: "user@example.com",
      password: "secret",
    });

    const conn = await prisma.calendarConnection.findUnique({ where: { id: "caldav" } });
    expect(conn?.provider).toBe("caldav");
    expect(conn?.serverUrl).toContain("cloud.example");
    expect(conn?.accountEmail).toBe("user@example.com");
  });
});
